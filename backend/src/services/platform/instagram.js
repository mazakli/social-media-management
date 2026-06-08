const https = require('https');

const GRAPH_API = 'https://graph.facebook.com/v19.0';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Facebook Sayfasına bağlı Instagram Business hesabını bul
async function igHesabiBul(sayfaId, sayfaToken) {
  const url = `${GRAPH_API}/${sayfaId}?fields=instagram_business_account&access_token=${sayfaToken}`;
  const sonuc = await httpGet(url);
  if (sonuc.error) throw new Error(sonuc.error.message);
  if (!sonuc.instagram_business_account) throw new Error('Bu sayfaya bağlı Instagram Business hesabı bulunamadı. Hesabınızı Meta Business Manager\'dan bağlayın.');
  return sonuc.instagram_business_account.id;
}

// IG hesap bilgisi
async function igBilgi(igUserId, sayfaToken) {
  const url = `${GRAPH_API}/${igUserId}?fields=id,name,username,profile_picture_url,followers_count&access_token=${sayfaToken}`;
  const sonuc = await httpGet(url);
  if (sonuc.error) throw new Error(sonuc.error.message);
  return sonuc;
}

// Görsel post (Feed)
async function gorselPostPaylas(igUserId, sayfaToken, { gorselUrl, metin, hashtag }) {
  const tamMetin = [metin, hashtag].filter(Boolean).join('\n\n');

  // 1. Medya container oluştur
  const container = await httpPost(`${GRAPH_API}/${igUserId}/media`, {
    image_url: gorselUrl,
    caption: tamMetin,
    access_token: sayfaToken,
  });
  if (container.error) throw new Error(container.error.message);

  // Containerın hazır olmasını bekle (max 30sn)
  await bekle(3000);
  let kontrol = await httpGet(`${GRAPH_API}/${container.id}?fields=status_code&access_token=${sayfaToken}`);
  let deneme = 0;
  while (kontrol.status_code === 'IN_PROGRESS' && deneme < 10) {
    await bekle(3000);
    kontrol = await httpGet(`${GRAPH_API}/${container.id}?fields=status_code&access_token=${sayfaToken}`);
    deneme++;
  }
  if (kontrol.status_code === 'ERROR') throw new Error('Instagram medya işleme hatası');

  // 2. Yayınla
  const yayinla = await httpPost(`${GRAPH_API}/${igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: sayfaToken,
  });
  if (yayinla.error) throw new Error(yayinla.error.message);

  return { id: yayinla.id, platform_url: `https://www.instagram.com/p/${yayinla.id}/` };
}

// Story paylaş
async function storyPaylas(igUserId, sayfaToken, { gorselUrl }) {
  const container = await httpPost(`${GRAPH_API}/${igUserId}/media`, {
    image_url: gorselUrl,
    media_type: 'STORIES',
    access_token: sayfaToken,
  });
  if (container.error) throw new Error(container.error.message);
  await bekle(3000);

  const yayinla = await httpPost(`${GRAPH_API}/${igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: sayfaToken,
  });
  if (yayinla.error) throw new Error(yayinla.error.message);
  return { id: yayinla.id };
}

// Highlight oluştur
async function highlightOlustur(igUserId, sayfaToken, { baslik, storyMediaId, kapakMediaId }) {
  const body = {
    title: baslik,
    access_token: sayfaToken,
  };
  if (storyMediaId) body.media_ids = [storyMediaId];
  if (kapakMediaId) body.cover_media = { media_id: kapakMediaId };

  const sonuc = await httpPost(`${GRAPH_API}/${igUserId}/highlights`, body);
  if (sonuc.error) throw new Error(sonuc.error.message);
  return sonuc;
}

// Mevcut highlight'ları listele
async function highlightlariGetir(igUserId, sayfaToken) {
  const url = `${GRAPH_API}/${igUserId}/highlights?fields=id,title,cover_media&access_token=${sayfaToken}`;
  const sonuc = await httpGet(url);
  if (sonuc.error) throw new Error(sonuc.error.message);
  return sonuc.data || [];
}

// Highlight'a story ekle
async function highlightaStoryEkle(highlightId, sayfaToken, storyMediaId) {
  const sonuc = await httpPost(`${GRAPH_API}/${highlightId}`, {
    media_ids: [storyMediaId],
    access_token: sayfaToken,
  });
  if (sonuc.error) throw new Error(sonuc.error.message);
  return sonuc;
}

function bekle(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { igHesabiBul, igBilgi, gorselPostPaylas, storyPaylas, highlightOlustur, highlightlariGetir, highlightaStoryEkle };
