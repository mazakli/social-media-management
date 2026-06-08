const router = require('express').Router();
const pool = require('../db/pool');
const { authMiddleware, superadmin } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM markalar ORDER BY ad');
    res.json(rows);
  } catch (err) { res.status(500).json({ hata: err.message }); }
});

router.post('/', authMiddleware, superadmin, async (req, res) => {
  const { ad, slug, logo_url, renk } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO markalar (ad, slug, logo_url, renk) VALUES ($1,$2,$3,$4) RETURNING *',
      [ad, slug, logo_url, renk || '#6366f1']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ hata: err.message }); }
});

router.put('/:id', authMiddleware, superadmin, async (req, res) => {
  const { ad, logo_url, renk, aktif } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE markalar SET ad=$1, logo_url=$2, renk=$3, aktif=$4 WHERE id=$5 RETURNING *',
      [ad, logo_url, renk, aktif, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ hata: err.message }); }
});

module.exports = router;
