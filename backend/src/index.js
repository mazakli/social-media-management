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

// Zamanlı post kontrolü (her 60 saniye)
const { zamanliPostlariIsle } = require('./services/paylas-yoneticisi');
setInterval(zamanliPostlariIsle, 60 * 1000);

// Frontend static
const frontendPath = path.join(__dirname, '../public');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Sosyal Medya Panel çalışıyor: http://localhost:${PORT}`);
});
