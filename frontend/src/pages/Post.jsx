import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PLATFORMLAR = [
  { id: 'instagram', etiket: 'Instagram', ikon: '📸', renk: '#E1306C' },
  { id: 'facebook', etiket: 'Facebook', ikon: '📘', renk: '#1877F2' },
  { id: 'twitter', etiket: 'Twitter / X', ikon: '🐦', renk: '#1DA1F2' },
  { id: 'pinterest', etiket: 'Pinterest', ikon: '📌', renk: '#E60023' },
  { id: 'youtube', etiket: 'YouTube', ikon: '▶️', renk: '#FF0000' },
];

const BOYUT_TURLERI = [
  { id: 'kare', etiket: 'Kare (1:1)' },
  { id: 'dikey', etiket: 'Dikey (4:5)' },
  { id: 'yatay', etiket: 'Yatay (16:9)' },
  { id: 'story', etiket: 'Story (9:16)' },
  { id: 'standart', etiket: 'Pinterest Standart (2:3)' },
  { id: 'thumbnail', etiket: 'YT Thumbnail' },
];

export default function SosyalMedyaPost() {
  const { kullanici } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const duzenleModu = !!id;

  const [form, setForm] = useState({
    baslik: '', metin: '', gorsel_url: '', gorsel_cloudinary_id: '',
    link_url: '', hashtag: '', platformlar: ['instagram', 'facebook'],
    boyut_turu: 'kare', zamanla: '',
  });
  const [hesaplar, setHesaplar] = useState([]);
  const [boyutOnizleme, setBoyutOnizleme] = useState({});
  const [medyaAcik, setMedyaAcik] = useState(false);
  const [medyaListesi, setMedyaListesi] = useState([]);
  const [kaydiyor, setKaydiyor] = useState(false);
  const [yayinliyor, setYayinliyor] = useState(false);
  const [aktifOnizleme, setAktifOnizleme] = useState('instagram');

  const markaId = kullanici?.marka_id;

  useEffect(() => {
    api.get(`/hesaplar?marka_id=${markaId}`).then(r => setHesaplar(r.data)).catch(() => {});
    if (duzenleModu) {
      api.get(`/postlar/${id}`).then(r => {
        const p = r.data;
        setForm({
          baslik: p.baslik || '', metin: p.metin || '', gorsel_url: p.gorsel_url || '',
          gorsel_cloudinary_id: p.gorsel_cloudinary_id || '', link_url: p.link_url || '',
          hashtag: p.hashtag || '', platformlar: p.platformlar || [],
          boyut_turu: p.boyut_turu || 'kare',
          zamanla: p.zamanla ? new Date(p.zamanla).toISOString().slice(0, 16) : '',
        });
      }).catch(() => toast.error('Post yüklenemedi'));
    }
  }, [id]);

  const boyutGuncelle = useCallback(async (gorselUrl, platformlar, boyutTuru) => {
    if (!gorselUrl || !platformlar.length) return;
    try {
      const { data } = await api.post('/postlar/onizleme-boyutlar', { gorsel_url: gorselUrl, platformlar, boyut_turu: boyutTuru });
      setBoyutOnizleme(data.boyutlar || {});
    } catch {}
  }, []);

  useEffect(() => {
    boyutGuncelle(form.gorsel_url, form.platformlar, form.boyut_turu);
  }, [form.gorsel_url, form.platformlar, form.boyut_turu]);

  function platformToggle(pid) {
    setForm(f => ({
      ...f,
      platformlar: f.platformlar.includes(pid)
        ? f.platformlar.filter(p => p !== pid)
        : [...f.platformlar, pid],
    }));
  }

  async function gorselSec(gorsel) {
    setForm(f => ({ ...f, gorsel_url: gorsel.url, gorsel_cloudinary_id: gorsel.cloudinary_id || '' }));
    setMedyaAcik(false);
  }

  async function medyaYukle(e) {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    const fd = new FormData();
    fd.append('dosya', dosya);
    fd.append('marka_id', markaId);
    try {
      const { data } = await api.post('/medya/yukle', fd);
      gorselSec(data);
      toast.success('Görsel yüklendi');
    } catch { toast.error('Yükleme hatası'); }
  }

  async function medyaListeYukle() {
    try {
      const { data } = await api.get(`/medya?marka_id=${markaId}&tur=gorsel&limit=50`);
      setMedyaListesi(data.medyalar || data || []);
    } catch {}
    setMedyaAcik(true);
  }

  async function kaydet(yayinla = false) {
    if (!form.metin.trim()) return toast.error('Metin zorunludur');
    if (!form.platformlar.length) return toast.error('En az bir platform seçin');

    yayinla ? setYayinliyor(true) : setKaydiyor(true);
    try {
      let post;
      const payload = { ...form, marka_id: markaId };
      if (!yayinla && !form.zamanla) payload.zamanla = null;

      if (duzenleModu) {
        const { data } = await api.put(`/postlar/${id}`, payload);
        post = data;
      } else {
        const { data } = await api.post('/postlar', payload);
        post = data;
      }

      if (yayinla) {
        const { data: sonuc } = await api.post(`/postlar/${post.id}/yayinla`);
        const basariliSayi = Object.values(sonuc.sonuclar).filter(s => s.basarili).length;
        toast.success(`${basariliSayi}/${form.platformlar.length} platformda paylaşıldı`);
        navigate('/');
      } else {
        toast.success(duzenleModu ? 'Post güncellendi' : 'Post kaydedildi');
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.hata || 'Hata oluştu');
    }
    setKaydiyor(false);
    setYayinliyor(false);
  }

  const bagliPlatformlar = PLATFORMLAR.filter(p => hesaplar.some(h => h.platform === p.id && h.aktif));
  const aktifBoyut = boyutOnizleme[aktifOnizleme];
  const karakterSayisi = (form.metin + '\n' + form.hashtag).length;

  return (
    <div>
      <div style={styles.ust}>
        <div>
          <h1 style={styles.baslik}>{duzenleModu ? 'Post Düzenle' : 'Yeni Post'}</h1>
          <p style={styles.altBaslik}>Birden fazla platformda paylaşım yapın</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/')} style={styles.iptalBtn}>İptal</button>
          <button onClick={() => kaydet(false)} disabled={kaydiyor} style={styles.kaydetBtn}>
            {kaydiyor ? 'Kaydediliyor...' : form.zamanla ? 'Zamanla' : 'Taslak Kaydet'}
          </button>
          <button onClick={() => kaydet(true)} disabled={yayinliyor} style={styles.yayinlaBtn}>
            {yayinliyor ? 'Paylaşılıyor...' : '▶ Şimdi Paylaş'}
          </button>
        </div>
      </div>

      <div style={styles.icerik}>
        {/* Sol — Form */}
        <div style={styles.sol}>
          {/* Platform Seçimi */}
          <div style={styles.kart}>
            <div style={styles.kartBaslik}>Platformlar</div>
            <div style={styles.platformGrid}>
              {PLATFORMLAR.map(p => {
                const bagli = hesaplar.some(h => h.platform === p.id && h.aktif);
                const secili = form.platformlar.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => bagli && platformToggle(p.id)}
                    style={{
                      ...styles.platformBtn,
                      borderColor: secili ? p.renk : '#e2e8f0',
                      background: secili ? `${p.renk}15` : '#f8fafc',
                      opacity: bagli ? 1 : 0.4,
                      cursor: bagli ? 'pointer' : 'not-allowed',
                    }}
                    title={!bagli ? 'Bu platform bağlı değil' : ''}
                  >
                    <span style={{ fontSize: 20 }}>{p.ikon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: secili ? p.renk : '#64748b' }}>{p.etiket}</span>
                    {!bagli && <span style={styles.bagliDegil}>Bağlı değil</span>}
                    {secili && <span style={{ ...styles.seciliBadge, background: p.renk }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Görsel */}
          <div style={styles.kart}>
            <div style={styles.kartBaslik}>Görsel</div>
            {form.gorsel_url ? (
              <div style={styles.gorselOnizleme}>
                <img src={form.gorsel_url} style={styles.gorselImg} alt="" />
                <div style={styles.gorselAksiyonlar}>
                  <button onClick={medyaListeYukle} style={styles.degistirBtn}>Değiştir</button>
                  <button onClick={() => setForm(f => ({ ...f, gorsel_url: '', gorsel_cloudinary_id: '' }))} style={styles.kaldir}>Kaldır</button>
                </div>
              </div>
            ) : (
              <div style={styles.gorselYukle}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
                <div style={{ color: '#64748b', marginBottom: 12 }}>Görsel ekleyin</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={styles.yukleBtn}>
                    Bilgisayardan Yükle
                    <input type="file" accept="image/*" onChange={medyaYukle} style={{ display: 'none' }} />
                  </label>
                  <button onClick={medyaListeYukle} style={styles.kutuphanBtn}>Medya Kütüphanesi</button>
                </div>
              </div>
            )}

            {/* Boyut Türü */}
            <div style={{ marginTop: 16 }}>
              <label style={styles.label}>Görsel Boyut Türü</label>
              <select value={form.boyut_turu} onChange={e => setForm(f => ({ ...f, boyut_turu: e.target.value }))} style={styles.input}>
                {BOYUT_TURLERI.map(b => <option key={b.id} value={b.id}>{b.etiket}</option>)}
              </select>
              <div style={styles.ipucu}>Her platform için otomatik boyutlandırılır</div>
            </div>
          </div>

          {/* Metin */}
          <div style={styles.kart}>
            <div style={styles.kartBaslik}>İçerik</div>
            <label style={styles.label}>Başlık (opsiyonel)</label>
            <input
              value={form.baslik}
              onChange={e => setForm(f => ({ ...f, baslik: e.target.value }))}
              placeholder="Post başlığı..."
              style={styles.input}
            />
            <label style={{ ...styles.label, marginTop: 12 }}>Metin *</label>
            <textarea
              value={form.metin}
              onChange={e => setForm(f => ({ ...f, metin: e.target.value }))}
              placeholder="Post metninizi yazın..."
              rows={5}
              style={{ ...styles.input, resize: 'vertical' }}
            />
            <label style={{ ...styles.label, marginTop: 12 }}>Hashtag'ler</label>
            <input
              value={form.hashtag}
              onChange={e => setForm(f => ({ ...f, hashtag: e.target.value }))}
              placeholder="#örnek #hashtag #etiket"
              style={styles.input}
            />
            <label style={{ ...styles.label, marginTop: 12 }}>Link (opsiyonel)</label>
            <input
              value={form.link_url}
              onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
              placeholder="https://..."
              style={styles.input}
            />
            <div style={styles.karakterSay}>
              <span style={{ color: karakterSayisi > 260 ? '#ef4444' : '#94a3b8' }}>{karakterSayisi}/280</span>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>(Twitter limiti)</span>
            </div>
          </div>

          {/* Zamanlama */}
          <div style={styles.kart}>
            <div style={styles.kartBaslik}>Zamanlama</div>
            <label style={styles.label}>Yayın Zamanı (opsiyonel)</label>
            <input
              type="datetime-local"
              value={form.zamanla}
              onChange={e => setForm(f => ({ ...f, zamanla: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              style={styles.input}
            />
            <div style={styles.ipucu}>Boş bırakırsanız hemen yayınlanır veya taslak olarak kaydedilir</div>
          </div>
        </div>

        {/* Sağ — Önizleme */}
        <div style={styles.sag}>
          <div style={styles.kart}>
            <div style={styles.kartBaslik}>Platform Önizleme</div>
            <div style={styles.onizlemeTablar}>
              {form.platformlar.map(pid => {
                const p = PLATFORMLAR.find(x => x.id === pid);
                return p ? (
                  <button
                    key={pid}
                    onClick={() => setAktifOnizleme(pid)}
                    style={{
                      ...styles.onizlemeTab,
                      borderBottom: aktifOnizleme === pid ? `2px solid ${p.renk}` : '2px solid transparent',
                      color: aktifOnizleme === pid ? p.renk : '#64748b',
                    }}
                  >
                    {p.ikon}
                  </button>
                ) : null;
              })}
            </div>

            {/* Platform önizleme kutusu */}
            <div style={styles.onizlemeKutu}>
              {form.gorsel_url && aktifBoyut ? (
                <div>
                  <img
                    src={aktifBoyut.url}
                    style={{
                      width: '100%',
                      aspectRatio: `${aktifBoyut.genislik}/${aktifBoyut.yukseklik}`,
                      objectFit: 'cover',
                      borderRadius: 8,
                    }}
                    alt="Önizleme"
                  />
                  <div style={styles.boyutBilgi}>
                    {aktifBoyut.etiket} — {aktifBoyut.genislik}×{aktifBoyut.yukseklik}px
                  </div>
                </div>
              ) : form.gorsel_url ? (
                <img src={form.gorsel_url} style={{ width: '100%', borderRadius: 8 }} alt="" />
              ) : (
                <div style={styles.gorselYok}>Görsel seçilmedi</div>
              )}

              {form.metin && (
                <div style={styles.onizlemeMetin}>
                  <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.5 }}>{form.metin}</div>
                  {form.hashtag && <div style={{ fontSize: 12, color: '#6366f1', marginTop: 4 }}>{form.hashtag}</div>}
                </div>
              )}
            </div>

            {/* Tüm boyutlar tablosu */}
            {form.gorsel_url && Object.keys(boyutOnizleme).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>TÜM BOYUTLAR</div>
                {Object.entries(boyutOnizleme).map(([p, b]) => {
                  const pInfo = PLATFORMLAR.find(x => x.id === p);
                  return (
                    <div key={p} style={styles.boyutSatir}>
                      <span>{pInfo?.ikon} {pInfo?.etiket}</span>
                      <span style={{ color: '#64748b', fontSize: 12 }}>{b.genislik}×{b.yukseklik}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Medya Kütüphanesi Modal */}
      {medyaAcik && (
        <div style={styles.modalArka} onClick={() => setMedyaAcik(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalUst}>
              <h3 style={{ margin: 0 }}>Medya Kütüphanesi</h3>
              <button onClick={() => setMedyaAcik(false)} style={styles.kapat}>✕</button>
            </div>
            <div style={styles.medyaGrid}>
              {medyaListesi.map(m => (
                <img
                  key={m.id}
                  src={m.url}
                  style={styles.medyaKucuk}
                  onClick={() => gorselSec(m)}
                  alt={m.dosya_adi}
                  title={m.dosya_adi}
                />
              ))}
              {medyaListesi.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#94a3b8' }}>Medya yok</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  ust: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  baslik: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' },
  altBaslik: { color: '#64748b', margin: 0, fontSize: 14 },
  icerik: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' },
  sol: { display: 'flex', flexDirection: 'column', gap: 16 },
  sag: { position: 'sticky', top: 20 },
  kart: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  kartBaslik: { fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' },
  ipucu: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  karakterSay: { display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6, alignItems: 'center' },
  platformGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  platformBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 12, borderRadius: 10, border: '2px solid', cursor: 'pointer', background: 'none', position: 'relative', transition: 'all 0.2s' },
  bagliDegil: { fontSize: 9, color: '#94a3b8', position: 'absolute', bottom: 4 },
  seciliBadge: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  gorselOnizleme: { position: 'relative' },
  gorselImg: { width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 },
  gorselAksiyonlar: { display: 'flex', gap: 8, marginTop: 8 },
  gorselYukle: { border: '2px dashed #e2e8f0', borderRadius: 12, padding: 32, textAlign: 'center' },
  yukleBtn: { padding: '8px 16px', background: '#6366f1', color: '#fff', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  kutuphanBtn: { padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  degistirBtn: { padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  kaldir: { padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  onizlemeTablar: { display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 },
  onizlemeTab: { padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, transition: 'all 0.2s' },
  onizlemeKutu: { minHeight: 120 },
  boyutBilgi: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 6 },
  onizlemeMetin: { marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8 },
  gorselYok: { background: '#f1f5f9', borderRadius: 8, padding: 40, textAlign: 'center', color: '#94a3b8' },
  boyutSatir: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 },
  iptalBtn: { padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  kaydetBtn: { padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  yayinlaBtn: { padding: '8px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  modalArka: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 16, width: '80vw', maxWidth: 900, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalUst: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' },
  kapat: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' },
  medyaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, padding: 16, overflow: 'auto' },
  medyaKucuk: { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' } },
};
