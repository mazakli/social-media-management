import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PLATFORM_RENK = {
  facebook: { renk: '#1877F2', arka: '#e7f0fd', ikon: '📘' },
  instagram: { renk: '#E1306C', arka: '#fce4ec', ikon: '📸' },
  twitter: { renk: '#1DA1F2', arka: '#e3f2fd', ikon: '🐦' },
  pinterest: { renk: '#E60023', arka: '#fdecea', ikon: '📌' },
  youtube: { renk: '#FF0000', arka: '#ffebee', ikon: '▶️' },
};

const DURUM_RENK = {
  taslak: { arka: '#f1f5f9', yazi: '#64748b', etiket: 'Taslak' },
  zamanlandi: { arka: '#fef3c7', yazi: '#92400e', etiket: 'Zamanlandı' },
  isleniyor: { arka: '#dbeafe', yazi: '#1e40af', etiket: 'İşleniyor' },
  yayinda: { arka: '#d1fae5', yazi: '#065f46', etiket: 'Yayında' },
  kismi: { arka: '#fed7aa', yazi: '#92400e', etiket: 'Kısmi' },
  basarisiz: { arka: '#fee2e2', yazi: '#991b1b', etiket: 'Başarısız' },
};

export default function SosyalMedya() {
  const { kullanici } = useAuth();
  const [hesaplar, setHesaplar] = useState([]);
  const [postlar, setPostlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [markaId, setMarkaId] = useState(kullanici?.marka_id || '');
  const [markalar, setMarkalar] = useState([]);

  useEffect(() => {
    if (kullanici?.rol === 'superadmin') {
      api.get('/markalar').then(r => setMarkalar(r.data)).catch(() => {});
    }
  }, [kullanici]);

  useEffect(() => {
    if (!markaId && kullanici?.rol !== 'superadmin') setMarkaId(kullanici?.marka_id);
    yukle();
  }, [markaId]);

  async function yukle() {
    if (!markaId && kullanici?.rol === 'superadmin') { setYukleniyor(false); return; }
    setYukleniyor(true);
    try {
      const mid = markaId || kullanici?.marka_id;
      const [h, p] = await Promise.all([
        api.get(`/hesaplar?marka_id=${mid}`),
        api.get(`/postlar?marka_id=${mid}&limit=10`),
      ]);
      setHesaplar(h.data);
      setPostlar(p.data.postlar || []);
    } catch (err) {
      toast.error('Yükleme hatası');
    }
    setYukleniyor(false);
  }

  async function postSil(id) {
    if (!confirm('Bu postu silmek istediğinizden emin misiniz?')) return;
    try {
      await api.delete(`/postlar/${id}`);
      setPostlar(postlar.filter(p => p.id !== id));
      toast.success('Post silindi');
    } catch { toast.error('Silinemedi'); }
  }

  async function hemenYayinla(id) {
    try {
      toast.loading('Paylaşılıyor...', { id: `post_${id}` });
      const { data } = await api.post(`/postlar/${id}/yayinla`);
      toast.success(`Paylaşım tamamlandı: ${data.durum}`, { id: `post_${id}` });
      yukle();
    } catch (err) {
      toast.error(err.response?.data?.hata || 'Paylaşım hatası', { id: `post_${id}` });
    }
  }

  const platformSayilari = Object.keys(PLATFORM_RENK).reduce((acc, p) => {
    acc[p] = hesaplar.filter(h => h.platform === p && h.aktif).length;
    return acc;
  }, {});

  if (yukleniyor) return <div style={styles.yukle}>Yükleniyor...</div>;

  return (
    <div>
      <div style={styles.ust}>
        <div>
          <h1 style={styles.baslik}>Sosyal Medya</h1>
          <p style={styles.altBaslik}>Tüm platformları tek yerden yönetin</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {kullanici?.rol === 'superadmin' && (
            <select value={markaId} onChange={e => setMarkaId(e.target.value)} style={styles.select}>
              <option value="">Marka seçin</option>
              {markalar.map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
            </select>
          )}
          <Link to="//hesaplar" style={styles.ikinciBtn}>Hesap Bağla</Link>
          <Link to="//post" style={styles.birincilBtn}>+ Yeni Post</Link>
        </div>
      </div>

      {/* Platform Kartları */}
      <div style={styles.platformlar}>
        {Object.entries(PLATFORM_RENK).map(([platform, info]) => (
          <div key={platform} style={{ ...styles.platformKart, borderTop: `3px solid ${info.renk}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 28 }}>{info.ikon}</span>
              <span style={{
                padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: platformSayilari[platform] ? info.arka : '#f1f5f9',
                color: platformSayilari[platform] ? info.renk : '#94a3b8',
              }}>
                {platformSayilari[platform] ? 'Bağlı' : 'Bağlı Değil'}
              </span>
            </div>
            <div style={styles.platformAd}>{platform.charAt(0).toUpperCase() + platform.slice(1)}</div>
            {hesaplar.filter(h => h.platform === platform).map(h => (
              <div key={h.id} style={styles.hesapSatir}>
                {h.profil_resim && <img src={h.profil_resim} style={styles.profilResim} alt="" />}
                <span style={{ fontSize: 12, color: '#64748b' }}>{h.hesap_adi || h.sayfa_adi || 'Bağlı'}</span>
              </div>
            ))}
            {!platformSayilari[platform] && (
              <Link to="//hesaplar" style={{ ...styles.baglaLink, color: info.renk }}>Bağla →</Link>
            )}
          </div>
        ))}
      </div>

      {/* Son Postlar */}
      <div style={styles.bolum}>
        <div style={styles.bolumUst}>
          <h2 style={styles.h2}>Son Postlar</h2>
          <Link to="//post" style={styles.birincilBtn}>+ Yeni Post</Link>
        </div>

        {postlar.length === 0 ? (
          <div style={styles.bos}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
            <div style={{ fontSize: 16, color: '#64748b', marginBottom: 8 }}>Henüz post yok</div>
            <Link to="//post" style={styles.birincilBtn}>İlk Postunuzu Oluşturun</Link>
          </div>
        ) : (
          <div style={styles.postListesi}>
            {postlar.map(post => {
              const d = DURUM_RENK[post.durum] || DURUM_RENK.taslak;
              return (
                <div key={post.id} style={styles.postSatir}>
                  {post.gorsel_url && (
                    <img src={post.gorsel_url} style={styles.postGorsel} alt="" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.postMetin}>{post.metin?.slice(0, 100)}{post.metin?.length > 100 ? '...' : ''}</div>
                    <div style={styles.postMeta}>
                      <span style={{ ...styles.durumEtiket, background: d.arka, color: d.yazi }}>{d.etiket}</span>
                      {post.platformlar?.map(p => (
                        <span key={p} style={{ fontSize: 16 }}>{PLATFORM_RENK[p]?.ikon}</span>
                      ))}
                      {post.zamanla && (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          {new Date(post.zamanla).toLocaleString('tr-TR')}
                        </span>
                      )}
                    </div>
                    {post.platform_sonuclar && Object.keys(post.platform_sonuclar).length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {Object.entries(post.platform_sonuclar).map(([p, s]) => (
                          <span key={p} style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 10,
                            background: s.basarili ? '#d1fae5' : '#fee2e2',
                            color: s.basarili ? '#065f46' : '#991b1b',
                          }}>
                            {PLATFORM_RENK[p]?.ikon} {s.basarili ? 'OK' : 'Hata'}
                            {s.platform_url && <a href={s.platform_url} target="_blank" rel="noreferrer" style={{ marginLeft: 4, color: 'inherit' }}>↗</a>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={styles.postAksiyonlar}>
                    {(post.durum === 'taslak' || post.durum === 'basarisiz') && (
                      <button onClick={() => hemenYayinla(post.id)} style={styles.yayinlaBtn}>Yayınla</button>
                    )}
                    <Link to={`//post/${post.id}`} style={styles.duzenleBtn}>Düzenle</Link>
                    <button onClick={() => postSil(post.id)} style={styles.silBtn}>Sil</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  ust: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  baslik: { fontSize: 28, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' },
  altBaslik: { color: '#64748b', margin: 0, fontSize: 14 },
  yukle: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94a3b8' },
  select: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 },
  birincilBtn: { padding: '8px 16px', background: '#6366f1', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' },
  ikinciBtn: { padding: '8px 16px', background: '#f1f5f9', color: '#475569', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  platformlar: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 },
  platformKart: { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 8 },
  platformAd: { fontWeight: 600, fontSize: 15, color: '#0f172a' },
  hesapSatir: { display: 'flex', alignItems: 'center', gap: 6 },
  profilResim: { width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' },
  baglaLink: { fontSize: 13, fontWeight: 600, textDecoration: 'none', marginTop: 4 },
  bolum: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  bolumUst: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  h2: { fontSize: 18, fontWeight: 600, color: '#0f172a', margin: 0 },
  bos: { textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  postListesi: { display: 'flex', flexDirection: 'column', gap: 2 },
  postSatir: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderRadius: 8, background: '#f8fafc' },
  postGorsel: { width: 60, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 },
  postMetin: { fontSize: 14, fontWeight: 500, color: '#0f172a', marginBottom: 6 },
  postMeta: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  durumEtiket: { padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  postAksiyonlar: { display: 'flex', gap: 8, flexShrink: 0 },
  yayinlaBtn: { padding: '6px 12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  duzenleBtn: { padding: '6px 12px', background: '#f1f5f9', color: '#475569', borderRadius: 6, textDecoration: 'none', fontSize: 12 },
  silBtn: { padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
};
