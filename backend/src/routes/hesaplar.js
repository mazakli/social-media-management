const router = require('express').Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const facebook = require('../services/platform/facebook');
const instagram = require('../services/platform/instagram');
const twitter = require('../services/platform/twitter');
const pinterest = require('../services/platform/pinterest');
const youtube = require('../services/platform/youtube');

const REDIRECT_BASE = process.env.APP_URL || 'http://localhost:4000';

// OAuth durumlarını geçici bellekte tut (production'da Redis kullanın)
const oauthDurumlari = new Map();

// Tüm hesapları listele
router.get('/', authMiddleware, async (req, res) => {
  const { marka_id } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT id, marka_id, platform, hesap_adi, hesap_id, sayfa_id, sayfa_adi,
              profil_resim, aktif, token_bitis, ekstra, olusturuldu
       FROM sm_hesaplar WHERE marka_id=$1 ORDER BY platform`,
      [marka_id || req.kullanici.marka_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// OAuth URL üret
router.get('/oauth-url/:platform', authMiddleware, async (req, res) => {
  const { platform } = req.params;
  const { marka_id } = req.query;
  const state = `${marka_id}_${req.kullanici.id}_${Date.now()}`;

  try {
    let url;
    const redirectUri = `${REDIRECT_BASE}/api/hesaplar/callback/${platform}`;

    if (platform === 'facebook' || platform === 'instagram') {
      oauthDurumlari.set(state, { marka_id, kullanici_id: req.kullanici.id });
      url = facebook.oauthUrl(redirectUri, state);
    } else if (platform === 'twitter') {
      const codeVerifier = twitter.codeVerifierUret();
      // State içine codeVerifier ve marka_id encode et (in-memory Map'e bağımlılığı ortadan kaldır)
      const twitterState = Buffer.from(JSON.stringify({ codeVerifier, marka_id, kullanici_id: req.kullanici.id })).toString('base64url');
      url = twitter.oauthUrl(redirectUri, twitterState, codeVerifier);
    } else if (platform === 'pinterest') {
      oauthDurumlari.set(state, { marka_id, kullanici_id: req.kullanici.id });
      url = pinterest.oauthUrl(redirectUri, state);
    } else if (platform === 'youtube') {
      oauthDurumlari.set(state, { marka_id, kullanici_id: req.kullanici.id });
      url = youtube.oauthUrl(redirectUri, state);
    } else {
      return res.status(400).json({ hata: 'Geçersiz platform' });
    }

    res.json({ url, state });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// OAuth Callback — Facebook/Instagram
router.get('/callback/facebook', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.send(`<script>window.opener?.postMessage({hata:'${error}'},'*');window.close();</script>`);

  const durum = oauthDurumlari.get(state);
  if (!durum) return res.send('<script>window.opener?.postMessage({hata:"Geçersiz state"},"*");window.close();</script>');
  oauthDurumlari.delete(state);

  try {
    const redirectUri = `${REDIRECT_BASE}/api/hesaplar/callback/facebook`;
    const tokenData = await facebook.tokenAl(code, redirectUri);
    const kullaniciBilgi = await facebook.kullaniciBilgi(tokenData.access_token);
    const sayfalar = await facebook.sayfalariGetir(tokenData.access_token);

    // İlk sayfayı varsayılan olarak kaydet (birden fazla sayfa varsa frontend'de seçilir)
    const sayfa = sayfalar[0];
    const tokenBitis = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    await pool.query(
      `INSERT INTO sm_hesaplar (marka_id, platform, hesap_adi, hesap_id, erisim_token, token_bitis, sayfa_id, sayfa_adi, profil_resim, ekstra)
       VALUES ($1,'facebook',$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [durum.marka_id, kullaniciBilgi.name, kullaniciBilgi.id, tokenData.access_token, tokenBitis,
       sayfa?.id, sayfa?.name, kullaniciBilgi.picture?.data?.url || null,
       JSON.stringify({ sayfalar, kullanici_token: tokenData.access_token })]
    );

    // Instagram hesabını da bul ve kaydet
    if (sayfa) {
      try {
        const igId = await instagram.igHesabiBul(sayfa.id, sayfa.access_token);
        const igBilgi = await instagram.igBilgi(igId, sayfa.access_token);
        await pool.query(
          `INSERT INTO sm_hesaplar (marka_id, platform, hesap_adi, hesap_id, erisim_token, token_bitis, sayfa_id, sayfa_adi, profil_resim)
           VALUES ($1,'instagram',$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT DO NOTHING`,
          [durum.marka_id, igBilgi.username || igBilgi.name, igId, sayfa.access_token, tokenBitis,
           sayfa.id, sayfa.name, igBilgi.profile_picture_url || null]
        );
      } catch (igErr) {
        console.log('Instagram hesabı bulunamadı:', igErr.message);
      }
    }

    res.send('<script>window.opener?.postMessage({basarili:true,platform:"facebook"},"*");window.close();</script>');
  } catch (err) {
    res.send(`<script>window.opener?.postMessage({hata:"${err.message.replace(/"/g, '')}"},"*");window.close();</script>`);
  }
});

