const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2NTNkYTgxMDJiMDI5NTY4ZjE2ZWY5ZDgzMmVjZjg2OCIsIm5iZiI6MTc3ODY0MzMxMy4xNDMwMDAxLCJzdWIiOiI2YTAzZjE3MThhYzY2NzhhNzYzNzc4ZmIiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.NGAxXmlgY4caz07b-wQk27QMjmQnBi4dZ7oZf_6UdEs';
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

export function img(path, size = 'w500') {
  return path ? `${IMG}/${size}${path}` : null;
}

export function backdrop(path) {
  return path ? `${IMG}/original${path}` : null;
}

// Normalize TMDB result into our app's title shape
function normalize(item, mediaType) {
  const type = mediaType || item.media_type || (item.title ? 'movie' : 'tv');
  return {
    id: item.id,
    tmdbId: item.id,
    imdbId: item.imdb_id || null,
    title: item.title || item.name,
    type,
    genre: (item.genre_ids || []).map(id => GENRE_MAP[id] || 'Other'),
    genreNames: (item.genres || []).map(g => g.name),
    year: (item.release_date || item.first_air_date || '').substring(0, 4),
    rating: item.adult ? 'R' : 'PG-13',
    score: +(item.vote_average || 0).toFixed(1),
    matchScore: Math.floor(65 + (item.vote_average || 5) * 3.5),
    seasons: item.number_of_seasons || null,
    episodes: item.number_of_episodes || null,
    runtime: item.runtime || (item.episode_run_time && item.episode_run_time[0]) || null,
    description: item.overview || '',
    director: '',
    cast: [],
    poster: img(item.poster_path),
    backdrop: backdrop(item.backdrop_path),
    thumbnail: img(item.backdrop_path, 'w780'),
    trailer: '#',
    inMyList: false,
    continueWatching: false,
    progress: 0,
    featured: false,
    language: item.original_language === 'en' ? 'English' : item.original_language || 'English',
    moods: [],
    voteCount: item.vote_count || 0,
    popularity: item.popularity || 0,
  };
}

const GENRE_MAP = {
  28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',
  99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',
  27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',
  10770:'TV Movie',53:'Thriller',10752:'War',37:'Western',
  10759:'Action & Adventure',10762:'Kids',10763:'News',10764:'Reality',
  10765:'Sci-Fi & Fantasy',10766:'Soap',10767:'Talk',10768:'War & Politics',
};

export const REVERSE_GENRE_MAP = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([id, name]) => [name, id])
);

// ── Fetch functions ──

export async function fetchTrending() {
  const data = await get('/trending/all/week?language=en-US&include_adult=false');
  return data.results.map(item => normalize(item));
}

export async function discoverMedia(type, page = 1, genreId = '', sort = 'popularity') {
  const isTV = type === 'shows' || type === 'series' || type === 'filipino' || type === 'kdrama' || type === 'anime' || type === 'tv';
  const endpoint = isTV ? '/discover/tv' : '/discover/movie';
  
  let sortBy = 'popularity.desc';
  if (sort === 'score') sortBy = 'vote_average.desc&vote_count.gte=200';
  else if (sort === 'year') sortBy = isTV ? 'first_air_date.desc' : 'primary_release_date.desc';
  else if (sort === 'title') sortBy = 'original_title.asc'; // For TV it might be original_name, but TMDB handles it generally, or we stick to popularity. TMDB discover sort uses original_title.asc even for TV? Wait, for TV it's usually name.asc. 
  
  // Let's explicitly handle title sorting for TV
  if (sort === 'title') sortBy = isTV ? 'name.asc' : 'original_title.asc';

  let url = `${endpoint}?language=en-US&page=${page}&sort_by=${sortBy}&include_adult=false`;
  
  // 284346=Hentai, 158359=Ecchi, 11094=Adult Animation, 10183=Erotic, 196838=Pornography
  const bannedKeywords = '284346,158359,11094,10183,196838,208362';
  url += `&without_keywords=${bannedKeywords}`;

  if (genreId) url += `&with_genres=${genreId}`;
  if (type === 'filipino') url += `&with_origin_country=PH`;
  if (type === 'kdrama') url += `&with_origin_country=KR`;
  if (type === 'anime') url += `&with_origin_country=JP&with_genres=16&without_genres=10768`;
  
  const data = await get(url);
  return data.results
    .filter(item => {
      const title = (item.title || item.name || '').toLowerCase();
      return !title.includes('overflow') && !title.includes('harem') && !title.includes('ecchi') && !title.includes("sweet agony");
    })
    .map(item => normalize(item, isTV ? 'tv' : 'movie'));
}

