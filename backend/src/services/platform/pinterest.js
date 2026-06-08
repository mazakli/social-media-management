const https = require('https');

const API_BASE = 'https://api.pinterest.com/v5';

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
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${accessToken}`,
      },
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

// OAuth URL
function oauthUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: process.env.PINTEREST_APP_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'boards:read,boards:write,pins:read,pins:write',
    state,
  });
  return `https://www.pinterest.com/oauth/?${params}`;
}

// Code → token
async function tokenAl(code, redirectUri) {
  const params = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
  const basicAuth = Buffer.from(`${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`).toString('base64');
  const payload = params.toString();
  const parsed = new URL(`${API_BASE}/oauth/token`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Basic ${basicAuth}`,
      },
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

// Token yenile
async function tokenYenile(refreshToken) {
  const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const basicAuth = Buffer.from(`${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`).toString('base64');
  const payload = params.toString();
  const parsed = new URL(`${API_BASE}/oauth/token`);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(payload), 'Authorization': `Basic ${basicAuth}` },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Kullanıcı bilgisi
async function kullaniciBilgi(accessToken) {
  const sonuc = await httpGet(`${API_BASE}/user_account`, accessToken);
  if (sonuc.code) throw new Error(sonuc.message);
  return sonuc;
}

// Board listesi
async function boardlariGetir(accessToken) {
  const sonuc = await httpGet(`${API_BASE}/boards?page_size=50`, accessToken);
  if (sonuc.code) throw new Error(sonuc.message);
  return sonuc.items || [];
}

// Pin oluştur
async function pinOlustur(accessToken, { boardId, gorselUrl, baslik, metin, linkUrl }) {
  const sonuc = await httpPost(`${API_BASE}/pins`, {
    board_id: boardId,
    media_source: { source_type: 'image_url', url: gorselUrl },
    title: baslik,
    description: metin,
    link: linkUrl || undefined,
  }, accessToken);
  if (sonuc.code) throw new Error(sonuc.message);
  return { id: sonuc.id, platform_url: `https://www.pinterest.com/pin/${sonuc.id}/` };
}

module.exports = { oauthUrl, tokenAl, tokenYenile, kullaniciBilgi, boardlariGetir, pinOlustur };
