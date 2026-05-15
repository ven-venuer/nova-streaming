import React, { useContext, useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { AppContext } from '../App.jsx';
import { getMovieEmbedUrl, getTVEmbedUrl, PROVIDERS } from '../tmdb.js';

export default function VideoPlayer() {
  const { playerTitle: item, setPlayerTitle, playerSeason, playerEpisode, setPlayerSeason, setPlayerEpisode } = useContext(AppContext);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [provider, setProvider] = useState('videasy');
  const [streamUrl, setStreamUrl] = useState(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [useHls, setUseHls] = useState(false);

  const embedUrl = item.type === 'tv'
    ? getTVEmbedUrl(item.tmdbId || item.id, playerSeason, playerEpisode, provider)
    : getMovieEmbedUrl(item.tmdbId || item.id, provider);

  // Fetch m3u8 stream when FMovies is selected
  useEffect(() => {
    const fetchStream = async () => {
      if (!item?.tmdbId || provider !== 'fmovies') return;
      
      setLoadingStream(true);
      setStreamError(null);
      setUseHls(false);
      setStreamUrl(null);
      
      try {
        const tmdbId = item.tmdbId || item.id;
        const response = await fetch(`/api/stream-source?tmdbId=${tmdbId}&type=${item.type}`);
        const data = await response.json();
        
        if (data.success && data.url) {
          setStreamUrl(data.url);
          setUseHls(true);
        } else {
          setStreamError(data.error || 'Failed to get stream');
        }
      } catch (err) {
        console.log('Stream API error:', err);
        setStreamError(err.message);
      } finally {
        setLoadingStream(false);
      }
    };
    
    fetchStream();
  }, [provider, item?.tmdbId, item?.type]);

  // Initialize HLS player
  useEffect(() => {
    if (!streamUrl || !videoRef.current || !useHls) return;
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    const loadHls = async () => {
      const Hls = (await import('hls.js')).default;
      
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        
        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current.play().catch(console.log);
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
          setStreamError(data.type);
        });
        
        hlsRef.current = hls;
      }
    };
    
    loadHls();
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, useHls]);

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
        
        // Attempt to generically capture season/episode change events from any provider
        const s = data?.season || data?.data?.season || data?.detail?.season || data?.data?.last_season_watched;
        const e = data?.episode || data?.data?.episode || data?.detail?.episode || data?.data?.last_episode_watched;

        if (s && e && item.type === 'tv') {
          setPlayerSeason(Number(s));
          setPlayerEpisode(Number(e));
        }
      } catch (e) {
        // Not JSON
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [item.type, setPlayerSeason, setPlayerEpisode]);

  return (
    <div ref={containerRef} style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'black', display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
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

        {/* Provider selection */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: 6,
          backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
        }}>
          <select
            value={provider}
            onChange={e => { setProvider(e.target.value); setUseHls(false); }}
            style={{
              background: 'transparent', border: 'none', color: 'white',
              fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500, outline: 'none',
              cursor: 'pointer', appearance: 'none', paddingRight: 12,
            }}
          >
            {PROVIDERS.map(p => (
              <option key={p.id} value={p.id} style={{ background: '#111', color: 'white' }}>
                {p.name}
              </option>
            ))}
            <option value="fmovies" style={{ background: '#111', color: '#e50914', fontWeight: 600 }}>
              FMovies (m3u8)
            </option>
          </select>
          <div style={{ pointerEvents: 'none', marginLeft: -8, marginTop: 2, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid white' }} />
        </div>

        <div style={{ cursor: 'pointer', color: 'white', marginLeft: 4, flexShrink: 0 }} onClick={() => setPlayerTitle(null)}>
          <X size={24} />
        </div>
      </div>

      {/* Loading state for m3u8 */}
      {loadingStream && provider === 'fmovies' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <Loader2 size={48} color="#e50914" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ color: '#a0a0b8', fontSize: 14 }}>Loading FMovies stream...</div>
        </div>
      )}

      {/* Error state for m3u8 */}
      {streamError && provider === 'fmovies' && !loadingStream && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ color: '#e50914', fontSize: 16 }}>Failed to load stream</div>
          <div style={{ color: '#a0a0b8', fontSize: 13 }}>{streamError}</div>
          <button 
            onClick={() => setProvider('videasy')}
            style={{ padding: '8px 16px', background: '#e50914', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Switch to VidEasy
          </button>
        </div>
      )}

      {/* HLS Video Player */}
      {useHls && streamUrl && !loadingStream && (
        <video
          ref={videoRef}
          controls
          style={{ width: '100%', height: '100%', backgroundColor: 'black' }}
          crossOrigin="anonymous"
        />
      )}

      {/* Fallback to iframe */}
      {(!useHls || !streamUrl || provider !== 'fmovies') && !loadingStream && (
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
          allow="autoplay; fullscreen *; encrypted-media; picture-in-picture"
          allowFullScreen
          webkitallowfullscreen="true"
          mozallowfullscreen="true"
          frameBorder="0"
          title={item.title}
        />
      )}

    </div>
  );
}

