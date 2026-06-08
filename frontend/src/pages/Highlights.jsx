import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const HAZIR_RENKLER = [
  '#6366f1', '#E1306C', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#F97316',
];

const BOŞ_FORM = { baslik: '', kapak_gorsel_url: '', kapak_cloudinary_id: '', renk: '#6366f1', sira: 0, sm_hesap_id: '' };

export default function SosyalMedyaHighlights() {
  const { kullanici } = useAuth();
  const markaId = kullanici?.marka_id;

  const [highlights, setHighlights] = useState([]);
  const [igHesaplar, setIgHesaplar] = useState([]);
  const [modalAcik, setModalAcik] = useState(false);
  const [form, setForm] = useState(BOŞ_FORM);
  const [duzenleId, setDuzenleId] = useState(null);
  const [medyaAcik, setMedyaAcik] = useState(false);
  const [medyaListesi, setMedyaListesi] = useState([]);
  const [kaydiyor, setKaydiyor] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    yukle();
  }, []);

  async function yukle() {
    setYukleniyor(true);
    try {
      const [h, hesaplar] = await Promise.all([
        api.get(`/postlar/highlights/liste?marka_id=${markaId}`),
        api.get(`/hesaplar?marka_id=${markaId}`),
      ]);
      setHighlights(h.data || []);
      setIgHesaplar((hesaplar.data || []).filter(h => h.platform === 'instagram' && h.aktif));
    } catch {
      toast.error('Yükleme hatası');
    }
    setYukleniyor(false);
  }

  function yeniAc() {
    setForm({ ...BOŞ_FORM, sm_hesap_id: igHesaplar[0]?.id || '' });
    setDuzenleId(null);
    setModalAcik(true);
  }

  function duzenleAc(h) {
    setForm({
      baslik: h.baslik || '',
      kapak_gorsel_url: h.kapak_gorsel_url || '',
      kapak_cloudinary_id: h.kapak_cloudinary_id || '',
      renk: h.renk || '#6366f1',
      sira: h.sira || 0,
      sm_hesap_id: h.sm_hesap_id || '',
    });
    setDuzenleId(h.id);
    setModalAcik(true);
  }

  async function kaydet() {
    if (!form.baslik.trim()) return toast.error('Başlık zorunludur');
    if (!form.sm_hesap_id) return toast.error('Instagram hesabı seçin');
    setKaydiyor(true);
    try {
      if (duzenleId) {
        await api.put(`/postlar/highlights/${duzenleId}`, form);
        toast.success('Highlight güncellendi');
      } else {
        await api.post('/postlar/highlights', { ...form, marka_id: markaId });
        toast.success('Highlight oluşturuldu');
      }
      setModalAcik(false);
      yukle();
    } catch (err) {
      toast.error(err.response?.data?.hata || 'Hata oluştu');
    }
    setKaydiyor(false);
  }

  async function sil(id) {
    if (!confirm('Bu highlight\'ı silmek istediğinizden emin misiniz?')) return;
    try {
      await api.delete(`/postlar/highlights/${id}`);
      setHighlights(h => h.filter(x => x.id !== id));
      toast.success('Silindi');
    } catch { toast.error('Silinemedi'); }
  }

  async function aktiflikToggle(h) {
    try {
      await api.put(`/postlar/highlights/${h.id}`, { ...h, aktif: !h.aktif });
      setHighlights(hs => hs.map(x => x.id === h.id ? { ...x, aktif: !x.aktif } : x));
    } catch { toast.error('Güncellenemedi'); }
  }

  async function medyaYukle(e) {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    const fd = new FormData();
    fd.append('dosya', dosya);
    fd.append('marka_id', markaId);
    try {
      const { data } = await api.post('/medya/yukle', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(f => ({ ...f, kapak_gorsel_url: data.url, kapak_cloudinary_id: data.cloudinary_id || '' }));
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

  function medyaSec(m) {
    setForm(f => ({ ...f, kapak_gorsel_url: m.url, kapak_cloudinary_id: m.cloudinary_id || '' }));
    setMedyaAcik(false);
  }

  if (yukleniyor) return <div style={styles.yukle}>Yükleniyor...</div>;

  return (
    <div>
      <div style={styles.ust}>
        <div>
          <h1 style={styles.baslik}>Instagram Highlights</h1>
          <p style={styles.altBaslik}>Öne Çıkanlarınızı yönetin ve özelleştirin</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="//hesaplar" style={styles.ikinciBtn}>← Hesaplar</Link>
          <button onClick={yeniAc} style={styles.birincilBtn} disabled={igHesaplar.length === 0}>
            + Yeni Highlight
          </button>
        </div>
      </div>

      {igHesaplar.length === 0 && (
        <div style={styles.uyari}>
          <span style={{ fontSize: 24 }}>📸</span>
          <div>
            <strong>Instagram hesabı bağlı değil.</strong>
            <br />
            <span style={{ fontSize: 13 }}>Highlights oluşturmak için önce bir Instagram Business hesabı bağlayın.</span>
            <br />
            <Link to="//hesaplar" style={{ color: '#6366f1', fontSize: 13 }}>Hesap Bağla →</Link>
          </div>
        </div>
      )}

      {igHesaplar.length > 0 && highlights.length === 0 && (
        <div style={styles.bos}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⭐</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Henüz highlight yok</div>
          <div style={{ color: '#64748b', marginBottom: 20 }}>Instagram profilinizde görünecek öne çıkanları oluşturun</div>
          <button onClick={yeniAc} style={styles.birincilBtn}>İlk Highlight'ı Oluştur</button>
        </div>
      )}

      {/* Highlight Listesi — Instagram profil simülasyonu */}
      {highlights.length > 0 && (
        <>
          {/* Profil Önizlemesi */}
          <div style={styles.profilSimulasyon}>
            <div style={styles.profilBaslik}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Instagram Profil Önizleme</span>
            </div>
            <div style={styles.highlightSirasi}>
              {highlights.filter(h => h.aktif).sort((a, b) => a.sira - b.sira).map(h => (
                <div key={h.id} style={styles.highlightDaire}>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
                    border: `3px solid ${h.renk}`,
                    background: h.kapak_gorsel_url ? 'transparent' : h.renk,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {h.kapak_gorsel_url ? (
                      <img src={h.kapak_gorsel_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <span style={{ fontSize: 24, color: '#fff' }}>⭐</span>
                    )}
                  </div>
                  <span style={styles.highlightAd}>{h.baslik}</span>
                </div>
              ))}
              <div style={styles.highlightDaire}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={yeniAc}>
                  <span style={{ fontSize: 24, color: '#94a3b8' }}>+</span>
                </div>
                <span style={styles.highlightAd}>Yeni</span>
              </div>
            </div>
          </div>

          {/* Highlight Yönetim Listesi */}
          <div style={styles.listeKart}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Tüm Highlights ({highlights.length})</div>
            <div style={styles.listeGrid}>
              {highlights.sort((a, b) => a.sira - b.sira).map(h => (
                <div key={h.id} style={{ ...styles.highlightKart, opacity: h.aktif ? 1 : 0.5 }}>
                  {/* Kapak */}
                  <div style={{
                    width: '100%', aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                    background: h.kapak_gorsel_url ? 'transparent' : h.renk,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 8, border: `3px solid ${h.renk}`,
                  }}>
                    {h.kapak_gorsel_url ? (
                      <img src={h.kapak_gorsel_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <span style={{ fontSize: 32 }}>⭐</span>
                    )}
                  </div>

                  <div style={{ fontWeight: 600, fontSize: 13, textAlign: 'center', marginBottom: 4 }}>{h.baslik}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 8 }}>{h.hesap_adi}</div>
                  {h.platform_highlight_id && (
                    <div style={{ fontSize: 10, color: '#10b981', textAlign: 'center', marginBottom: 6 }}>✓ Instagram'da aktif</div>
                  )}

                  <div style={styles.kartAksiyonlar}>
                    <button onClick={() => aktiflikToggle(h)} style={{ ...styles.toggleBtn, background: h.aktif ? '#d1fae5' : '#f1f5f9', color: h.aktif ? '#065f46' : '#64748b' }}>
                      {h.aktif ? 'Aktif' : 'Gizli'}
                    </button>
                    <button onClick={() => duzenleAc(h)} style={styles.duzenleBtn}>✏️</button>
                    <button onClick={() => sil(h.id)} style={styles.silBtn}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Yeni/Düzenle Modal */}
      {modalAcik && (
        <div style={styles.modalArka} onClick={() => setModalAcik(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalUst}>
              <h3 style={{ margin: 0 }}>{duzenleId ? 'Highlight Düzenle' : 'Yeni Highlight'}</h3>
              <button onClick={() => setModalAcik(false)} style={styles.kapatBtn}>✕</button>
            </div>

            <div style={styles.modalIcerik}>
              {/* Instagram Hesabı */}
              <div style={styles.formGrup}>
                <label style={styles.label}>Instagram Hesabı *</label>
                <select value={form.sm_hesap_id} onChange={e => setForm(f => ({ ...f, sm_hesap_id: e.target.value }))} style={styles.input}>
                  <option value="">Hesap seçin</option>
                  {igHesaplar.map(h => <option key={h.id} value={h.id}>{h.hesap_adi}</option>)}
                </select>
              </div>

              {/* Başlık */}
              <div style={styles.formGrup}>
                <label style={styles.label}>Başlık *</label>
                <input
                  value={form.baslik}
                  onChange={e => setForm(f => ({ ...f, baslik: e.target.value }))}
                  placeholder="Örn: Ürünler, Haberler, Etkinlikler..."
                  maxLength={15}
                  style={styles.input}
                />
                <div style={styles.ipucu}>{form.baslik.length}/15 karakter (Instagram limiti)</div>
              </div>

              {/* Kapak Görseli */}
              <div style={styles.formGrup}>
                <label style={styles.label}>Kapak Görseli</label>
                {form.kapak_gorsel_url ? (
                  <div style={styles.kapakOnizleme}>
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
                      border: `3px solid ${form.renk}`,
                    }}>
                      <img src={form.kapak_gorsel_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button onClick={medyaListeYukle} style={styles.degistirBtn}>Değiştir</button>
                      <button onClick={() => setForm(f => ({ ...f, kapak_gorsel_url: '', kapak_cloudinary_id: '' }))} style={styles.kaldirBtn}>Kaldır</button>
                    </div>
                  </div>
                ) : (
                  <div style={styles.gorselYukleAlani}>
                    <label style={styles.yukleBtn}>
                      📁 Yükle
                      <input type="file" accept="image/*" onChange={medyaYukle} style={{ display: 'none' }} />
                    </label>
                    <button onClick={medyaListeYukle} style={styles.kutuphanBtn}>🖼️ Kütüphane</button>
                    <div style={styles.ipucu}>Önerilen: 1080×1920px (9:16) PNG/JPG</div>
                  </div>
                )}
              </div>

              {/* Renk Seçimi */}
              <div style={styles.formGrup}>
                <label style={styles.label}>Çerçeve Rengi</label>
                <div style={styles.renkGrid}>
                  {HAZIR_RENKLER.map(r => (
                    <div
                      key={r}
                      onClick={() => setForm(f => ({ ...f, renk: r }))}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', background: r,
                        cursor: 'pointer', border: form.renk === r ? '3px solid #0f172a' : '3px solid transparent',
                        boxShadow: form.renk === r ? `0 0 0 2px ${r}40` : 'none',
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.renk}
                    onChange={e => setForm(f => ({ ...f, renk: e.target.value }))}
                    style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }}
                    title="Özel renk"
                  />
                </div>
              </div>

              {/* Sıra */}
              <div style={styles.formGrup}>
                <label style={styles.label}>Sıra (0 = en başta)</label>
                <input
                  type="number"
                  value={form.sira}
                  onChange={e => setForm(f => ({ ...f, sira: parseInt(e.target.value) || 0 }))}
                  min={0}
                  style={{ ...styles.input, width: 100 }}
                />
              </div>

              {/* Önizleme */}
              <div style={styles.formGrup}>
                <label style={styles.label}>Önizleme</label>
                <div style={styles.onizlemeKutu}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
                      border: `3px solid ${form.renk}`,
                      background: form.kapak_gorsel_url ? 'transparent' : form.renk,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {form.kapak_gorsel_url ? (
                        <img src={form.kapak_gorsel_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : (
                        <span style={{ color: '#fff', fontSize: 28 }}>⭐</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#374151', fontWeight: 500, maxWidth: 70, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {form.baslik || 'Başlık'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.modalAlt}>
              <button onClick={() => setModalAcik(false)} style={styles.iptalBtn}>İptal</button>
              <button onClick={kaydet} disabled={kaydiyor} style={styles.kaydetBtn}>
                {kaydiyor ? 'Kaydediliyor...' : duzenleId ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medya Kütüphanesi Modal */}
      {medyaAcik && (
        <div style={styles.modalArka} onClick={() => setMedyaAcik(false)}>
          <div style={{ ...styles.modal, width: '70vw', maxWidth: 800 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalUst}>
              <h3 style={{ margin: 0 }}>Medya Kütüphanesi</h3>
              <button onClick={() => setMedyaAcik(false)} style={styles.kapatBtn}>✕</button>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, overflowY: 'auto', maxHeight: '60vh' }}>
              {medyaListesi.map(m => (
                <img key={m.id} src={m.url} onClick={() => medyaSec(m)}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} alt="" />
              ))}
              {medyaListesi.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: '#94a3b8' }}>Medya yok</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  yukle: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94a3b8' },
  ust: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  baslik: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' },
  altBaslik: { color: '#64748b', margin: 0, fontSize: 14 },
  birincilBtn: { padding: '8px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, textDecoration: 'none' },
  ikinciBtn: { padding: '8px 16px', background: '#f1f5f9', color: '#475569', borderRadius: 8, textDecoration: 'none', fontSize: 14 },
  uyari: { display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 16, marginBottom: 24 },
  bos: { background: '#fff', borderRadius: 12, padding: '80px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  profilSimulasyon: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  profilBaslik: { marginBottom: 12 },
  highlightSirasi: { display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 },
  highlightDaire: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 },
  highlightAd: { fontSize: 11, color: '#374151', maxWidth: 70, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  listeKart: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  listeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 },
  highlightKart: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
  kartAksiyonlar: { display: 'flex', gap: 4, justifyContent: 'center' },
  toggleBtn: { padding: '4px 8px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 },
  duzenleBtn: { padding: '4px 8px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  silBtn: { padding: '4px 8px', background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  modalArka: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 16, width: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalUst: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' },
  kapatBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' },
  modalIcerik: { flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  modalAlt: { padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8 },
  formGrup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  ipucu: { fontSize: 11, color: '#94a3b8' },
  kapakOnizleme: { display: 'flex', alignItems: 'center', gap: 16 },
  gorselYukleAlani: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  yukleBtn: { padding: '8px 14px', background: '#6366f1', color: '#fff', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'inline-block' },
  kutuphanBtn: { padding: '8px 14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  degistirBtn: { padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  kaldirBtn: { padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  renkGrid: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  onizlemeKutu: { background: '#f8fafc', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'center' },
  iptalBtn: { padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  kaydetBtn: { padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};
