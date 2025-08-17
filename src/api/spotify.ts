import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// Node 18+ has global fetch
const app = express();
app.use(cors());

async function getToken() {
  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  if (!id || !secret) throw new Error('Missing SPOTIFY_CLIENT_ID/SECRET');

  const creds = `${id}:${secret}`;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(creds).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  if (!res.ok) throw new Error(`Token error ${res.status}`);
  return res.json() as Promise<{ access_token: string }>;
}

app.get('/playlist', async (req, res) => {
  try {
    const playlistId = (req.query.playlistId as string) || process.env.SPOTIFY_PLAYLIST_ID!;
    if (!playlistId) throw new Error('Missing playlistId');

    const { access_token } = await getToken();
    const plRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?market=US`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!plRes.ok) throw new Error(`Playlist error ${plRes.status}`);
    const data = await plRes.json() as { tracks?: { items?: any[] } };

    const items = (data.tracks?.items || []).map((it: any) => it.track).filter(Boolean);
    const tracks = items
      .filter((t: any) => !!t.preview_url)
      .map((t: any, i: number) => ({
        id: i,
        title: `${t.name} — ${t.artists?.map((a: any) => a.name).join(', ')}`,
        file: t.preview_url as string,
      }));

    res.json({ tracks });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Unknown error' });
  }
});

app.get('/health', (_req, res) => res.send('ok'));

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => console.log(`Spotify proxy on http://localhost:${port}`));