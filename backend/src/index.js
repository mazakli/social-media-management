require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/markalar', require('./routes/markalar'));
app.use('/api/medya', require('./routes/medya'));
app.use('/api/hesaplar', require('./routes/hesaplar'));
app.use('/api/postlar', require('./routes/postlar'));

// Sağlık kontrolü
app.get('/_health', (req, res) => res.json({ durum: 'çalışıyor', servis: 'sosyal-medya-panel' }));

// Frontend static
const frontendPath = path.join(__dirname, '../public');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

async function baslat() {
  // Migration otomatik çalıştır
  try {
    await require('./db/migrate')();
    console.log('✅ Veritabanı hazır');
  } catch (err) {
    console.error('⚠️ Migration hatası:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`✅ Sosyal Medya Panel çalışıyor: http://localhost:${PORT}`);
  });

  // Zamanlı post kontrolü (her 60 saniye) — hata verse de çökmez
  const { zamanliPostlariIsle } = require('./services/paylas-yoneticisi');
  setInterval(async () => {
    try {
      await zamanliPostlariIsle();
    } catch (err) {
      console.error('Scheduler hatası:', err.message);
    }
  }, 60 * 1000);
}

baslat();
