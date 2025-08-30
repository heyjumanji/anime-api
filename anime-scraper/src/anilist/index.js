import axios from 'axios';

const ANILIST_API_URL = 'https://graphql.anilist.co';

async function searchAnime(title) {
  const query = `
    query ($search: String!) {
      Page {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
        }
      }
    }
  `;

  const variables = {
    search: title,
  };

  try {
    const response = await axios.post(ANILIST_API_URL, {
      query,
      variables,
    });

    return response.data.data.Page.media;
  } catch (error) {
    console.error('Error searching for anime:', error);
    return [];
  }
}

async function getAnimeById(id) {
  const query = `
    query ($id: Int!) {
      Media (id: $id, type: ANIME) {
        id
        title {
          romaji
          english
          native
        }
      }
    }
  `;

  const variables = {
    id: id,
  };

  try {
    const response = await axios.post(ANILIST_API_URL, {
      query,
      variables,
    });

    return response.data.data.Media;
  } catch (error) {
    console.error('Error getting anime by ID:', error);
    return null;
  }
}


export { searchAnime, getAnimeById };
