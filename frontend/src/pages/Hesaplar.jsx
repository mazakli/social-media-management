import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PLATFORMLAR = [
  {
    id: 'facebook',
    etiket: 'Facebook',
    ikon: '📘',
    renk: '#1877F2',
    aciklama: 'Facebook Sayfanızı bağlayın. Sayfa yönetici yetkisi gerektirir.',
    gereksinimler: ['META_APP_ID', 'META_APP_SECRET'],
    instagram_dahil: true,
  },
  {
    id: 'instagram',
    etiket: 'Instagram Business',
    ikon: '📸',
    renk: '#E1306C',
    aciklama: 'Facebook bağlandığında otomatik eklenir. Business/Creator hesabı + Facebook Sayfasına bağlı olmalı.',
    otomatik: true,
  },
  {
    id: 'twitter',
    etiket: 'Twitter / X',
    ikon: '🐦',
    renk: '#1DA1F2',
    aciklama: 'Twitter Developer hesabı ve uygulaması gerektirir. OAuth 2.0 PKCE.',
    gereksinimler: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'],
  },
  {
    id: 'pinterest',
    etiket: 'Pinterest',
    ikon: '📌',
    renk: '#E60023',
    aciklama: 'Pinterest iş hesabı ve Developer uygulaması gerektirir.',
    gereksinimler: ['PINTEREST_APP_ID', 'PINTEREST_APP_SECRET'],
  },
  {
    id: 'youtube',
    etiket: 'YouTube',
    ikon: '▶️',
    renk: '#FF0000',
    aciklama: 'Google Cloud projesi ve YouTube Data API v3 gerektirir.',
    gereksinimler: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  },
];

const KURULUM_KILAVUZU = {
  facebook: {
    baslik: 'Meta (Facebook/Instagram) Kurulumu',
    adimlar: [
      'developers.facebook.com adresine gidin, yeni bir uygulama oluşturun (Business türü)',
      'App ID ve App Secret\'ı .env dosyasına META_APP_ID ve META_APP_SECRET olarak ekleyin',
      'Facebook Login ürününü ekleyin',
      'Redirect URI olarak ekleyin: {APP_URL}/api/hesaplar/callback/facebook',
      'İzinler: pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish',
      'Instagram Business hesabınızı Facebook Sayfanıza Meta Business Manager\'dan bağlayın',
    ],
  },
  twitter: {
    baslik: 'Twitter / X Developer Kurulumu',
    adimlar: [
      'developer.twitter.com adresine gidin, yeni bir proje ve uygulama oluşturun',
      'Client ID ve Client Secret\'ı .env dosyasına ekleyin',
      'OAuth 2.0 aktif edin, User authentication settings\'e gidin',
      'Redirect URI ekleyin: {APP_URL}/api/hesaplar/callback/twitter',
      'Scopes: tweet.read, tweet.write, users.read, offline.access',
      'Not: Ücretsiz plan ayda 1500 tweet ile sınırlıdır',
    ],
  },
  pinterest: {
    baslik: 'Pinterest Developer Kurulumu',
    adimlar: [
      'developers.pinterest.com adresine gidin',
      'Yeni uygulama oluşturun, App ID ve App Secret alın',
      '.env dosyasına PINTEREST_APP_ID ve PINTEREST_APP_SECRET ekleyin',
      'Redirect URI: {APP_URL}/api/hesaplar/callback/pinterest',
      'Scopes: boards:read, boards:write, pins:read, pins:write',
    ],
  },
  youtube: {
    baslik: 'Google / YouTube Kurulumu',
    adimlar: [
      'console.cloud.google.com\'da yeni proje oluşturun',
      'YouTube Data API v3\'ü etkinleştirin',
      'OAuth 2.0 kimlik bilgileri oluşturun (Web application türü)',
      '.env dosyasına GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET ekleyin',
      'Authorized redirect URI: {APP_URL}/api/hesaplar/callback/youtube',
      'Test kullanıcısı olarak kendi Gmail adresinizi ekleyin (yayın öncesi)',
    ],
  },
};