export async function fetchPopularMovies() {
  const data = await get('/movie/popular?language=en-US&page=1&include_adult=false');
  return data.results.map(item => normalize(item, 'movie'));
}

export async function fetchTopRatedMovies() {
  const data = await get('/movie/top_rated?language=en-US&page=1&include_adult=false');
  return data.results.map(item => normalize(item, 'movie'));
}

export async function fetchUpcomingMovies() {
  const data = await get('/movie/upcoming?language=en-US&page=1&include_adult=false');
  return data.results.map(item => normalize(item, 'movie'));
}

export async function fetchNowPlayingMovies() {
  const data = await get('/movie/now_playing?language=en-US&page=1&include_adult=false');
  return data.results.map(item => normalize(item, 'movie'));
}

export async function fetchPopularTV() {
  const data = await get('/tv/popular?language=en-US&page=1&include_adult=false');
  return data.results.map(item => normalize(item, 'tv'));
}

export async function fetchTopRatedTV() {
  const data = await get('/tv/top_rated?language=en-US&page=1&include_adult=false');
  return data.results.map(item => normalize(item, 'tv'));
}

export async function fetchAiringTodayTV() {
  const data = await get('/tv/airing_today?language=en-US&page=1&include_adult=false');
  return data.results.map(item => normalize(item, 'tv'));
}

export async function fetchGenreMovies(genreId) {
  const data = await get(`/discover/movie?language=en-US&sort_by=popularity.desc&with_genres=${genreId}&page=1&include_adult=false`);
  return data.results.map(item => normalize(item, 'movie'));
}

export async function fetchFilipinoMedia() {
  // Fetch popular TV shows/movies from the Philippines
  const data = await get('/discover/tv?language=en-US&sort_by=popularity.desc&with_origin_country=PH&page=1&include_adult=false');
  return data.results.map(item => normalize(item, 'tv'));
}

export async function fetchKDrama() {
  const data = await get('/discover/tv?language=en-US&sort_by=popularity.desc&with_origin_country=KR&page=1&include_adult=false');
  return data.results.map(item => normalize(item, 'tv'));
}

export async function fetchAnime() {
  const data = await get('/discover/tv?language=en-US&sort_by=popularity.desc&with_origin_country=JP&with_genres=16&page=1&include_adult=false&without_genres=10768&without_keywords=284346,158359,11094,10183,196838,208362'); 
  return data.results
    .filter(item => {
      const title = (item.title || item.name || '').toLowerCase();
      return !title.includes('overflow') && !title.includes('harem') && !title.includes('ecchi') && !title.includes("sweet agony");
    })
    .map(item => normalize(item, 'tv'));
}

export async function fetchMovieDetails(id) {
  const data = await get(`/movie/${id}?language=en-US&append_to_response=credits`);
  const norm = normalize(data, 'movie');
  norm.genreNames = (data.genres || []).map(g => g.name);
  norm.director = data.credits?.crew?.find(c => c.job === 'Director')?.name || '';
  norm.cast = (data.credits?.cast || []).slice(0, 6).map(c => c.name);
  norm.runtime = data.runtime;
  norm.imdbId = data.imdb_id;
  return norm;
}

