import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { AppContext } from '../App.jsx';
import { getMovieEmbedUrl, getTVEmbedUrl, PROVIDERS } from '../tmdb.js';

export default function VideoPlayer() {
  const { playerTitle: item, setPlayerTitle, playerSeason, playerEpisode, setPlayerSeason, setPlayerEpisode } = useContext(AppContext);
  const containerRef = useRef(null);
  const [provider, setProvider] = useState('videasy');
  const [streamUrl, setStreamUrl] = useState(null);
  const [useHls, setUseHls] = useState(false);
  const [loadingStream, setLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [allFailed, setAllFailed] = useState(false);
  const triedRef = useRef(new Set());
  const isManualRef = useRef(false);

  const embedUrl = item.type === 'tv'
    ? getTVEmbedUrl(item.tmdbId || item.id, playerSeason, playerEpisode, provider)
    : getMovieEmbedUrl(item.tmdbId || item.id, provider);

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

  useEffect(() => {
    setStreamUrl(null);
    setUseHls(false);
    setLoadingStream(false);
    setStreamError(null);
    setAllFailed(false);
    if (!isManualRef.current) {
      isManualRef.current = false;
    }
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

  if (allFailed) {
    return (
      <div ref={containerRef} style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'black', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
          pointerEvents: 'auto',
        }}>
          <div style={{ cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }} onClick={() => setPlayerTitle(null)}>
            <ArrowLeft size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
            <div style={{ fontSize: 13, color: '#a0a0b8' }}>
              {item.type === 'tv' ? `Season ${playerSeason} · Episode ${playerEpisode}` : item.year}
            </div>
          </div>
          <div style={{ cursor: 'pointer', color: 'white', marginLeft: 4, flexShrink: 0 }} onClick={() => setPlayerTitle(null)}>
            <X size={24} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ color: '#e50914', fontSize: 16 }}>All sources unavailable</div>
          <div style={{ color: '#a0a0b8', fontSize: 13 }}>No provider could play this content. Try again later.</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'black', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        pointerEvents: 'auto',
      }}>
        <div style={{ cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }} onClick={() => setPlayerTitle(null)}>
          <ArrowLeft size={24} />
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
          <div style={{ fontSize: 13, color: '#a0a0b8' }}>
            {item.type === 'tv' ? `Season ${playerSeason} · Episode ${playerEpisode}` : item.year}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: 6,
          backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
        }}>
          <select
            value={provider}
            onChange={handleManualProviderChange}
            style={{
              background: 'transparent', border: 'none', color: 'white',
              fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500, outline: 'none',
              cursor: 'pointer', appearance: 'none', paddingRight: 12,
            }}
          >
            {PROVIDERS.map(p => (
              <option key={p.id} value={p.id} style={{ background: '#111', color: (p.id === 'nova_native' || p.id === 'flixquest') ? '#e50914' : 'white', fontWeight: (p.id === 'nova_native' || p.id === 'flixquest') ? 600 : 400 }}>
                {p.name}
              </option>
            ))}
          </select>
          <div style={{ pointerEvents: 'none', marginLeft: -8, marginTop: 2, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid white' }} />
        </div>

        <div style={{ cursor: 'pointer', color: 'white', marginLeft: 4, flexShrink: 0 }} onClick={() => setPlayerTitle(null)}>
          <X size={24} />
        </div>
      </div>

      {/* Loading state for m3u8 */}
      {loadingStream && (provider === 'nova_native' || provider === 'flixquest') && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 48, height: 48, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#e50914', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ color: '#a0a0b8', fontSize: 14 }}>Extracting Raw Stream...</div>
        </div>
      )}

      {/* HLS Video Player */}
      {useHls && streamUrl && !loadingStream && (
        <div style={{ flex: 1, width: '100%', height: '100%' }}>
          <HlsPlayer src={streamUrl} />
        </div>
      )}

      {/* Fallback to iframe */}
      {(!useHls || !streamUrl || (provider !== 'nova_native' && provider !== 'flixquest')) && !loadingStream && (
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
          allow="autoplay; fullscreen *; encrypted-media; picture-in-picture"
          allowFullScreen
          webkitallowfullscreen="true"
          mozallowfullscreen="true"
          frameBorder="0"
          title={item.title}
          onError={() => fallbackToNext(provider)}
        />
      )}

    </div>
  );
}