export default function SosyalMedyaHesaplar() {
  const { kullanici } = useAuth();
  const navigate = useNavigate();
  const [hesaplar, setHesaplar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kilavuzPlatform, setKilavuzPlatform] = useState(null);
  const [baglaniyorPlatform, setBaglaniyorPlatform] = useState(null);
  const [fbSayfalar, setFbSayfalar] = useState([]);
  const [fbSayfaModal, setFbSayfaModal] = useState(null);
  const [pinterestBoardModal, setPinterestBoardModal] = useState(null);
  const [pinterestBoardlar, setPinterestBoardlar] = useState([]);

  const markaId = kullanici?.marka_id;

  useEffect(() => {
    yukle();
    // OAuth popup mesajlarını dinle
    const handler = (e) => {
      if (e.data?.basarili) {
        toast.success(`${e.data.platform} hesabı bağlandı!`);
        setBaglaniyorPlatform(null);
        yukle();
      } else if (e.data?.hata) {
        toast.error(e.data.hata);
        setBaglaniyorPlatform(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  async function yukle() {
    setYukleniyor(true);
    try {
      const { data } = await api.get(`/hesaplar?marka_id=${markaId}`);
      setHesaplar(data);
    } catch { toast.error('Yükleme hatası'); }
    setYukleniyor(false);
  }

  async function bagla(platform) {
    if (platform === 'instagram') return toast('Instagram, Facebook bağlantısıyla otomatik eklenir', { icon: 'ℹ️' });
    setBaglaniyorPlatform(platform);
    try {
      const { data } = await api.get(`/hesaplar/oauth-url/${platform}?marka_id=${markaId}`);
      const popup = window.open(data.url, 'oauth', 'width=600,height=700,scrollbars=yes');
      if (!popup) {
        toast.error('Popup engellendi. Tarayıcı popup izinlerini kontrol edin.');
        setBaglaniyorPlatform(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.hata || 'Bağlantı başlatılamadı');
      setBaglaniyorPlatform(null);
    }
  }

  async function hesapSil(id, platform) {
    if (!confirm(`${platform} hesabını kaldırmak istediğinizden emin misiniz?`)) return;
    try {
      await api.delete(`/hesaplar/${id}`);
      setHesaplar(h => h.filter(x => x.id !== id));
      toast.success('Hesap kaldırıldı');
    } catch { toast.error('Silinemedi'); }
  }

  async function fbSayfaYukle(hesapId) {
    try {
      const { data } = await api.get(`/hesaplar/${hesapId}/facebook-sayfalar`);
      setFbSayfalar(data);
      setFbSayfaModal(hesapId);
    } catch { toast.error('Sayfalar yüklenemedi'); }
  }

  async function fbSayfaSec(hesapId, sayfa) {
    try {
      const hesap = hesaplar.find(h => h.id === hesapId);
      await api.put(`/hesaplar/${hesapId}`, {
        sayfa_id: sayfa.id,
        sayfa_adi: sayfa.ad,
        ekstra: hesap?.ekstra || {},
      });
      toast.success(`Sayfa seçildi: ${sayfa.ad}`);
      setFbSayfaModal(null);
      yukle();
    } catch { toast.error('Sayfa seçilemedi'); }
  }

  async function pinterestBoardYukle(hesapId) {
    try {
      const { data } = await api.get(`/hesaplar/${hesapId}/pinterest-boardlar`);
      setPinterestBoardlar(data);
      setPinterestBoardModal(hesapId);
    } catch { toast.error('Board\'lar yüklenemedi'); }
  }

  async function pinterestBoardSec(hesapId, board) {
    try {
      const hesap = hesaplar.find(h => h.id === hesapId);
      await api.put(`/hesaplar/${hesapId}`, {
        sayfa_id: hesap?.sayfa_id,
        sayfa_adi: hesap?.sayfa_adi,
        ekstra: { ...hesap?.ekstra, varsayilan_board_id: board.id, varsayilan_board_adi: board.name },
      });
      toast.success(`Varsayılan board: ${board.name}`);
      setPinterestBoardModal(null);
      yukle();
    } catch { toast.error('Board seçilemedi'); }
  }

  return (
    <div>
      <div style={styles.ust}>
        <div>
          <h1 style={styles.baslik}>Sosyal Medya Hesapları</h1>
          <p style={styles.altBaslik}>Platformlarınızı bağlayın ve yönetin</p>
        </div>
        <button onClick={() => navigate('/')} style={styles.geriBtn}>← Geri</button>
      </div>

      {/* .env Uyarısı */}
      <div style={styles.uyari}>
        <span style={{ fontSize: 20 }}>⚙️</span>
        <div>
          <strong>Kurulum gerekli:</strong> Her platform için API anahtarları .env dosyasına eklenmelidir.
          Bir platforma tıklayarak kurulum kılavuzunu görüntüleyin.
        </div>
      </div>

      <div style={styles.grid}>
        {PLATFORMLAR.map(p => {
          const bagliHesap = hesaplar.find(h => h.platform === p.id && h.aktif);
          const baglaniyor = baglaniyorPlatform === p.id;

          return (
            <div key={p.id} style={{ ...styles.platKart, borderTop: `3px solid ${p.renk}` }}>
              <div style={styles.platUst}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 32 }}>{p.ikon}</span>
                  <div>
                    <div style={styles.platAd}>{p.etiket}</div>
                    <div style={styles.platAciklama}>{p.aciklama}</div>
                  </div>
                </div>
                {!p.otomatik && (
                  <button
                    onClick={() => setKilavuzPlatform(kilavuzPlatform === p.id ? null : p.id)}
                    style={styles.kilavuzBtn}
                    title="Kurulum Kılavuzu"
                  >
                    ?
                  </button>
                )}
              </div>

              {/* Bağlı hesap bilgisi */}
              {bagliHesap ? (
                <div style={styles.bagliKutu}>
                  <div style={styles.bagliBaslik}>
                    {bagliHesap.profil_resim && (
                      <img src={bagliHesap.profil_resim} style={styles.profilResim} alt="" />
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{bagliHesap.hesap_adi}</div>
                      {bagliHesap.sayfa_adi && <div style={{ fontSize: 12, color: '#64748b' }}>Sayfa: {bagliHesap.sayfa_adi}</div>}
                      {bagliHesap.ekstra?.varsayilan_board_adi && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>Board: {bagliHesap.ekstra.varsayilan_board_adi}</div>
                      )}
                      {bagliHesap.token_bitis && (
                        <div style={{ fontSize: 11, color: new Date(bagliHesap.token_bitis) < new Date() ? '#ef4444' : '#10b981' }}>
                          Token: {new Date(bagliHesap.token_bitis) < new Date() ? '⚠ Süresi doldu' : '✓ Aktif'}
                          {' '}({new Date(bagliHesap.token_bitis).toLocaleDateString('tr-TR')})
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {p.id === 'facebook' && (
                      <button onClick={() => fbSayfaYukle(bagliHesap.id)} style={styles.ayarBtn}>Sayfa Seç</button>
                    )}
                    {p.id === 'pinterest' && (
                      <button onClick={() => pinterestBoardYukle(bagliHesap.id)} style={styles.ayarBtn}>Board Seç</button>
                    )}
                    <button onClick={() => bagla(p.id)} style={styles.yenidenBtn}>Yeniden Bağla</button>
                    <button onClick={() => hesapSil(bagliHesap.id, p.etiket)} style={styles.silBtn}>Kaldır</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {p.otomatik ? (
                    <div style={styles.otomatikMesaj}>Facebook bağlandığında otomatik eklenir</div>
                  ) : (
                    <button
                      onClick={() => bagla(p.id)}
                      disabled={baglaniyor}
                      style={{ ...styles.baglaBtn, background: p.renk }}
                    >
                      {baglaniyor ? 'Bağlanıyor...' : `${p.ikon} ${p.etiket} Bağla`}
                    </button>
                  )}
                </div>
              )}

              {/* Kurulum Kılavuzu */}
              {kilavuzPlatform === p.id && KURULUM_KILAVUZU[p.id] && (
                <div style={styles.kilavuz}>
                  <div style={styles.kilavuzBaslik}>{KURULUM_KILAVUZU[p.id].baslik}</div>
                  <ol style={styles.kilavuzListe}>
                    {KURULUM_KILAVUZU[p.id].adimlar.map((adim, i) => (
                      <li key={i} style={styles.kilavuzAdim}>{adim}</li>
                    ))}
                  </ol>
                  {p.gereksinimler && (
                    <div style={styles.envKutulari}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>.env dosyasına eklenecekler:</div>
                      {p.gereksinimler.map(k => (
                        <code key={k} style={styles.envAnahtar}>{k}=...</code>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Facebook Sayfa Seçimi Modal */}
      {fbSayfaModal && (
        <div style={styles.modalArka} onClick={() => setFbSayfaModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalUst}>
              <h3 style={{ margin: 0 }}>Facebook Sayfası Seçin</h3>
              <button onClick={() => setFbSayfaModal(null)} style={styles.kapatBtn}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              {fbSayfalar.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Sayfa bulunamadı</div>
              ) : (
                fbSayfalar.map(s => (
                  <button key={s.id} onClick={() => fbSayfaSec(fbSayfaModal, s)} style={styles.sayfaBtn}>
                    <span style={{ fontWeight: 600 }}>{s.ad}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>ID: {s.id}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pinterest Board Seçimi Modal */}
      {pinterestBoardModal && (
        <div style={styles.modalArka} onClick={() => setPinterestBoardModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalUst}>
              <h3 style={{ margin: 0 }}>Varsayılan Board Seçin</h3>
              <button onClick={() => setPinterestBoardModal(null)} style={styles.kapatBtn}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              {pinterestBoardlar.map(b => (
                <button key={b.id} onClick={() => pinterestBoardSec(pinterestBoardModal, b)} style={styles.sayfaBtn}>
                  <span style={{ fontWeight: 600 }}>{b.name}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{b.privacy}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  ust: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  baslik: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' },
  altBaslik: { color: '#64748b', margin: 0, fontSize: 14 },
  geriBtn: { padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  uyari: { display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 16, marginBottom: 24, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 },
  platKart: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  platUst: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  platAd: { fontSize: 16, fontWeight: 700, color: '#0f172a' },
  platAciklama: { fontSize: 12, color: '#64748b', marginTop: 2 },
  kilavuzBtn: { width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#64748b', flexShrink: 0 },
  bagliKutu: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginTop: 8 },
  bagliBaslik: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  profilResim: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' },
  ayarBtn: { padding: '5px 10px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  yenidenBtn: { padding: '5px 10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  silBtn: { padding: '5px 10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  baglaBtn: { width: '100%', padding: '10px 16px', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  otomatikMesaj: { background: '#f8fafc', borderRadius: 8, padding: 10, fontSize: 12, color: '#64748b', textAlign: 'center', fontStyle: 'italic' },
  kilavuz: { marginTop: 16, background: '#f8fafc', borderRadius: 8, padding: 16 },
  kilavuzBaslik: { fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#0f172a' },
  kilavuzListe: { margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 },
  kilavuzAdim: { fontSize: 13, color: '#374151', lineHeight: 1.5 },
  envKutulari: { marginTop: 12, padding: 10, background: '#1e293b', borderRadius: 6 },
  envAnahtar: { display: 'block', color: '#a5f3fc', fontSize: 12, fontFamily: 'monospace', marginBottom: 2 },
  modalArka: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, width: 440, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalUst: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' },
  kapatBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' },
  sayfaBtn: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 16px', background: '#f8fafc', border: 'none', borderRadius: 8, cursor: 'pointer', marginBottom: 6, textAlign: 'left' },
};
