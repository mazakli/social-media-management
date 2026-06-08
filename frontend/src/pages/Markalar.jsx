import { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Markalar() {
  const [markalar, setMarkalar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [modal, setModal] = useState(false);
  const [duzenle, setDuzenle] = useState(null);
  const [form, setForm] = useState({ ad: '', slug: '', renk: '#6366f1', logo_url: '' });
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => { yukle(); }, []);

  async function yukle() {
    setYukleniyor(true);
    try {
      const { data } = await api.get('/markalar');
      setMarkalar(data);
    } catch { toast.error('Yükleme hatası'); }
    setYukleniyor(false);
  }

  function yeniAc() {
    setDuzenle(null);
    setForm({ ad: '', slug: '', renk: '#6366f1', logo_url: '' });
    setModal(true);
  }

  function duzenleAc(marka) {
    setDuzenle(marka);
    setForm({ ad: marka.ad, slug: marka.slug, renk: marka.renk || '#6366f1', logo_url: marka.logo_url || '' });
    setModal(true);
  }

  function slugOlustur(ad) {
    return ad.toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function kaydet() {
    if (!form.ad.trim()) return toast.error('Marka adı gerekli');
    setKaydediliyor(true);
    try {
      if (duzenle) {
        const { data } = await api.put(`/markalar/${duzenle.id}`, form);
        setMarkalar(m => m.map(x => x.id === duzenle.id ? data : x));
        toast.success('Marka güncellendi');
      } else {
        const slug = form.slug || slugOlustur(form.ad);
        const { data } = await api.post('/markalar', { ...form, slug });
        setMarkalar(m => [...m, data]);
        toast.success('Marka oluşturuldu');
      }
      setModal(false);
    } catch (err) {
      toast.error(err.response?.data?.hata || 'Kayıt hatası');
    }
    setKaydediliyor(false);
  }

  return (
    <div style={s.sayfa}>
      <div style={s.baslik}>
        <div>
          <h1 style={s.h1}>Markalar</h1>
          <p style={s.aciklama}>Sosyal medya hesaplarını yönettiğiniz markalar</p>
        </div>
        <button onClick={yeniAc} style={s.yeniBtn}>+ Yeni Marka</button>
      </div>

      {yukleniyor ? (
        <div style={s.yukle}>Yükleniyor...</div>
      ) : markalar.length === 0 ? (
        <div style={s.bos}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Henüz marka yok</div>
          <div style={{ color: '#64748b', marginBottom: 20 }}>Sosyal medya hesaplarını yönetmek için önce bir marka oluşturun</div>
          <button onClick={yeniAc} style={s.yeniBtn}>+ İlk Markayı Oluştur</button>
        </div>
      ) : (
        <div style={s.grid}>
          {markalar.map(m => (
            <div key={m.id} style={s.kart}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ ...s.renk, background: m.renk || '#6366f1' }}>
                  {m.logo_url ? <img src={m.logo_url} alt={m.ad} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} /> : m.ad[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{m.ad}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>/{m.slug}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{ ...s.badge, background: m.aktif ? '#dcfce7' : '#fee2e2', color: m.aktif ? '#16a34a' : '#dc2626' }}>
                    {m.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
              <button onClick={() => duzenleAc(m)} style={s.duzenleBtn}>✏️ Düzenle</button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalBaslik}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{duzenle ? 'Markayı Düzenle' : 'Yeni Marka'}</h2>
              <button onClick={() => setModal(false)} style={s.kapat}>✕</button>
            </div>

            <div style={s.formGrup}>
              <label style={s.label}>Marka Adı *</label>
              <input
                style={s.input}
                value={form.ad}
                onChange={e => {
                  const ad = e.target.value;
                  setForm(f => ({ ...f, ad, slug: f.slug || slugOlustur(ad) }));
                }}
                placeholder="Örn: Cherry Blossoms Tree"
              />
            </div>

            <div style={s.formGrup}>
              <label style={s.label}>Slug (URL)</label>
              <input
                style={s.input}
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="cherry-blossoms-tree"
              />
            </div>

            <div style={s.formGrup}>
              <label style={s.label}>Renk</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.renk} onChange={e => setForm(f => ({ ...f, renk: e.target.value }))} style={{ width: 44, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
                <input style={{ ...s.input, flex: 1 }} value={form.renk} onChange={e => setForm(f => ({ ...f, renk: e.target.value }))} placeholder="#6366f1" />
              </div>
            </div>

            <div style={s.formGrup}>
              <label style={s.label}>Logo URL (opsiyonel)</label>
              <input
                style={s.input}
                value={form.logo_url}
                onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={s.iptalBtn}>İptal</button>
              <button onClick={kaydet} disabled={kaydediliyor} style={s.kaydetBtn}>
                {kaydediliyor ? 'Kaydediliyor...' : duzenle ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  sayfa: { maxWidth: 900, margin: '0 auto' },
  baslik: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  h1: { margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' },
  aciklama: { margin: '4px 0 0', color: '#64748b', fontSize: 14 },
  yeniBtn: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  yukle: { textAlign: 'center', padding: 60, color: '#64748b' },
  bos: { textAlign: 'center', padding: 60, background: '#fff', borderRadius: 16, border: '2px dashed #e2e8f0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 },
  kart: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' },
  renk: { width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0, overflow: 'hidden' },
  badge: { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20 },
  duzenleBtn: { width: '100%', padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#475569' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' },
  modalBaslik: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  kapat: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' },
  formGrup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  iptalBtn: { flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: '#64748b' },
  kaydetBtn: { flex: 2, padding: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: '#fff', fontSize: 14 },
};
