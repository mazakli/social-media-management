const https = require('https');

const GRAPH_API = 'https://graph.facebook.com/v19.0';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
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
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// OAuth URL oluştur
function oauthUrl(redirectUri) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: redirectUri,
    scope: 'pages_manage_posts,pages_read_engagement,publish_to_groups,instagram_basic,instagram_content_publish,pages_show_list',
    response_type: 'code',
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
}

// Code → token
async function tokenAl(code, redirectUri) {
  const url = `${GRAPH_API}/oauth/access_token?client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
  const kisaToken = await httpGet(url);
  if (kisaToken.error) throw new Error(kisaToken.error.message);

  // Uzun ömürlü token al
  const uzunUrl = `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${kisaToken.access_token}`;
  const uzunToken = await httpGet(uzunUrl);
  if (uzunToken.error) throw new Error(uzunToken.error.message);

  return uzunToken;
}

// Bağlı sayfaları listele
async function sayfalariGetir(userToken) {
  const url = `${GRAPH_API}/me/accounts?access_token=${userToken}`;
  const sonuc = await httpGet(url);
  if (sonuc.error) throw new Error(sonuc.error.message);
  return sonuc.data || [];
}

// Kullanıcı bilgisi
async function kullaniciBilgi(token) {
  const url = `${GRAPH_API}/me?fields=id,name,picture&access_token=${token}`;
  const sonuc = await httpGet(url);
  if (sonuc.error) throw new Error(sonuc.error.message);
  return sonuc;
}

// Sayfaya post paylaş
async function postPaylas(sayfaId, sayfaToken, { metin, gorselUrl, linkUrl }) {
  const body = { message: metin, access_token: sayfaToken };
  if (gorselUrl) body.url = gorselUrl;
  if (linkUrl) body.link = linkUrl;

  const endpoint = gorselUrl
    ? `${GRAPH_API}/${sayfaId}/photos`
    : `${GRAPH_API}/${sayfaId}/feed`;

  const sonuc = await httpPost(endpoint, body);
  if (sonuc.error) throw new Error(sonuc.error.message);
  return { id: sonuc.id || sonuc.post_id, platform_url: `https://www.facebook.com/${sonuc.id || sonuc.post_id}` };
}

module.exports = { oauthUrl, tokenAl, sayfalariGetir, kullaniciBilgi, postPaylas };
