import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppContext } from '../App.jsx';
import { getMovieEmbedUrl, getTVEmbedUrl, PROVIDERS } from '../tmdb.js';
import HlsPlayer from './HlsPlayer.jsx';

const THEME = { primary: '#e50914', bg: '#080810', surface: '#0f0f1a', text: '#ffffff', textSec: '#a0a0b8', textMuted: '#505068' };

export default function VideoPlayer() {
  const { playerTitle: item, setPlayerTitle, playerSeason, playerEpisode, setPlayerSeason, setPlayerEpisode } = useContext(AppContext);
  const containerRef = useRef(null);
  const [provider, setProvider] = useState('videasy');
  const [streamUrl, setStreamUrl] = useState(null);
  const [useHls, setUseHls] = useState(false);
  const [loadingStream, setLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [allFailed, setAllFailed] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const triedRef = useRef(new Set());
  const isManualRef = useRef(false);
  const loaderTimer = useRef(null);
  const maxEpisode = item?.episodes || 99;
  const maxSeason = item?.seasons || 1;

  const embedUrl = item.type === 'tv'
    ? getTVEmbedUrl(item.tmdbId || item.id, playerSeason, playerEpisode, provider)
    : getMovieEmbedUrl(item.tmdbId || item.id, provider);

  const currentProvider = PROVIDERS.find(p => p.id === provider);
  const providerIndex = PROVIDERS.findIndex(p => p.id === provider);

  const fallbackToNext = useCallback((failedProviderId) => {
    triedRef.current = new Set([...triedRef.current, failedProviderId]);
    const nextProvider = PROVIDERS.find(p => !triedRef.current.has(p.id));
    if (nextProvider) {
      setProvider(nextProvider.id);
    } else {
      setAllFailed(true);
    }
  }, []);

  const handleManualProviderChange = useCallback((e) => {
    isManualRef.current = true;
    triedRef.current = new Set();
    setAllFailed(false);
    setProvider(e.target.value);
  }, []);

  const goToEpisode = useCallback((season, episode) => {
    if (season < 1 || season > maxSeason) return;
    if (episode < 1 || episode > (season === playerSeason ? maxEpisode : 99)) return;
    setPlayerSeason(season);
    setPlayerEpisode(episode);
  }, [maxSeason, maxEpisode, playerSeason]);

  const goNext = useCallback(() => {
    if (playerEpisode < maxEpisode) {
      goToEpisode(playerSeason, playerEpisode + 1);
    } else if (playerSeason < maxSeason) {
      goToEpisode(playerSeason + 1, 1);
    }
  }, [playerEpisode, playerSeason, maxEpisode, maxSeason, goToEpisode]);

  const goPrev = useCallback(() => {
    if (playerEpisode > 1) {
      goToEpisode(playerSeason, playerEpisode - 1);
    } else if (playerSeason > 1) {
      goToEpisode(playerSeason - 1, maxEpisode);
    }
  }, [playerEpisode, playerSeason, maxEpisode, goToEpisode]);

  useEffect(() => {
    setStreamUrl(null);
    setUseHls(false);
    setLoadingStream(false);
    setStreamError(null);
    setAllFailed(false);
    setShowLoader(true);
    clearTimeout(loaderTimer.current);
    loaderTimer.current = setTimeout(() => setShowLoader(false), 700);
    if (!isManualRef.current) {
      isManualRef.current = false;
    }
    return () => clearTimeout(loaderTimer.current);
  }, [provider, playerSeason, playerEpisode]);

  useEffect(() => {
    triedRef.current = new Set();
    setAllFailed(false);
  }, [item.tmdbId, playerSeason, playerEpisode]);

  useEffect(() => {
    const fetchStream = async () => {
      if (!item?.tmdbId || (provider !== 'nova_native' && provider !== 'flixquest')) return;

      setLoadingStream(true);
      setStreamError(null);
      let data;

      try {
        if (provider === 'nova_native') {
          const response = await fetch(`/api/stream-source?tmdbId=${item.tmdbId}&type=${item.type}&title=${encodeURIComponent(item.title)}`);
          data = await response.json();
          if (data.success && data.url) {
            setStreamUrl(data.url);
            setUseHls(true);
          } else {
            setStreamError(data.error || 'Failed to get stream');
          }
        } else if (provider === 'flixquest') {
          const url = item.type === 'tv'
            ? `https://flixquest-scraper-five.vercel.app/vixsrc/stream-tv?tmdbId=${item.tmdbId}&season=${playerSeason || 1}&episode=${playerEpisode || 1}`
            : `https://flixquest-scraper-five.vercel.app/vixsrc/stream-movie?tmdbId=${item.tmdbId}`;

          const response = await fetch(url);
          data = await response.json();

          if (data.success && data.links && data.links.length > 0) {
            setStreamUrl(data.links[0].url);
            setUseHls(true);
          } else {
            setStreamError(data.error || 'No streams found for this media');
          }
        }
      } catch (err) {
        setStreamError('Connection error');
      } finally {
        setLoadingStream(false);
      }
    };
    fetchStream();
  }, [provider, item.tmdbId, item.type, item.title, playerSeason, playerEpisode]);

  useEffect(() => {
    if (streamError && (provider === 'nova_native' || provider === 'flixquest') && !loadingStream) {
      fallbackToNext(provider);
    }
  }, [streamError, loadingStream, provider, fallbackToNext]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        setPlayerTitle(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setPlayerTitle]);

  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const s = data?.season || data?.data?.season || data?.detail?.season || data?.data?.last_season_watched;
        const e = data?.episode || data?.data?.episode || data?.detail?.episode || data?.data?.last_episode_watched;

        if (s && e && item.type === 'tv') {
          setPlayerSeason(Number(s));
          setPlayerEpisode(Number(e));
        }
      } catch (e) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [item.type, setPlayerSeason, setPlayerEpisode]);

  const renderTopBar = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '12px 20px',
        background: 'linear-gradient(180deg, rgba(8,8,16,0.92) 0%, rgba(8,8,16,0.7) 70%, transparent 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          style={{ cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', padding: 4 }}
          onClick={() => setPlayerTitle(null)}
        >
          <ArrowLeft size={22} />
        </motion.div>

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{
            fontSize: 15, fontWeight: 600, color: 'white',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {item.title}
          </div>
          {item.type === 'tv' ? (
            <div style={{ fontSize: 12, color: THEME.textSec, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Season {playerSeason}</span>
              <span style={{ color: THEME.textMuted }}>·</span>
              <span>Episode {playerEpisode}</span>
              <span style={{ color: THEME.textMuted }}>·</span>
              <span style={{ color: THEME.primary, fontSize: 11, fontWeight: 500 }}>{currentProvider?.name || provider}</span>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: THEME.textSec, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{item.year}</span>
              <span style={{ color: THEME.textMuted }}>·</span>
              <span style={{ color: THEME.primary, fontSize: 11, fontWeight: 500 }}>{currentProvider?.name || provider}</span>
            </div>
          )}
        </div>

        {item.type === 'tv' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={goPrev}
              disabled={playerEpisode <= 1 && playerSeason <= 1}
              style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', color: playerEpisode <= 1 && playerSeason <= 1 ? THEME.textMuted : 'white',
                width: 32, height: 32, borderRadius: 8, cursor: playerEpisode <= 1 && playerSeason <= 1 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <ChevronLeft size={18} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={goNext}
              disabled={playerEpisode >= maxEpisode && playerSeason >= maxSeason}
              style={{
                background: THEME.primary, border: 'none', color: 'white',
                width: 32, height: 32, borderRadius: 8, cursor: playerEpisode >= maxEpisode && playerSeason >= maxSeason ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <ChevronRight size={18} />
            </motion.button>
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.06)', padding: '3px 6px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <select
            value={provider}
            onChange={handleManualProviderChange}
            style={{
              background: 'transparent', border: 'none', color: 'white',
              fontFamily: 'DM Sans, system-ui, sans-serif', fontSize: 12, fontWeight: 500,
              outline: 'none', cursor: 'pointer', appearance: 'none', paddingRight: 8,
              padding: '2px 4px',
            }}
          >
            {PROVIDERS.map((p, i) => (
              <option key={p.id} value={p.id} style={{ background: THEME.bg, color: 'white' }}>
                {p.name}
              </option>
            ))}
          </select>
          <div style={{
            pointerEvents: 'none', marginLeft: -4,
            borderLeft: '3px solid transparent', borderRight: '3px solid transparent',
            borderTop: '3px solid rgba(255,255,255,0.5)',
          }} />
        </div>

        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', padding: 4 }}
          onClick={() => setPlayerTitle(null)}
        >
          <X size={20} />
        </motion.div>
      </div>

      {item.type === 'tv' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 34 }}>
          <span style={{ fontSize: 11, color: THEME.textMuted, whiteSpace: 'nowrap' }}>Season</span>
          <select
            value={playerSeason}
            onChange={e => goToEpisode(Number(e.target.value), 1)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'white', borderRadius: 6, padding: '3px 8px',
              fontFamily: 'DM Sans, system-ui, sans-serif', fontSize: 12, outline: 'none',
              cursor: 'pointer',
            }}
          >
            {Array.from({ length: maxSeason }, (_, i) => (
              <option key={i + 1} value={i + 1} style={{ background: THEME.bg }}>Season {i + 1}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: THEME.textMuted, whiteSpace: 'nowrap', marginLeft: 4 }}>Episode</span>
          <select
            value={playerEpisode}
            onChange={e => goToEpisode(playerSeason, Number(e.target.value))}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'white', borderRadius: 6, padding: '3px 8px',
              fontFamily: 'DM Sans, system-ui, sans-serif', fontSize: 12, outline: 'none',
              cursor: 'pointer',
            }}
          >
            {Array.from({ length: maxEpisode }, (_, i) => (
              <option key={i + 1} value={i + 1} style={{ background: THEME.bg }}>Episode {i + 1}</option>
            ))}
          </select>
        </div>
      )}
    </motion.div>
  );

  const renderContent = () => {
    if (allFailed) {
      return (
        <motion.div
          key="all-failed"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}
        >
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(229,9,20,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={28} color={THEME.primary} />
          </div>
          <div style={{ color: 'white', fontSize: 17, fontWeight: 600 }}>All sources unavailable</div>
          <div style={{ color: THEME.textSec, fontSize: 13, textAlign: 'center', maxWidth: 320 }}>
            No provider could play this content. Try again later or pick a different source.
          </div>
        </motion.div>
      );
    }

    if (loadingStream && (provider === 'nova_native' || provider === 'flixquest')) {
      return (
        <motion.div
          key="stream-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 44, height: 44,
              border: '3px solid rgba(255,255,255,0.08)',
              borderTopColor: THEME.primary,
              borderRadius: '50%',
            }}
          />
          <div style={{ color: THEME.textSec, fontSize: 13 }}>Extracting Raw Stream...</div>
        </motion.div>
      );
    }

    if (useHls && streamUrl && !loadingStream) {
      return (
        <motion.div
          key="hls-player"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ flex: 1, width: '100%', height: '100%' }}
        >
          <HlsPlayer src={streamUrl} />
        </motion.div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={embedUrl}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}
        >
          {showLoader && (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: THEME.bg,
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 36, height: 36,
                  border: '2.5px solid rgba(255,255,255,0.06)',
                  borderTopColor: THEME.primary,
                  borderRadius: '50%',
                }}
              />
            </motion.div>
          )}
          <iframe
            src={embedUrl}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="autoplay; fullscreen *; encrypted-media; picture-in-picture"
            allowFullScreen
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
            frameBorder="0"
            title={item.title}
            onError={() => {
              if (!triedRef.current.has(provider)) fallbackToNext(provider);
            }}
          />
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: THEME.bg, display: 'flex', flexDirection: 'column',
      }}
    >
      {renderTopBar()}
      {renderContent()}
    </motion.div>
  );
}
