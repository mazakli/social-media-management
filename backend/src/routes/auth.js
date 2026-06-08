const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// Giriş
router.post('/giris', async (req, res) => {
  const { email, sifre } = req.body;
  try {
    const { rows: [kullanici] } = await pool.query(
      'SELECT * FROM kullanicilar WHERE email=$1 AND aktif=true', [email]
    );
    if (!kullanici) return res.status(401).json({ hata: 'E-posta veya şifre hatalı' });
    const eslesiyor = await bcrypt.compare(sifre, kullanici.sifre);
    if (!eslesiyor) return res.status(401).json({ hata: 'E-posta veya şifre hatalı' });

    const token = jwt.sign(
      { id: kullanici.id, ad: kullanici.ad, email: kullanici.email, rol: kullanici.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, kullanici: { id: kullanici.id, ad: kullanici.ad, email: kullanici.email, rol: kullanici.rol } });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Mevcut kullanıcı
router.get('/ben', authMiddleware, async (req, res) => {
  try {
    const { rows: [k] } = await pool.query('SELECT id,ad,email,rol FROM kullanicilar WHERE id=$1', [req.kullanici.id]);
    res.json(k);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
