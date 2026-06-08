const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ hata: 'Token gerekli' });
  try {
    req.kullanici = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ hata: 'Geçersiz token' });
  }
}

function superadmin(req, res, next) {
  if (req.kullanici?.rol !== 'superadmin') return res.status(403).json({ hata: 'Yetkisiz' });
  next();
}

module.exports = { authMiddleware, superadmin };
