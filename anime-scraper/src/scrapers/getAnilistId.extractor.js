import axios from "axios";
import * as cheerio from "cheerio";
import { v1_base_url } from "../utils/base_v1.js";

async function getAnilistId(hianimeId) {
  try {
    const resp = await axios.get(`https://${v1_base_url}/${hianimeId}`);
    const $ = cheerio.load(resp.data);
    const syncDataScript = $("#syncData").html();
    let anilistId = null;

    if (syncDataScript) {
      try {
        const syncData = JSON.parse(syncDataScript);
        anilistId = syncData.anilist_id || null;
      } catch (error) {
        console.error("Error parsing syncData:", error);
      }
    }

    return anilistId;
  } catch (e) {
    console.error("Error extracting AniList ID:", e);
    return null;
  }
}

export default getAnilistId;
