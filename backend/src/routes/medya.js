const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const izinliler = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
    cb(null, izinliler.includes(file.mimetype));
  },
});

router.post('/yukle', authMiddleware, upload.single('dosya'), async (req, res) => {
  if (!req.file) return res.status(400).json({ hata: 'Dosya seçilmedi' });
  const { marka_id } = req.body;
  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: `sm/${marka_id || 'genel'}`, resource_type: 'auto' },
        (err, result) => err ? reject(err) : resolve(result)
      ).end(req.file.buffer);
    });
    const tur = req.file.mimetype.startsWith('image') ? 'gorsel' : 'video';
    const { rows } = await pool.query(
      `INSERT INTO medyalar (marka_id, dosya_adi, url, cloudinary_id, tur, boyut, genislik, yukseklik)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [marka_id || null, req.file.originalname, result.secure_url, result.public_id,
       tur, req.file.size, result.width || null, result.height || null]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ hata: err.message }); }
});

router.get('/', authMiddleware, async (req, res) => {
  const { marka_id, tur, limit = 50 } = req.query;
  let where = []; let params = []; let idx = 1;
  if (marka_id) { where.push(`marka_id=$${idx++}`); params.push(marka_id); }
  if (tur) { where.push(`tur=$${idx++}`); params.push(tur); }
  params.push(limit);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM medyalar ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY olusturuldu DESC LIMIT $${idx}`,
      params
    );
    res.json({ medyalar: rows });
  } catch (err) { res.status(500).json({ hata: err.message }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows: [m] } = await pool.query('SELECT * FROM medyalar WHERE id=$1', [req.params.id]);
    if (m?.cloudinary_id) await cloudinary.uploader.destroy(m.cloudinary_id);
    await pool.query('DELETE FROM medyalar WHERE id=$1', [req.params.id]);
    res.json({ basarili: true });
  } catch (err) { res.status(500).json({ hata: err.message }); }
});

module.exports = router;
