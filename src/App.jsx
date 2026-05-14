import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// ── Cloud sync helper ──
const API_BASE = '/api';
let syncTimer = null;
function syncToCloud(username, myList, watchHistory) {
  if (!username) return;
  // Cancel any pending debounced sync and push immediately
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch(`${API_BASE}/user/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, myList, watchHistory }),
    }).catch(() => {});
  }, 500); // 500ms debounce — fast enough to beat a reload, light enough to batch rapid changes
}
import { AnimatePresence } from 'framer-motion';
import './styles.css';
import AuthView from './components/AuthView.jsx';
import Navbar, { MobileNav } from './components/Navbar.jsx';
import HomeView from './components/HomeView.jsx';
import BrowseView from './components/BrowseView.jsx';
import MyListView from './components/MyListView.jsx';
import AccountView from './components/AccountView.jsx';
import SettingsView from './components/SettingsView.jsx';
import DetailModal from './components/DetailModal.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';
import { fetchTrending, fetchPopularMovies, fetchTopRatedMovies, fetchUpcomingMovies, fetchNowPlayingMovies, fetchPopularTV, fetchTopRatedTV, fetchAiringTodayTV, fetchGenreMovies, fetchMovieDetails, fetchTVDetails } from './tmdb.js';

export const AppContext = React.createContext();

// ── Accent color map ──
const ACCENT_COLORS = {
  red:    { primary: '#e50914', glow: '#ff2d3b' },
  blue:   { primary: '#4facfe', glow: '#6fc0ff' },
  purple: { primary: '#8B5CF6', glow: '#a78bfa' },
  green:  { primary: '#46d369', glow: '#6ee78a' },
  gold:   { primary: '#f5c518', glow: '#ffd84d' },
};

function applyAccentColor(colorKey) {
  const c = ACCENT_COLORS[colorKey] || ACCENT_COLORS.red;
  document.documentElement.style.setProperty('--accent-primary', c.primary);
  document.documentElement.style.setProperty('--accent-glow', c.glow);
}

// ── Helper to scope localStorage keys per user ──
function userKey(username, key) {
  return `nova-${username || 'guest'}-${key}`;
}

export default function App() {
  // ── Auth state (recover from any available storage) ──
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nova-current-user')
        || sessionStorage.getItem('nova-current-user');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Sync back to both storages
        try { localStorage.setItem('nova-current-user', saved); } catch {}
        try { sessionStorage.setItem('nova-current-user', saved); } catch {}
        return parsed;
      }
      return null;
    } catch { return null; }
  });

  // ── App state ──
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('nova-last-view') || 'home';
  });

  useEffect(() => {
    localStorage.setItem('nova-last-view', currentView);
  }, [currentView]);
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [playerTitle, setPlayerTitle] = useState(null);
  const [playerSeason, setPlayerSeason] = useState(1);
  const [playerEpisode, setPlayerEpisode] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalog, setCatalog] = useState({
    trending: [], popularMovies: [], topRatedMovies: [], upcoming: [], nowPlaying: [],
    popularTV: [], topRatedTV: [], airingToday: [],
    actionMovies: [], comedyMovies: [], horrorMovies: [], sciFiMovies: [],
  });
  const [loading, setLoading] = useState(true);

  // ── User-scoped data (works for both guests and logged-in users) ──
  const dataOwner = currentUser?.username || null; // null = guest

  const [myList, setMyList] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey(dataOwner, 'mylist'))) || []; }
    catch { return []; }
  });
  const [watchHistory, setWatchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey(dataOwner, 'history'))) || []; }
    catch { return []; }
  });
  const [userSettings, setUserSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey(dataOwner, 'settings'))); }
    catch { return null; }
  });
  const [userProfile, setUserProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey(dataOwner, 'profile'))); }
    catch { return null; }
  });

  // Reload user data when logging in or out
  useEffect(() => {
    try {
      setMyList(JSON.parse(localStorage.getItem(userKey(dataOwner, 'mylist'))) || []);
    } catch { setMyList([]); }
    try {
      setWatchHistory(JSON.parse(localStorage.getItem(userKey(dataOwner, 'history'))) || []);
    } catch { setWatchHistory([]); }
    try {
      setUserSettings(JSON.parse(localStorage.getItem(userKey(dataOwner, 'settings'))));
    } catch { setUserSettings(null); }
    try {
      setUserProfile(JSON.parse(localStorage.getItem(userKey(dataOwner, 'profile'))));
    } catch { setUserProfile(null); }
  }, [dataOwner]);

  // Apply accent color on mount and when settings change
  useEffect(() => {
    const colorKey = userSettings?.accentColor || 'red';
    applyAccentColor(colorKey);
  }, [userSettings]);

  // Persist myList whenever it changes + sync to cloud
  useEffect(() => {
    localStorage.setItem(userKey(dataOwner, 'mylist'), JSON.stringify(myList));
    syncToCloud(dataOwner, myList, watchHistory);
  }, [myList, dataOwner]);

  // Persist watchHistory whenever it changes + sync to cloud
  useEffect(() => {
    localStorage.setItem(userKey(dataOwner, 'history'), JSON.stringify(watchHistory));
    syncToCloud(dataOwner, myList, watchHistory);
  }, [watchHistory, dataOwner]);

  // Persist settings whenever they change
  useEffect(() => {
    if (userSettings) {
      localStorage.setItem(userKey(dataOwner, 'settings'), JSON.stringify(userSettings));
    }
  }, [userSettings, dataOwner]);

  // Persist profile whenever it changes
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem(userKey(dataOwner, 'profile'), JSON.stringify(userProfile));
    }
  }, [userProfile, dataOwner]);

  // ── Watch History helpers ──
  const addToHistory = useCallback((item, season, episode, provider) => {
    setWatchHistory(prev => {
      const entry = {
        id: item.tmdbId || item.id,
        type: item.type,
        title: item.title,
        poster: item.poster,
        backdrop: item.backdrop,
        season: item.type === 'tv' ? season : undefined,
        episode: item.type === 'tv' ? episode : undefined,
        provider: provider || 'videasy',
        watchedAt: Date.now(),
      };
      // Remove duplicate if exists, add to front, cap at 100
      const filtered = prev.filter(h => !(h.id === entry.id && h.season === entry.season && h.episode === entry.episode));
      return [entry, ...filtered].slice(0, 100);
    });
  }, []);

  const removeFromHistory = useCallback((id, season, episode) => {
    setWatchHistory(prev => prev.filter(h => !(h.id === id && h.season === season && h.episode === episode)));
  }, []);

  const clearHistory = useCallback(() => setWatchHistory([]), []);

  // ── Auth handlers ──
  function handleLogin(account, serverData) {
    const json = JSON.stringify(account);
    try { localStorage.setItem('nova-current-user', json); } catch {}
    try { sessionStorage.setItem('nova-current-user', json); } catch {}
    setCurrentUser(account);
    setCurrentView('home');

    // Merge server data into state
    if (serverData) {
      if (Array.isArray(serverData.myList) && serverData.myList.length > 0) {
        setMyList(serverData.myList);
        try { localStorage.setItem(userKey(account.username, 'mylist'), JSON.stringify(serverData.myList)); } catch {}
      }
      if (Array.isArray(serverData.watchHistory) && serverData.watchHistory.length > 0) {
        setWatchHistory(serverData.watchHistory);
        try { localStorage.setItem(userKey(account.username, 'history'), JSON.stringify(serverData.watchHistory)); } catch {}
      }
    }
  }

  // Fetch latest data from server on every page load (cross-device sync)
  useEffect(() => {
    if (!currentUser?.username) return;

    fetch(`${API_BASE}/user/data?username=${encodeURIComponent(currentUser.username)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (Array.isArray(data.myList)) {
          setMyList(data.myList);
          try { localStorage.setItem(userKey(currentUser.username, 'mylist'), JSON.stringify(data.myList)); } catch {}
        }
        if (Array.isArray(data.watchHistory)) {
          setWatchHistory(data.watchHistory);
          try { localStorage.setItem(userKey(currentUser.username, 'history'), JSON.stringify(data.watchHistory)); } catch {}
        }
      })
      .catch(() => {}); // Offline fallback — local cache still works
  }, []);  // Only on mount

  function handleSignOut() {
    try { localStorage.removeItem('nova-current-user'); } catch {}
    try { sessionStorage.removeItem('nova-current-user'); } catch {}
    setCurrentUser(null);
    // Data will reload as guest via the dataOwner useEffect
    setPlayerTitle(null);
    setSelectedTitle(null);
    setSearchQuery('');
    setCurrentView('home');
  }

  // ── Dynamic tab title ──
  useEffect(() => {
    if (playerTitle) {
      const ep = playerTitle.type === 'tv' ? ` — S${playerSeason} E${playerEpisode}` : '';
      document.title = `${playerTitle.title}${ep} — NOVA`;
    } else if (selectedTitle) {
      document.title = `${selectedTitle.title} — NOVA`;
    } else {
      const labels = { home: 'Home', movies: 'Movies', shows: 'TV Shows', series: 'Series', mylist: 'My List', account: 'Account', settings: 'Settings', login: 'Sign In' };
      document.title = `NOVA — ${labels[currentView] || 'Stream Movies & TV'}`;
    }
  }, [playerTitle, selectedTitle, currentView, playerSeason, playerEpisode]);

  // ── Fetch catalog ──
  useEffect(() => {
    async function load() {
      try {
        const [trending, popularMovies, topRatedMovies, upcoming, nowPlaying, popularTV, topRatedTV, airingToday, actionMovies, comedyMovies, horrorMovies, sciFiMovies] = await Promise.all([
          fetchTrending(), fetchPopularMovies(), fetchTopRatedMovies(), fetchUpcomingMovies(),
          fetchNowPlayingMovies(), fetchPopularTV(), fetchTopRatedTV(), fetchAiringTodayTV(),
          fetchGenreMovies(28), fetchGenreMovies(35), fetchGenreMovies(27), fetchGenreMovies(878),
        ]);
        trending.slice(0, 5).forEach(t => t.featured = true);
        setCatalog({ trending, popularMovies, topRatedMovies, upcoming, nowPlaying, popularTV, topRatedTV, airingToday, actionMovies, comedyMovies, horrorMovies, sciFiMovies });
      } catch (err) {
        console.error('Failed to load catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleMyList = useCallback((id) => {
    setMyList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const playTitle = useCallback((item, season = 1, episode = 1) => {
    setPlayerTitle(item);
    setPlayerSeason(season);
    setPlayerEpisode(episode);
    addToHistory(item, season, episode);
  }, [addToHistory]);

  // URL Syncing
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const params = new URLSearchParams(window.location.search);
      if (params.get('play')) return; // Don't wipe URL if we are deep linking
    }

    if (playerTitle) {
      const id = playerTitle.tmdbId || playerTitle.id;
      const url = `/?play=${playerTitle.type}&id=${id}&s=${playerSeason}&e=${playerEpisode}`;
      window.history.pushState({ player: true }, '', url);
    } else {
      window.history.pushState({}, '', '/');
    }
  }, [playerTitle, playerSeason, playerEpisode]);

  // Deep linking on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playType = params.get('play');
    const playId = params.get('id');
    const s = params.get('s') || 1;
    const e = params.get('e') || 1;

    async function loadDirectLink() {
      if (playType && playId) {
        try {
          const details = playType === 'tv' ? await fetchTVDetails(playId) : await fetchMovieDetails(playId);
          setPlayerTitle(details);
          setPlayerSeason(s);
          setPlayerEpisode(e);
        } catch (err) {
          console.error("Failed to load direct link", err);
        }
      }
    }
    loadDirectLink();
  }, []);

  // Collect all unique titles
  const allTitles = useMemo(() => {
    const map = new Map();
    Object.values(catalog).flat().forEach(t => { if (!map.has(t.id)) map.set(t.id, t); });
    return Array.from(map.values());
  }, [catalog]);

  const ctx = {
    currentView, setCurrentView,
    selectedTitle, setSelectedTitle,
    playerTitle, setPlayerTitle,
    playerSeason, setPlayerSeason,
    playerEpisode, setPlayerEpisode,
    playTitle,
    myList, toggleMyList,
    watchHistory, addToHistory, removeFromHistory, clearHistory,
    searchQuery, setSearchQuery,
    catalog, allTitles, loading,
    currentUser, handleLogin, handleSignOut,
    userSettings, setUserSettings,
    userProfile, setUserProfile,
    accentColors: ACCENT_COLORS,
    applyAccentColor,
  };


  // ── Loading spinner ──
  if (loading) {
    return (
      <div style={{ background: 'var(--bg-void)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: 'var(--accent-primary)', letterSpacing: 2 }}>NOVA</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <Navbar />
      <MobileNav />
      <div className="main-content">
        <AnimatePresence mode="wait">
          {currentView === 'home' && <HomeView key="home" />}
          {currentView === 'movies' && <BrowseView key="movies" type="movies" />}
          {currentView === 'shows' && <BrowseView key="shows" type="shows" />}
          {currentView === 'series' && <BrowseView key="series" type="series" />}
          {currentView === 'mylist' && <MyListView key="mylist" />}
          {currentView === 'account' && <AccountView key="account" />}
          {currentView === 'settings' && <SettingsView key="settings" />}
          {currentView === 'login' && <AuthView key="login" onLogin={handleLogin} />}
        </AnimatePresence>
      </div>
      {selectedTitle && <DetailModal />}
      {playerTitle && <VideoPlayer />}
    </AppContext.Provider>
  );
}
