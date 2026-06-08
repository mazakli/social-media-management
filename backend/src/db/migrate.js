const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  try {
    console.log('Tablolar oluşturuluyor...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS kullanicilar (
        id SERIAL PRIMARY KEY,
        ad VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        sifre TEXT NOT NULL,
        rol VARCHAR(50) DEFAULT 'editor',
        aktif BOOLEAN DEFAULT true,
        olusturuldu TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS markalar (
        id SERIAL PRIMARY KEY,
        ad VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        logo_url TEXT,
        renk VARCHAR(7) DEFAULT '#6366f1',
        aktif BOOLEAN DEFAULT true,
        olusturuldu TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kullanici_markalar (
        kullanici_id INTEGER REFERENCES kullanicilar(id) ON DELETE CASCADE,
        marka_id INTEGER REFERENCES markalar(id) ON DELETE CASCADE,
        PRIMARY KEY (kullanici_id, marka_id)
      );

      CREATE TABLE IF NOT EXISTS sm_hesaplar (
        id SERIAL PRIMARY KEY,
        marka_id INTEGER REFERENCES markalar(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        hesap_adi VARCHAR(255),
        hesap_id TEXT,
        erisim_token TEXT,
        yenileme_token TEXT,
        token_bitis TIMESTAMP,
        sayfa_id TEXT,
        sayfa_adi TEXT,
        profil_resim TEXT,
        ekstra JSONB DEFAULT '{}',
        aktif BOOLEAN DEFAULT true,
        olusturuldu TIMESTAMP DEFAULT NOW(),
        guncellendi TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS medyalar (
        id SERIAL PRIMARY KEY,
        marka_id INTEGER REFERENCES markalar(id),
        dosya_adi VARCHAR(500) NOT NULL,
        url TEXT NOT NULL,
        cloudinary_id TEXT,
        tur VARCHAR(50) NOT NULL,
        boyut INTEGER,
        genislik INTEGER,
        yukseklik INTEGER,
        olusturuldu TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sm_postlar (
        id SERIAL PRIMARY KEY,
        marka_id INTEGER REFERENCES markalar(id) ON DELETE CASCADE,
        baslik VARCHAR(500),
        metin TEXT NOT NULL,
        gorsel_url TEXT,
        gorsel_cloudinary_id TEXT,
        link_url TEXT,
        hashtag TEXT,
        platformlar TEXT[] DEFAULT '{}',
        boyut_turu VARCHAR(50) DEFAULT 'kare',
        durum VARCHAR(50) DEFAULT 'taslak',
        zamanla TIMESTAMP,
        platform_sonuclar JSONB DEFAULT '{}',
        hata_log TEXT,
        olusturan INTEGER REFERENCES kullanicilar(id),
        olusturuldu TIMESTAMP DEFAULT NOW(),
        guncellendi TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS instagram_highlights (
        id SERIAL PRIMARY KEY,
        marka_id INTEGER REFERENCES markalar(id) ON DELETE CASCADE,
        sm_hesap_id INTEGER REFERENCES sm_hesaplar(id) ON DELETE CASCADE,
        platform_highlight_id TEXT,
        baslik VARCHAR(255) NOT NULL,
        kapak_gorsel_url TEXT,
        kapak_cloudinary_id TEXT,
        renk VARCHAR(7) DEFAULT '#6366f1',
        sira INTEGER DEFAULT 0,
        aktif BOOLEAN DEFAULT true,
        olusturuldu TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_sm_hesaplar_marka ON sm_hesaplar(marka_id);
      CREATE INDEX IF NOT EXISTS idx_sm_postlar_marka ON sm_postlar(marka_id);
      CREATE INDEX IF NOT EXISTS idx_sm_postlar_durum ON sm_postlar(durum);
      CREATE INDEX IF NOT EXISTS idx_sm_postlar_zamanla ON sm_postlar(zamanla);
    `);

    console.log('✅ Tablolar oluşturuldu!');

    const bcrypt = require('bcryptjs');
    const sifre = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO kullanicilar (ad, email, sifre, rol)
      VALUES ('Admin', 'admin@sm.com', $1, 'superadmin')
      ON CONFLICT (email) DO NOTHING;
    `, [sifre]);

    console.log('✅ Admin oluşturuldu: admin@sm.com / admin123');
    console.log('⚠️  Giriş yaptıktan sonra şifreyi değiştirin!');

  } catch (err) {
    console.error('Hata:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

// Doğrudan çalıştırıldığında migrate et
if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = migrate;
