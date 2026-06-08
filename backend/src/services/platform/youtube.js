const https = require('https');

const API_BASE = 'https://www.googleapis.com';

function httpGet(url, accessToken) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.get({ hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers: { Authorization: `Bearer ${accessToken}` } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function httpPost(url, body, accessToken) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), Authorization: `Bearer ${accessToken}` },
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

// OAuth URL (Google)
function oauthUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Code → token
async function tokenAl(code, redirectUri) {
  const body = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  };
  return httpPost('https://oauth2.googleapis.com/token', body, null);
}

// Token yenile
async function tokenYenile(refreshToken) {
  const body = {
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
  };
  return httpPost('https://oauth2.googleapis.com/token', body, null);
}

// Kanal bilgisi
async function kanalBilgi(accessToken) {
  const sonuc = await httpGet(`${API_BASE}/youtube/v3/channels?part=snippet,statistics&mine=true`, accessToken);
  if (sonuc.error) throw new Error(sonuc.error.message);
  const kanal = sonuc.items?.[0];
  if (!kanal) throw new Error('YouTube kanalı bulunamadı');
  return {
    id: kanal.id,
    adi: kanal.snippet.title,
    profil_resim: kanal.snippet.thumbnails?.default?.url,
    abone_sayisi: kanal.statistics?.subscriberCount,
  };
}

// Community post (YouTube Community - sadece belirli hesaplarda var)
// YouTube Data API v3 ile doğrudan community post yayınlamak mümkün değil
// Bunun yerine video thumbnail güncelleme veya video açıklama güncelleme yapılabilir
// Bu fonksiyon channel section / playlist yönetimi için:
async function oynatmaListesiOlustur(accessToken, { baslik, metin }) {
  const sonuc = await httpPost(
    `${API_BASE}/youtube/v3/playlists?part=snippet,status`,
    {
      snippet: { title: baslik, description: metin },
      status: { privacyStatus: 'public' },
    },
    accessToken
  );
  if (sonuc.error) throw new Error(sonuc.error.message);
  return { id: sonuc.id, platform_url: `https://www.youtube.com/playlist?list=${sonuc.id}` };
}

// Video bilgisi getir (thumbnail güncellemek için)
async function videolariGetir(accessToken, maxResults = 10) {
  const sonuc = await httpGet(
    `${API_BASE}/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=${maxResults}&order=date`,
    accessToken
  );
  if (sonuc.error) throw new Error(sonuc.error.message);
  return sonuc.items || [];
}

module.exports = { oauthUrl, tokenAl, tokenYenile, kanalBilgi, oynatmaListesiOlustur, videolariGetir };
