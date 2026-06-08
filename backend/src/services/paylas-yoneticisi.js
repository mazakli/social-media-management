const pool = require('../db/pool');
const { tumPlatformBoyutlari } = require('./gorsel-boyutlandir');
const facebook = require('./platform/facebook');
const instagram = require('./platform/instagram');
const twitter = require('./platform/twitter');
const pinterest = require('./platform/pinterest');
const youtube = require('./platform/youtube');

// Token süresi dolduysa yenile
async function tokenKontrol(hesap) {
  if (!hesap.token_bitis) return hesap;
  const bitis = new Date(hesap.token_bitis);
  const simdi = new Date();
  if (bitis > simdi) return hesap;

  let yeniToken;
  try {
    if (hesap.platform === 'twitter' && hesap.yenileme_token) {
      yeniToken = await twitter.tokenYenile(hesap.yenileme_token);
    } else if (hesap.platform === 'pinterest' && hesap.yenileme_token) {
      yeniToken = await pinterest.tokenYenile(hesap.yenileme_token);
    } else if (hesap.platform === 'youtube' && hesap.yenileme_token) {
      yeniToken = await youtube.tokenYenile(hesap.yenileme_token);
    } else {
      return hesap;
    }

    if (yeniToken?.access_token) {
      const bitis = new Date(Date.now() + (yeniToken.expires_in || 7200) * 1000);
      await pool.query(
        'UPDATE sm_hesaplar SET erisim_token=$1, token_bitis=$2, guncellendi=NOW() WHERE id=$3',
        [yeniToken.access_token, bitis, hesap.id]
      );
      return { ...hesap, erisim_token: yeniToken.access_token };
    }
  } catch (err) {
    console.error(`Token yenileme hatası (${hesap.platform}):`, err.message);
  }
  return hesap;
}

// Tek bir post'u verilen platformlara gönder
async function postGonder(postId) {
  const { rows: [post] } = await pool.query('SELECT * FROM sm_postlar WHERE id=$1', [postId]);
  if (!post) throw new Error('Post bulunamadı');

  // Seçilen platformların hesaplarını çek
  const { rows: hesaplar } = await pool.query(
    'SELECT * FROM sm_hesaplar WHERE marka_id=$1 AND platform=ANY($2) AND aktif=true',
    [post.marka_id, post.platformlar]
  );

  // Görsel boyutlarını hesapla
  const boyutlar = post.gorsel_url
    ? tumPlatformBoyutlari(post.gorsel_url, post.platformlar, post.boyut_turu)
    : {};

  const sonuclar = { ...post.platform_sonuclar };

  for (const hesap of hesaplar) {
    const guncelHesap = await tokenKontrol(hesap);
    const gorselUrl = boyutlar[hesap.platform]?.url || post.gorsel_url;

    try {
      let sonuc;

      if (hesap.platform === 'facebook') {
        sonuc = await facebook.postPaylas(hesap.sayfa_id, hesap.erisim_token, {
          metin: post.metin,
          gorselUrl,
          linkUrl: post.link_url,
        });

      } else if (hesap.platform === 'instagram') {
        sonuc = await instagram.gorselPostPaylas(hesap.hesap_id, hesap.erisim_token, {
          gorselUrl,
          metin: post.metin,
          hashtag: post.hashtag,
        });

      } else if (hesap.platform === 'twitter') {
        sonuc = await twitter.tweetPaylas(guncelHesap.erisim_token, {
          metin: post.metin,
          gorselUrl,
          hashtag: post.hashtag,
        });

      } else if (hesap.platform === 'pinterest') {
        const ekstra = hesap.ekstra || {};
        sonuc = await pinterest.pinOlustur(guncelHesap.erisim_token, {
          boardId: ekstra.varsayilan_board_id,
          gorselUrl,
          baslik: post.baslik,
          metin: post.metin,
          linkUrl: post.link_url,
        });

      } else if (hesap.platform === 'youtube') {
        sonuc = await youtube.oynatmaListesiOlustur(guncelHesap.erisim_token, {
          baslik: post.baslik,
          metin: post.metin,
        });
      }

      sonuclar[hesap.platform] = { basarili: true, ...sonuc, gorsel_url: gorselUrl };

    } catch (err) {
      sonuclar[hesap.platform] = { basarili: false, hata: err.message };
    }
  }

  // Sonuçları kaydet
  const hepsiBasarili = post.platformlar.every(p => sonuclar[p]?.basarili);
  const biriBile = post.platformlar.some(p => sonuclar[p]?.basarili);
  const yeniDurum = hepsiBasarili ? 'yayinda' : biriBile ? 'kismi' : 'basarisiz';

  await pool.query(
    'UPDATE sm_postlar SET durum=$1, platform_sonuclar=$2, guncellendi=NOW() WHERE id=$3',
    [yeniDurum, JSON.stringify(sonuclar), postId]
  );

  return { durum: yeniDurum, sonuclar };
}

// Zamanlı post'ları kontrol et ve gönder
async function zamanliPostlariIsle() {
  const { rows } = await pool.query(
    "SELECT id FROM sm_postlar WHERE durum='zamanlandi' AND zamanla <= NOW()"
  );
  for (const post of rows) {
    try {
      await postGonder(post.id);
    } catch (err) {
      await pool.query(
        "UPDATE sm_postlar SET durum='basarisiz', hata_log=$1 WHERE id=$2",
        [err.message, post.id]
      );
    }
  }
}

module.exports = { postGonder, zamanliPostlariIsle };
