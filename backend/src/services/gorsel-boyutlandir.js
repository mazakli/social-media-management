// Her platform için standart görsel boyutları
const BOYUTLAR = {
  instagram: {
    kare:   { genislik: 1080, yukseklik: 1080, etiket: 'Kare (1:1)' },
    dikey:  { genislik: 1080, yukseklik: 1350, etiket: 'Dikey (4:5)' },
    yatay:  { genislik: 1080, yukseklik: 566,  etiket: 'Yatay (1.91:1)' },
    story:  { genislik: 1080, yukseklik: 1920, etiket: 'Story/Reels (9:16)' },
    highlight_kapak: { genislik: 1080, yukseklik: 1920, etiket: 'Highlight Kapağı' },
  },
  facebook: {
    kare:   { genislik: 1080, yukseklik: 1080, etiket: 'Kare (1:1)' },
    yatay:  { genislik: 1200, yukseklik: 630,  etiket: 'Link Görseli (1.91:1)' },
    story:  { genislik: 1080, yukseklik: 1920, etiket: 'Story (9:16)' },
  },
  twitter: {
    yatay:  { genislik: 1200, yukseklik: 675,  etiket: 'Tweet Görseli (16:9)' },
    kare:   { genislik: 1080, yukseklik: 1080, etiket: 'Kare (1:1)' },
  },
  pinterest: {
    standart: { genislik: 1000, yukseklik: 1500, etiket: 'Standart Pin (2:3)' },
    uzun:     { genislik: 1000, yukseklik: 2100, etiket: 'Uzun Pin (1:2.1)' },
    kare:     { genislik: 1000, yukseklik: 1000, etiket: 'Kare Pin (1:1)' },
  },
  youtube: {
    thumbnail: { genislik: 1280, yukseklik: 720,  etiket: 'Video Thumbnail (16:9)' },
    banner:    { genislik: 2560, yukseklik: 1440, etiket: 'Kanal Banner (16:9)' },
    kare:      { genislik: 800,  yukseklik: 800,  etiket: 'Profil Fotoğrafı (1:1)' },
  },
};

// Varsayılan boyut türü (platform bazında)
const VARSAYILAN_BOYUT = {
  instagram: 'kare',
  facebook: 'yatay',
  twitter: 'yatay',
  pinterest: 'standart',
  youtube: 'thumbnail',
};

/**
 * Cloudinary URL'ini verilen boyuta göre dönüştürür.
 * Örnek: .../upload/v123/... → .../upload/w_1080,h_1080,c_fill/v123/...
 */
function cloudinaryBoyutlandir(url, genislik, yukseklik, mod = 'fill') {
  if (!url || !url.includes('cloudinary.com')) return url;
  const transformasyon = `w_${genislik},h_${yukseklik},c_${mod},f_jpg,q_auto`;
  return url.replace('/upload/', `/upload/${transformasyon}/`);
}

/**
 * Bir görseli tüm platform boyutlarında URL'lere dönüştürür.
 * @param {string} gorselUrl - Cloudinary URL
 * @param {string[]} platformlar - ['instagram','facebook',...]
 * @param {string} boyutTuru - 'kare' | 'dikey' | 'yatay' vb. (geçerli değilse platforma özel varsayılan kullanılır)
 * @returns {{ platform: { url, genislik, yukseklik, etiket } }}
 */
function tumPlatformBoyutlari(gorselUrl, platformlar, boyutTuru) {
  const sonuc = {};

  for (const platform of platformlar) {
    const platBoyutlar = BOYUTLAR[platform];
    if (!platBoyutlar) continue;

    // boyutTuru bu platformda yoksa platforma özel varsayılanı kullan
    const gercekTur = platBoyutlar[boyutTuru] ? boyutTuru : VARSAYILAN_BOYUT[platform];
    const boyut = platBoyutlar[gercekTur];

    sonuc[platform] = {
      url: cloudinaryBoyutlandir(gorselUrl, boyut.genislik, boyut.yukseklik),
      genislik: boyut.genislik,
      yukseklik: boyut.yukseklik,
      etiket: boyut.etiket,
      boyut_turu: gercekTur,
    };
  }

  return sonuc;
}

module.exports = { BOYUTLAR, VARSAYILAN_BOYUT, cloudinaryBoyutlandir, tumPlatformBoyutlari };
