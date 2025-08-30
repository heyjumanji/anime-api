import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAnimeById } from './anilist/index.js';
import { extractStreamingInfo } from './scrapers/streamInfo.extractor.js';
import extractSearchResults from './scrapers/search.extractor.js';
import extractEpisodesList from './scrapers/episodeList.extractor.js';
import getAnilistId from './scrapers/getAnilistId.extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.redirect('/docs.html');
});

async function getHianimeId(anilistId) {
  const anime = await getAnimeById(anilistId);
  if (!anime) {
    throw new Error('Anime not found on AniList');
  }

  const animeTitle = anime.title.romaji;
  const [_, searchResults] = await extractSearchResults({ keyword: animeTitle });

  if (searchResults.length === 0) {
    throw new Error('Anime not found on hianime.do');
  }

  for (const result of searchResults) {
    const foundAnilistId = await getAnilistId(result.id);
    if (foundAnilistId == anilistId) {
      return result.id;
    }
  }

  throw new Error('Could not find a matching anime on hianime.do');
}

app.get('/api/stream', async (req, res) => {
  const { anilistId, episode, server, type } = req.query;

  if (!anilistId || !episode || !server || !type) {
    return res.status(400).json({
      error: 'Missing required query parameters: anilistId, episode, server, type',
    });
  }

  try {
    const hianimeId = await getHianimeId(anilistId);
    const episodesData = await extractEpisodesList(hianimeId);

    const requestedEpisode = episodesData.episodes.find(
      (e) => e.episode_no === parseInt(episode)
    );

    if (!requestedEpisode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const streamingInfo = await extractStreamingInfo(requestedEpisode.id, server, type, false);

    res.json(streamingInfo);
  } catch (error) {
    console.error('Error getting stream:', error);
    res.status(500).json({ error: 'Failed to get stream' });
  }
});

app.get('/api/embed', async (req, res) => {
  const { anilistId, episode, server, type } = req.query;

  if (!anilistId || !episode || !server || !type) {
    return res.status(400).json({
      error: 'Missing required query parameters: anilistId, episode, server, type',
    });
  }

  try {
    const hianimeId = await getHianimeId(anilistId);
    const episodesData = await extractEpisodesList(hianimeId);

    const requestedEpisode = episodesData.episodes.find(
      (e) => e.episode_no === parseInt(episode)
    );

    if (!requestedEpisode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const streamingInfo = await extractStreamingInfo(requestedEpisode.id, server, type, false);
    const m3u8Url = streamingInfo.streamingLink.link.file;

    res.redirect(`/player.html?src=${encodeURIComponent(m3u8Url)}`);
  } catch (error) {
    console.error('Error getting embed:', error);
    res.status(500).json({ error: 'Failed to get embed' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
