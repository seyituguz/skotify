// server.js
const express = require('express');
const axios = require('axios');
const qs = require('qs');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

app.get('/', (req, res) => {
  res.send(`<a href="/login">Login with Spotify</a>`);
});

app.get('/login', (req, res) => {
  const scope = 'user-read-currently-playing';
  const authUrl =
    'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
    }).toString();

  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    qs.stringify({
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
    {
      headers: {
        'Authorization':
          'Basic ' +
          Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const access_token = response.data.access_token;

  res.redirect(`/currently-playing?access_token=${access_token}`);
});

app.get('/currently-playing', async (req, res) => {
  const token = req.query.access_token;
  try {
    const data = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: 'Bearer ' + token },
    });
    res.json(data.data);
  } catch (err) {
    res.status(500).send('Spotify data fetch error.');
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