export async function fetchTVDetails(id) {
  const data = await get(`/tv/${id}?language=en-US&append_to_response=credits`);
  const norm = normalize(data, 'tv');
  norm.genreNames = (data.genres || []).map(g => g.name);
  norm.director = (data.created_by || []).map(c => c.name).join(', ') || '';
  norm.cast = (data.credits?.cast || []).slice(0, 6).map(c => c.name);
  norm.seasons = data.number_of_seasons;
  norm.episodes = data.number_of_episodes;
  norm.seasonsData = (data.seasons || []).filter(s => s.season_number > 0);
  return norm;
}

export async function fetchTVSeasonEpisodes(tvId, seasonNumber) {
  const data = await get(`/tv/${tvId}/season/${seasonNumber}?language=en-US`);
  return (data.episodes || []).map(ep => ({
    num: ep.episode_number,
    title: ep.name,
    dur: ep.runtime ? `${ep.runtime}m` : '—',
    desc: ep.overview || '',
    thumb: img(ep.still_path, 'w300'),
    airDate: ep.air_date,
  }));
}

export async function searchMulti(query, includeAdult = false) {
  if (!query || query.trim().length < 2) return [];
  const data = await get(`/search/multi?language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=${includeAdult}`);
  return data.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv').map(item => normalize(item));
}

// ── Embed URLs ──
export const PROVIDERS = [
  { id: 'videasy', name: 'VidEasy (Default)', base: 'https://player.videasy.net' },
  { id: 'vidsrc', name: 'VidSrc', base: 'https://vidsrc.to/embed' },
  { id: 'vidking', name: 'VidKing', base: 'https://www.vidking.net/embed' },
  { id: 'vidphantom', name: 'VidPhantom', base: 'https://vidphantom.com' },
  { id: 'zenith', name: 'Zenith', base: 'https://movie-scraper-sooty.vercel.app' },
];

export function getMovieEmbedUrl(tmdbId, provider = 'videasy') {
  if (provider === 'videasy') return `https://player.videasy.net/movie/${tmdbId}?color=e50914&overlay=true`;
  if (provider === 'vidsrc') return `https://vidsrc.to/embed/movie/${tmdbId}`;
  if (provider === 'vidking') return `https://www.vidking.net/embed/movie/${tmdbId}?color=e50914&autoPlay=true`;
  if (provider === 'vidphantom') return `https://vidphantom.com/movie/${tmdbId}?primaryColor=e50914&accentColor=e50914&autoplay=true&nextbutton=true`;
  if (provider === 'zenith') return `https://movie-scraper-sooty.vercel.app/?id=${tmdbId}`;
  return `https://player.videasy.net/movie/${tmdbId}?color=e50914&overlay=true`;
}

export function getTVEmbedUrl(tmdbId, season, episode, provider = 'videasy') {
  if (provider === 'videasy') {
    const baseParams = 'color=e50914&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true&overlay=true';
    if (season && episode) return `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}?${baseParams}`;
    return `https://player.videasy.net/tv/${tmdbId}?${baseParams}`;
  }
  if (provider === 'vidsrc') {
    if (season && episode) return `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
    return `https://vidsrc.to/embed/tv/${tmdbId}`;
  }
  if (provider === 'vidking') {
    const params = '?color=e50914&autoPlay=true&nextEpisode=true&episodeSelector=true';
    if (season && episode) return `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}${params}`;
    return `https://www.vidking.net/embed/tv/${tmdbId}${params}`;
  }
  if (provider === 'vidphantom') {
    const params = '?primaryColor=e50914&accentColor=e50914&autoplay=true&nextbutton=true';
    if (season && episode) return `https://vidphantom.com/tv/${tmdbId}/${season}/${episode}${params}`;
    return `https://vidphantom.com/tv/${tmdbId}${params}`;
  }
  if (provider === 'zenith') {
    if (season && episode) return `https://movie-scraper-sooty.vercel.app/?id=${tmdbId}&s=${season}&e=${episode}`;
    return `https://movie-scraper-sooty.vercel.app/?id=${tmdbId}`;
  }
  
  return `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}?color=e50914`;
}
