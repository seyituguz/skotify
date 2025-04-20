// server.js
const express = require('express');
const axios = require('axios');
const qs = require('qs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

let access_token = '';
let refresh_token = '';

// 1. Kullanıcıyı Spotify'a yönlendir
app.get('/login', (req, res) => {
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const scope = 'user-read-currently-playing user-read-playback-state';

  const authUrl =
    'https://accounts.spotify.com/authorize?' +
    qs.stringify({
      response_type: 'AQC0TiCsstJNp5MKeagQguv2X2N1S8WRi4BKh1fIg87hkIBaXAsbek98eCl4xq4Yonc19V7yXUEQMSBFqg77kN6fZNLP1yOBYmxNXXSsVK3zQdGd8xKUjy9lGSy4Jw68H2E',
      client_id,
      scope,
      redirect_uri,
    });

  res.redirect(authUrl);
});

// 2. Spotify callback -> token al
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const authOptions = {
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    data: qs.stringify({
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  try {
    const response = await axios(authOptions);
    access_token = response.data.access_token;
    refresh_token = response.data.refresh_token;
    res.send('Spotify bağlantısı başarılı! Şimdi /currently-playing adresine gidebilirsin.');
  } catch (error) {
    console.error(error);
    res.send('Token alınamadı.');
  }
});

// 3. ESP için veri sağla
app.get('/currently-playing', async (req, res) => {
  if (!access_token) return res.status(401).send('Spotify oturumu yok. /login ile giriş yap.');

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (response.status === 204) return res.json({ playing: false });

    const song = response.data;
    const result = {
      name: song.item.name,
      artist: song.item.artists.map((a) => a.name).join(', '),
      album: song.item.album.name,
      image: song.item.album.images[0].url,
      duration_ms: song.item.duration_ms,
      progress_ms: song.progress_ms,
      playing: song.is_playing,
    };

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Spotify verisi alınamadı');
  }
});

app.listen(port, () => {
  console.log(`Spotify Proxy çalışıyor: http://localhost:${port}`);
});
