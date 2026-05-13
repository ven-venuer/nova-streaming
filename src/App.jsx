import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
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
  // ── Auth state ──
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nova-current-user');
      return saved ? JSON.parse(saved) : null;
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

  // Persist myList whenever it changes
  useEffect(() => {
    localStorage.setItem(userKey(dataOwner, 'mylist'), JSON.stringify(myList));
  }, [myList, dataOwner]);

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

  // ── Auth handlers ──
  function handleLogin(account) {
    localStorage.setItem('nova-current-user', JSON.stringify(account));
    setCurrentUser(account);
    setCurrentView('home');
  }

  function handleSignOut() {
    localStorage.removeItem('nova-current-user');
    setCurrentUser(null);
    // Data will reload as guest via the dataOwner useEffect
    setPlayerTitle(null);
    setSelectedTitle(null);
    setSearchQuery('');
    setCurrentView('home');
  }

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
  }, []);

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
      <Analytics />
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
