const router = require('express').Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { tumPlatformBoyutlari, BOYUTLAR } = require('../services/gorsel-boyutlandir');
const { postGonder } = require('../services/paylas-yoneticisi');
const instagram = require('../services/platform/instagram');

// Post listesi
router.get('/', authMiddleware, async (req, res) => {
  const { marka_id, durum, limit = 20, sayfa = 1 } = req.query;
  const offset = (sayfa - 1) * limit;
  let where = ['p.marka_id = $1'];
  let params = [marka_id || req.kullanici.marka_id];
  let idx = 2;

  if (durum) { where.push(`p.durum = $${idx++}`); params.push(durum); }

  try {
    const { rows } = await pool.query(
      `SELECT p.*, k.ad as olusturan_adi
       FROM sm_postlar p
       LEFT JOIN kullanicilar k ON p.olusturan = k.id
       WHERE ${where.join(' AND ')}
       ORDER BY p.olusturuldu DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );
    const { rows: [say] } = await pool.query(
      `SELECT COUNT(*) FROM sm_postlar WHERE ${where.join(' AND ')}`, params.slice(0, idx - 1)
    );
    res.json({ postlar: rows, toplam: parseInt(say.count) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Post detay
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows: [post] } = await pool.query('SELECT * FROM sm_postlar WHERE id=$1', [req.params.id]);
    if (!post) return res.status(404).json({ hata: 'Post bulunamadı' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Görsel önizleme (platform boyutları)
router.post('/onizleme-boyutlar', authMiddleware, async (req, res) => {
  const { gorsel_url, platformlar, boyut_turu } = req.body;
  if (!gorsel_url || !platformlar?.length) return res.status(400).json({ hata: 'Eksik parametre' });
  const boyutlar = tumPlatformBoyutlari(gorsel_url, platformlar, boyut_turu || 'kare');
  res.json({ boyutlar, tum_boyutlar: BOYUTLAR });
});

// Post oluştur
router.post('/', authMiddleware, async (req, res) => {
  const { marka_id, baslik, metin, gorsel_url, gorsel_cloudinary_id, link_url, hashtag, platformlar, boyut_turu, zamanla } = req.body;
  if (!metin || !platformlar?.length) return res.status(400).json({ hata: 'Metin ve platform zorunludur' });

  try {
    const durum = zamanla ? 'zamanlandi' : 'taslak';
    const { rows: [post] } = await pool.query(
      `INSERT INTO sm_postlar (marka_id, baslik, metin, gorsel_url, gorsel_cloudinary_id, link_url, hashtag, platformlar, boyut_turu, durum, zamanla, olusturan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [marka_id || req.kullanici.marka_id, baslik, metin, gorsel_url, gorsel_cloudinary_id,
       link_url, hashtag, platformlar, boyut_turu || 'kare', durum, zamanla || null, req.kullanici.id]
    );
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Post güncelle
router.put('/:id', authMiddleware, async (req, res) => {
  const { baslik, metin, gorsel_url, link_url, hashtag, platformlar, boyut_turu, zamanla } = req.body;
  try {
    const { rows: [post] } = await pool.query(
      `UPDATE sm_postlar SET baslik=$1, metin=$2, gorsel_url=$3, link_url=$4, hashtag=$5,
       platformlar=$6, boyut_turu=$7, zamanla=$8, guncellendi=NOW()
       WHERE id=$9 RETURNING *`,
      [baslik, metin, gorsel_url, link_url, hashtag, platformlar, boyut_turu, zamanla || null, req.params.id]
    );
    res.json(post);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Post hemen yayınla
router.post('/:id/yayinla', authMiddleware, async (req, res) => {
  try {
    // Durumu yayınlanıyor yap
    await pool.query("UPDATE sm_postlar SET durum='isleniyor' WHERE id=$1", [req.params.id]);
    const sonuc = await postGonder(req.params.id);
    res.json(sonuc);
  } catch (err) {
    await pool.query("UPDATE sm_postlar SET durum='basarisiz', hata_log=$1 WHERE id=$2", [err.message, req.params.id]);
    res.status(500).json({ hata: err.message });
  }
});

// Post sil
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM sm_postlar WHERE id=$1', [req.params.id]);
    res.json({ basarili: true });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// --- Instagram Highlights ---

// Highlight listesi
router.get('/highlights/liste', authMiddleware, async (req, res) => {
  const { marka_id } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT h.*, s.hesap_adi, s.erisim_token, s.hesap_id as ig_user_id
       FROM instagram_highlights h
       JOIN sm_hesaplar s ON h.sm_hesap_id = s.id
       WHERE h.marka_id=$1 ORDER BY h.sira, h.olusturuldu`,
      [marka_id || req.kullanici.marka_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Highlight oluştur
router.post('/highlights', authMiddleware, async (req, res) => {
  const { marka_id, sm_hesap_id, baslik, kapak_gorsel_url, kapak_cloudinary_id, renk, sira } = req.body;
  try {
    // Hesap bilgisi
    const { rows: [hesap] } = await pool.query('SELECT * FROM sm_hesaplar WHERE id=$1', [sm_hesap_id]);
    if (!hesap || hesap.platform !== 'instagram') return res.status(400).json({ hata: 'Geçerli bir Instagram hesabı seçin' });

    // Platform üzerinde highlight oluşturmayı dene
    let platformHighlightId = null;
    try {
      const sonuc = await instagram.highlightOlustur(hesap.hesap_id, hesap.erisim_token, { baslik });
      platformHighlightId = sonuc.id;
    } catch (igErr) {
      // Platform hatası olursa sadece DB'de sakla
      console.warn('Instagram highlight oluşturma hatası (DB\'de saklandı):', igErr.message);
    }

    const { rows: [highlight] } = await pool.query(
      `INSERT INTO instagram_highlights (marka_id, sm_hesap_id, platform_highlight_id, baslik, kapak_gorsel_url, kapak_cloudinary_id, renk, sira)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [marka_id || req.kullanici.marka_id, sm_hesap_id, platformHighlightId, baslik,
       kapak_gorsel_url, kapak_cloudinary_id, renk || '#6366f1', sira || 0]
    );
    res.status(201).json(highlight);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Highlight güncelle
router.put('/highlights/:id', authMiddleware, async (req, res) => {
  const { baslik, kapak_gorsel_url, kapak_cloudinary_id, renk, sira, aktif } = req.body;
  try {
    const { rows: [highlight] } = await pool.query(
      `UPDATE instagram_highlights SET baslik=$1, kapak_gorsel_url=$2, kapak_cloudinary_id=$3,
       renk=$4, sira=$5, aktif=$6 WHERE id=$7 RETURNING *`,
      [baslik, kapak_gorsel_url, kapak_cloudinary_id, renk, sira, aktif !== false, req.params.id]
    );
    res.json(highlight);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Highlight sil
router.delete('/highlights/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM instagram_highlights WHERE id=$1', [req.params.id]);
    res.json({ basarili: true });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