// OAuth Callback — Instagram (Facebook üzerinden)
router.get('/callback/instagram', (req, res) => {
  res.redirect('/api/hesaplar/callback/facebook?' + new URLSearchParams(req.query));
});

// OAuth Callback — Twitter
router.get('/callback/twitter', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`${REDIRECT_BASE}/hesaplar?twitter_hata=${encodeURIComponent(error)}`);

  // State'i decode et (base64url → JSON)
  let durum;
  try {
    durum = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch (e) {
    return res.redirect(`${REDIRECT_BASE}/hesaplar?twitter_hata=Geçersiz+state`);
  }

  try {
    const redirectUri = `${REDIRECT_BASE}/api/hesaplar/callback/twitter`;
    const tokenData = await twitter.tokenAl(code, redirectUri, durum.codeVerifier);
    console.log('Twitter token yanıtı:', JSON.stringify(tokenData));
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
    if (!tokenData.access_token) throw new Error('Token alınamadı: ' + JSON.stringify(tokenData));

    const tokenBitis = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

    // Kullanıcı bilgisini almayı dene, başarısız olursa token'ı yine kaydet
    let hesapAdi = 'Twitter Hesabı';
    let hesapId = 'twitter_' + Date.now();
    let profilResim = null;
    try {
      const kullaniciData = await twitter.kullaniciBilgi(tokenData.access_token);
      console.log('Twitter kullanıcı:', JSON.stringify(kullaniciData));
      hesapAdi = `@${kullaniciData.username}`;
      hesapId = kullaniciData.id;
      profilResim = kullaniciData.profile_image_url || null;
    } catch (e) {
      console.log('Kullanıcı bilgisi alınamadı, devam ediliyor:', e.message);
    }

    await pool.query(
      `INSERT INTO sm_hesaplar (marka_id, platform, hesap_adi, hesap_id, erisim_token, yenileme_token, token_bitis, profil_resim)
       VALUES ($1,'twitter',$2,$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [durum.marka_id, hesapAdi, hesapId, tokenData.access_token, tokenData.refresh_token, tokenBitis, profilResim]
    );

    res.send('<script>if(window.opener){window.opener.postMessage({basarili:true,platform:"twitter"},"*");window.close();}else{window.location.href="/hesaplar?twitter=basarili";}</script>');
  } catch (err) {
    console.error('Twitter callback hatası:', err.message);
    res.send(`<script>if(window.opener){window.opener.postMessage({hata:"${err.message.replace(/"/g,'').replace(/\n/g,'')}"},"*");window.close();}else{window.location.href="/hesaplar?twitter_hata=${encodeURIComponent(err.message)}"}</script>`);
  }
});

// OAuth Callback — Pinterest
router.get('/callback/pinterest', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.send(`<script>window.opener?.postMessage({hata:'${error}'},'*');window.close();</script>`);

  const durum = oauthDurumlari.get(state);
  if (!durum) return res.send('<script>window.opener?.postMessage({hata:"Geçersiz state"},"*");window.close();</script>');
  oauthDurumlari.delete(state);

  try {
    const redirectUri = `${REDIRECT_BASE}/api/hesaplar/callback/pinterest`;
    const tokenData = await pinterest.tokenAl(code, redirectUri);
    if (tokenData.error) throw new Error(tokenData.message || tokenData.error);

    const kullanici = await pinterest.kullaniciBilgi(tokenData.access_token);
    const tokenBitis = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

    await pool.query(
      `INSERT INTO sm_hesaplar (marka_id, platform, hesap_adi, hesap_id, erisim_token, yenileme_token, token_bitis, profil_resim)
       VALUES ($1,'pinterest',$2,$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [durum.marka_id, kullanici.username || kullanici.business_name, kullanici.account_id || kullanici.username,
       tokenData.access_token, tokenData.refresh_token, tokenBitis, kullanici.profile_image || null]
    );

    res.send('<script>window.opener?.postMessage({basarili:true,platform:"pinterest"},"*");window.close();</script>');
  } catch (err) {
    res.send(`<script>window.opener?.postMessage({hata:"${err.message.replace(/"/g, '')}"},"*");window.close();</script>`);
  }
});

// OAuth Callback — YouTube
router.get('/callback/youtube', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.send(`<script>window.opener?.postMessage({hata:'${error}'},'*');window.close();</script>`);

  const durum = oauthDurumlari.get(state);
  if (!durum) return res.send('<script>window.opener?.postMessage({hata:"Geçersiz state"},"*");window.close();</script>');
  oauthDurumlari.delete(state);

  try {
    const redirectUri = `${REDIRECT_BASE}/api/hesaplar/callback/youtube`;
    const tokenData = await youtube.tokenAl(code, redirectUri);
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const kanal = await youtube.kanalBilgi(tokenData.access_token);
    const tokenBitis = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

    await pool.query(
      `INSERT INTO sm_hesaplar (marka_id, platform, hesap_adi, hesap_id, erisim_token, yenileme_token, token_bitis, profil_resim)
       VALUES ($1,'youtube',$2,$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [durum.marka_id, kanal.adi, kanal.id, tokenData.access_token, tokenData.refresh_token, tokenBitis, kanal.profil_resim || null]
    );

    res.send('<script>window.opener?.postMessage({basarili:true,platform:"youtube"},"*");window.close();</script>');
  } catch (err) {
    res.send(`<script>window.opener?.postMessage({hata:"${err.message.replace(/"/g, '')}"},"*");window.close();</script>`);
  }
});

// Facebook sayfalarını listele (bağlandıktan sonra sayfa seçimi için)
router.get('/:id/facebook-sayfalar', authMiddleware, async (req, res) => {
  const { rows: [hesap] } = await pool.query('SELECT * FROM sm_hesaplar WHERE id=$1', [req.params.id]);
  if (!hesap) return res.status(404).json({ hata: 'Hesap bulunamadı' });
  try {
    const sayfalar = (hesap.ekstra?.sayfalar || []).map(s => ({ id: s.id, ad: s.name }));
    res.json(sayfalar);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Pinterest board listesi
router.get('/:id/pinterest-boardlar', authMiddleware, async (req, res) => {
  const { rows: [hesap] } = await pool.query('SELECT * FROM sm_hesaplar WHERE id=$1', [req.params.id]);
  if (!hesap || hesap.platform !== 'pinterest') return res.status(404).json({ hata: 'Hesap bulunamadı' });
  try {
    const boardlar = await pinterest.boardlariGetir(hesap.erisim_token);
    res.json(boardlar);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Hesap güncelle (sayfa seçimi, varsayılan board vb.)
router.put('/:id', authMiddleware, async (req, res) => {
  const { sayfa_id, sayfa_adi, ekstra } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE sm_hesaplar SET sayfa_id=$1, sayfa_adi=$2, ekstra=$3, guncellendi=NOW() WHERE id=$4 RETURNING *',
      [sayfa_id, sayfa_adi, JSON.stringify(ekstra || {}), req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Hesap sil / bağlantıyı kes
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM sm_hesaplar WHERE id=$1', [req.params.id]);
    res.json({ basarili: true });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
