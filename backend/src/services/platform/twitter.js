const https = require('https');
const crypto = require('crypto');

const API_BASE = 'https://api.twitter.com';

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.get({ hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers },
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

// OAuth 2.0 PKCE — code verifier üret
function codeVerifierUret() {
  return crypto.randomBytes(32).toString('base64url');
}

function codeChallengeUret(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// OAuth URL oluştur
function oauthUrl(redirectUri, state, codeVerifier) {
  const codeChallenge = codeChallengeUret(codeVerifier);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${API_BASE}/2/oauth2/authorize?${params}`;
}

// Code → token
async function tokenAl(code, redirectUri, codeVerifier) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: process.env.TWITTER_CLIENT_ID,
  });

  const basicAuth = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64');
  const payload = params.toString();
  const parsed = new URL(`${API_BASE}/2/oauth2/token`);

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
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.TWITTER_CLIENT_ID,
  });
  const basicAuth = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64');
  const payload = params.toString();
  const parsed = new URL(`${API_BASE}/2/oauth2/token`);

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

// Kullanıcı bilgisi
async function kullaniciBilgi(accessToken) {
  const sonuc = await httpGet(`${API_BASE}/2/users/me?user.fields=profile_image_url,name,username`, {
    Authorization: `Bearer ${accessToken}`,
  });
  if (sonuc.errors) throw new Error(sonuc.errors[0].message);
  return sonuc.data;
}

// Tweet paylaş (görsel URL ile — Twitter önce medya yükleme ister ama URL paylaşımı için metin içine link eklenir)
async function tweetPaylas(accessToken, { metin, gorselUrl, hashtag }) {
  const tamMetin = [metin, hashtag, gorselUrl].filter(Boolean).join('\n').slice(0, 280);
  const sonuc = await httpPost(`${API_BASE}/2/tweets`, { text: tamMetin }, { Authorization: `Bearer ${accessToken}` });
  if (sonuc.errors) throw new Error(sonuc.errors[0].message);
  return { id: sonuc.data.id, platform_url: `https://twitter.com/i/web/status/${sonuc.data.id}` };
}

module.exports = { oauthUrl, tokenAl, tokenYenile, kullaniciBilgi, tweetPaylas, codeVerifierUret };
