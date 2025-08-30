import { getAnimeById } from './anilist/index.js';
import extractSearchResults from './scrapers/search.extractor.js';
import extractEpisodesList from './scrapers/episodeList.extractor.js';
import { extractStreamingInfo, extractServers } from './scrapers/streamInfo.extractor.js';
import getAnilistId from './scrapers/getAnilistId.extractor.js';

async function getHianimeIdFromAnilistId(anilistId) {
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


async function runTests() {
  console.log('Running tests...');
  const anilistId = 1; // Cowboy Bebop

  // Test 1: Get hianime.do ID from AniList ID
  console.log(`Test 1: Get hianime.do ID for AniList ID ${anilistId}`);
  const hianimeId = await getHianimeIdFromAnilistId(anilistId);
  if (hianimeId) {
    console.log('  Success: Found hianime.do ID:', hianimeId);
  } else {
    console.error('  Failure: Could not find hianime.do ID.');
  }
  console.log('--------------------');

  // Test 2: Get episode list
  if (hianimeId) {
    console.log(`Test 2: Get episode list for ${hianimeId}`);
    const episodesData = await extractEpisodesList(hianimeId);
    if (episodesData.episodes.length > 0) {
      console.log('  Success: Found', episodesData.totalEpisodes, 'episodes.');
      console.log('  First episode:', episodesData.episodes[0].title);
    } else {
      console.error('  Failure: Could not get episodes.');
    }
    console.log('--------------------');

    // Test 3: Get streaming info
    if (episodesData.episodes.length > 0) {
      const episodeId = episodesData.episodes[0].id;
      const episodeNumber = episodesData.episodes[0].episode_no;
      console.log(`Test 3: Get streaming info for episode ${episodeNumber} (ID: ${episodeId})`);

      const servers = await extractServers(episodeId.split("?ep=").pop());
      console.log('  Available servers:', servers.map(s => s.serverName));

      const streamingInfo = await extractStreamingInfo(episodeId, 'HD-1', 'sub', false);
      if (streamingInfo && streamingInfo.streamingLink && streamingInfo.streamingLink.link && streamingInfo.streamingLink.link.file) {
        console.log('  Success: Got streaming link.');
        console.log('  Link:', streamingInfo.streamingLink.link.file);
      } else {
        console.error('  Failure: Could not get streaming info for HD-1.');

        const otherServer = servers.find(s => s.serverName.toLowerCase() !== 'hd-1');
        if (otherServer) {
          console.log(`  Trying another server: ${otherServer.serverName}`);
          const otherStreamingInfo = await extractStreamingInfo(episodeId, otherServer.serverName, otherServer.type, false);
          if (otherStreamingInfo && otherStreamingInfo.streamingLink && otherStreamingInfo.streamingLink.link && otherStreamingInfo.streamingLink.link.file) {
            console.log('  Success: Got streaming link from other server.');
            console.log('  Link:', otherStreamingInfo.streamingLink.link.file);
          } else {
            console.error('  Failure: Could not get streaming info from other server either.');
          }
        }
      }
      console.log('--------------------');
    }
  }
}

runTests();
