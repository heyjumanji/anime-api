// File: anime-api/src/extractors/source2.extractor.js

import axios from "axios";
import cheerio from "cheerio";

const gogoanime = "https://anitaku.to";
const axiosInstance = axios.create({ timeout: 5000 });

async function findAnimeOnSource2(animeTitle) {
  try {
    const { data } = await axiosInstance.get(`${gogoanime}/search.html`, { params: { keyword: animeTitle } });
    const $ = cheerio.load(data);
    return $("ul.items li").first().find("div.img a").attr("href")?.slice(10) || null;
  } catch (error) {
    console.error("Source 2 Stability: Failed to find anime.", error.message);
    return null;
  }
}

async function getEpisodeIdFromSource2(source2AnimeId, episodeNum) {
    try {
        const { data } = await axiosInstance.get(`${gogoanime}/category/${source2AnimeId}`);
        const $ = cheerio.load(data);
        const lastEp = $("#episode_page a.active").attr("ep_end");
        if (!lastEp) return null;
        const animeId = $("#movie_id").attr("value");
        if (!animeId) return null;
        const { data: episodesData } = await axiosInstance.get(
            `https://ajax.gogo-load.com/ajax/load-list-episode`,
            { params: { ep_start: 1, ep_end: lastEp, id: animeId } }
        );
        const $$ = cheerio.load(episodesData);
        let episodeId = null;
        $$("#episode_related a").each((i, el) => {
            const epNumFromSource2 = $$(el).find(".name").text()?.replace("EP ", "");
            if (epNumFromSource2 && epNumFromSource2 == episodeNum) {
                episodeId = $$(el).attr("href")?.slice(1).trim() || null;
                return false;
            }
        });
        return episodeId;
    } catch (error) {
        console.error("Source 2 Stability: Failed to find episode.", error.message);
        return null;
    }
}

async function extractStreamUrl(iframeUrl) {
    try {
        const { data } = await axiosInstance.get(iframeUrl);
        const match = data.match(/sources:\s*\[\s*\{[^\]]+\}\s*\]/);
        if (match) {
            const sanitizedJson = match[0].replace(/'/g, '"').replace(/,(\s*\])/, '$1');
            const sources = JSON.parse(sanitizedJson.split('sources:')[1].trim());
            return sources[0]?.file || null;
        }
        return null;
    } catch (error) {
        console.error("Source 2 Stability: Failed to extract stream URL.", error.message);
        return null;
    }
}

export async function getM3U8Streams(animeTitle, episodeNum) {
    try {
        const source2AnimeId = await findAnimeOnSource2(animeTitle);
        if (!source2AnimeId) return [];
        const source2EpisodeId = await getEpisodeIdFromSource2(source2AnimeId, episodeNum);
        if (!source2EpisodeId) return [];
        const { data } = await axiosInstance.get(`${gogoanime}/${source2EpisodeId}`);
        const $ = cheerio.load(data);
        const serverPromises = $(".anime_muti_link ul li a").map(async (i, el) => {
            const iframeUrl = $(el).attr("data-video");
            return iframeUrl ? await extractStreamUrl(iframeUrl) : null;
        }).get();
        const resolvedStreams = await Promise.all(serverPromises);
        return resolvedStreams.filter(stream => stream !== null);
    } catch (error) {
        console.error("Source 2 Stability: A critical error occurred.", error.message);
        return [];
    }
}
