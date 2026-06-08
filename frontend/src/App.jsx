import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Giris from './pages/Giris';
import Dashboard from './pages/Dashboard';
import Post from './pages/Post';
import Hesaplar from './pages/Hesaplar';
import Highlights from './pages/Highlights';
import Markalar from './pages/Markalar';

function KorunanRotalar() {
  const { kullanici, yukleniyor } = useAuth();
  if (yukleniyor) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18, color: '#64748b' }}>
      Yükleniyor...
    </div>
  );
  if (!kullanici) return <Navigate to="/giris" />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/post" element={<Post />} />
        <Route path="/post/:id" element={<Post />} />
        <Route path="/hesaplar" element={<Hesaplar />} />
        <Route path="/highlights" element={<Highlights />} />
        <Route path="/markalar" element={<Markalar />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/giris" element={<Giris />} />
          <Route path="/*" element={<KorunanRotalar />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
