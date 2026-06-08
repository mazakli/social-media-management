import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Giris() {
  const { giris } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', sifre: '' });
  const [yukleniyor, setYukleniyor] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setYukleniyor(true);
    try {
      await giris(form.email, form.sifre);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.hata || 'Giriş başarısız');
    }
    setYukleniyor(false);
  }

  return (
    <div style={s.sayfa}>
      <div style={s.kart}>
        <div style={s.logo}>📱</div>
        <h1 style={s.baslik}>Sosyal Medya Paneli</h1>
        <p style={s.altBaslik}>Hesabınıza giriş yapın</p>
        <form onSubmit={handleSubmit} style={s.form}>
          <input
            type="email" placeholder="E-posta" required
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={s.input}
          />
          <input
            type="password" placeholder="Şifre" required
            value={form.sifre} onChange={e => setForm(f => ({ ...f, sifre: e.target.value }))}
            style={s.input}
          />
          <button type="submit" disabled={yukleniyor} style={s.btn}>
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  sayfa: { minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kart: { background: '#fff', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 25px 50px rgba(0,0,0,0.3)' },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  baslik: { fontSize: 22, fontWeight: 700, textAlign: 'center', margin: '0 0 6px', color: '#0f172a' },
  altBaslik: { fontSize: 14, color: '#64748b', textAlign: 'center', margin: '0 0 24px' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' },
  btn: { padding: '11px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};
