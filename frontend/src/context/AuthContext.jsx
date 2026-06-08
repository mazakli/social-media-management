import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sm_token');
    if (token) {
      api.get('/auth/ben')
        .then(r => setKullanici(r.data))
        .catch(() => localStorage.removeItem('sm_token'))
        .finally(() => setYukleniyor(false));
    } else {
      setYukleniyor(false);
    }
  }, []);

  async function giris(email, sifre) {
    const { data } = await api.post('/auth/giris', { email, sifre });
    localStorage.setItem('sm_token', data.token);
    setKullanici(data.kullanici);
    return data;
  }

  function cikis() {
    localStorage.removeItem('sm_token');
    setKullanici(null);
  }

  return (
    <AuthContext.Provider value={{ kullanici, yukleniyor, giris, cikis }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
