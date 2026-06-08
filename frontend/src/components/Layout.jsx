import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const menuler = [
  { yol: '/', ikon: '📱', etiket: 'Genel Bakış' },
  { bolum: true, etiket: 'PAYLAŞIM' },
  { yol: '/post', ikon: '✏️', etiket: 'Yeni Post' },
  { yol: '/postlar', ikon: '📋', etiket: 'Tüm Postlar' },
  { bolum: true, etiket: 'HESAPLAR' },
  { yol: '/hesaplar', ikon: '🔗', etiket: 'Platform Bağla' },
  { yol: '/highlights', ikon: '⭐', etiket: 'IG Highlights' },
  { bolum: true, etiket: 'YÖNETİM', sadeceSuperadmin: true },
  { yol: '/markalar', ikon: '🏢', etiket: 'Markalar', sadeceSuperadmin: true },
  { yol: '/medya', ikon: '🖼️', etiket: 'Medya', sadeceSuperadmin: true },
];

export default function Layout({ children }) {
  const { kullanici, cikis } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [acik, setAcik] = useState(true);

  const handleCikis = () => { cikis(); navigate('/giris'); };

  return (
    <div style={s.wrapper}>
      <aside style={{ ...s.sidebar, width: acik ? 240 : 64 }}>
        <div style={s.logoAlan} onClick={() => setAcik(!acik)}>
          <div style={s.logoKutu}>SM</div>
          {acik && <span style={s.logoYazi}>Sosyal Medya</span>}
        </div>

        <nav style={s.nav}>
          {menuler
            .filter(m => !m.sadeceSuperadmin || kullanici?.rol === 'superadmin')
            .map((m, i) => {
              if (m.bolum) {
                return acik
                  ? <div key={i} style={s.bolum}>{m.etiket}</div>
                  : <div key={i} style={s.bolumCizgi} />;
              }
              const aktif = location.pathname === m.yol || (m.yol !== '/' && location.pathname.startsWith(m.yol));
              return (
                <Link key={m.yol} to={m.yol} style={{
                  ...s.navLink,
                  background: aktif ? 'rgba(99,102,241,0.18)' : 'transparent',
                  color: aktif ? '#818cf8' : '#94a3b8',
                }}>
                  <span style={s.ikon}>{m.ikon}</span>
                  {acik && <span>{m.etiket}</span>}
                </Link>
              );
            })}
        </nav>

        <div style={s.alt}>
          <div style={s.kullanici}>
            <div style={s.avatar}>{kullanici?.ad?.[0]?.toUpperCase()}</div>
            {acik && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{kullanici?.ad}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{kullanici?.rol}</div>
              </div>
            )}
          </div>
          <button onClick={handleCikis} style={s.cikisBtn} title="Çıkış">
            🚪 {acik && 'Çıkış'}
          </button>
        </div>
      </aside>

      <main style={s.main}>{children}</main>
    </div>
  );
}

const s = {
  wrapper: { display: 'flex', minHeight: '100vh', background: '#f8fafc' },
  sidebar: {
    background: 'linear-gradient(180deg,#0f172a 0%,#1e293b 100%)',
    display: 'flex', flexDirection: 'column', transition: 'width 0.25s',
    overflow: 'hidden', flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
  },
  logoAlan: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' },
  logoKutu: { width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  logoYazi: { color: '#f1f5f9', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' },
  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' },
  navLink: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'all 0.15s', whiteSpace: 'nowrap' },
  ikon: { fontSize: 17, flexShrink: 0 },
  bolum: { fontSize: 10, fontWeight: 700, color: 'rgba(148,163,184,0.5)', letterSpacing: '0.08em', padding: '12px 12px 4px', whiteSpace: 'nowrap' },
  bolumCizgi: { borderTop: '1px solid rgba(255,255,255,0.06)', margin: '6px 4px' },
  alt: { padding: 10, borderTop: '1px solid rgba(255,255,255,0.08)' },
  kullanici: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', marginBottom: 6 },
  avatar: { width: 30, height: 30, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  cikisBtn: { width: '100%', padding: '7px 10px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, color: '#fca5a5', cursor: 'pointer', fontSize: 13, textAlign: 'left', display: 'flex', gap: 6 },
  main: { flex: 1, overflow: 'auto', padding: 24 },
};
