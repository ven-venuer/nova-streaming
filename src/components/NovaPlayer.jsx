import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';

const THEME = {
  primary: '#e50914', primaryDim: 'rgba(229,9,20,0.2)',
  bg: '#080810', surface: 'rgba(255,255,255,0.08)',
  text: '#ffffff', textSec: 'rgba(255,255,255,0.7)', textMuted: 'rgba(255,255,255,0.4)',
};

export default function NovaPlayer({
  src, poster: posterProp, autoPlay = true, title,
  onTimeUpdate, onEnded,
  season, episode, maxSeason, maxEpisode, onSeasonChange, onEpisodeChange, isTv,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const hideTimer = useRef(null);
  const hlsRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [subtitleTrack, setSubtitleTrack] = useState(-1);

  const isHls = src?.includes('.m3u8');

  const onPlay = useCallback(() => { setPlaying(true); setEnded(false); }, []);
  const onPause = useCallback(() => setPlaying(false), []);
  const onEndedHandler = useCallback(() => { setPlaying(false); setEnded(true); onEnded?.(); }, [onEnded]);
  const onTimeUpdateHandler = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      setCurrentTime(v.currentTime);
      setDuration(v.duration || 0);
      onTimeUpdate?.(v.currentTime, v.duration);
    }
  }, [onTimeUpdate]);
  const onProgress = useCallback(() => {
    const v = videoRef.current;
    if (v && v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }
  }, []);
  const onLoaded = useCallback(() => {
    setReady(true);
    setLoading(false);
    setDuration(videoRef.current?.duration || 0);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (ended) { v.currentTime = 0; setEnded(false); }
    v.paused ? v.play() : v.pause();
  }, [ended]);

  const handleSeek = useCallback((e) => {
    const v = videoRef.current;
    const r = progressRef.current;
    if (!v || !r || !duration) return;
    const rect = r.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pos * duration;
  }, [duration]);

  const handleProgressHover = useCallback((e) => {
    const r = progressRef.current;
    if (!r || !duration) return;
    const rect = r.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(pos * 100);
    setHoverTime(pos * duration);
  }, [duration]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const v = videoRef.current;
    const val = parseFloat(e.target.value);
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  }, []);

  const changeSpeed = useCallback((s) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setShowSettings(false);
  }, []);

  const changeSubtitle = useCallback((index) => {
    const hls = hlsRef.current;
    if (hls && hls.subtitleTracks) {
      hls.subtitleTrack = index;
    }
    setSubtitleTrack(index);
    setShowSubtitles(false);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break;
        case 'KeyF': toggleFullscreen(); break;
        case 'ArrowLeft': { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10); break; }
        case 'ArrowRight': { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration || 0, v.currentTime + 10); break; }
        case 'KeyM': toggleMute(); break;
        case 'KeyC': setShowSubtitles(s => !s); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, toggleFullscreen, toggleMute]);

  // ── Auto-hide controls ──
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    setShowVolume(false);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
        setShowSubtitles(false);
      }, 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (playing && ready) {
      hideTimer.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
        setShowSubtitles(false);
      }, 3000);
    } else {
      setShowControls(true);
    }
    return () => clearTimeout(hideTimer.current);
  }, [playing, ready]);

  // ── HLS.js initialization ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isHls || !src) return;

    let hls;
    setLoading(true);
    setReady(false);
    setSubtitleTracks([]);
    setSubtitleTrack(-1);

    const handleSubtitleTracks = () => {
      if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
        const tracks = hls.subtitleTracks.map((t, i) => ({
          index: i,
          name: t.name || `Track ${i + 1}`,
          lang: t.lang || '',
        }));
        setSubtitleTracks(tracks);
      }
    };

    if (Hls.isSupported()) {
      hls = new Hls({ maxLoadingDelay: 4, minAutoBitrate: 0 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        setReady(true);
        if (autoPlay) video.play().catch(() => {});
      });
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, handleSubtitleTracks);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        setReady(true);
        if (autoPlay) video.play().catch(() => {});
      });
    }

    return () => {
      if (hls) { hls.destroy(); hlsRef.current = null; }
    };
  }, [src, autoPlay, isHls]);

  // ── Format time ──
  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const hasSubtitles = subtitleTracks.length > 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => { if (playing) { setShowControls(false); setShowSettings(false); setShowSubtitles(false); } setShowVolume(false); }}
      style={{
        position: 'relative', width: '100%', height: '100%',
        background: THEME.bg, overflow: 'hidden', cursor: showControls ? 'default' : 'none',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={isHls ? undefined : src}
        poster={posterProp}
        autoPlay={autoPlay}
        playsInline
        onClick={togglePlay}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEndedHandler}
        onTimeUpdate={onTimeUpdateHandler}
        onProgress={onProgress}
        onLoadedData={onLoaded}
        onLoadedMetadata={onLoaded}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        preload="auto"
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />

      {/* Loading spinner */}
      <AnimatePresence>
        {loading && !ready && (
          <motion.div
            key="spinner"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: THEME.bg,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: THEME.primary, borderRadius: '50%' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center play button */}
      <AnimatePresence>
        {!playing && !loading && ready && (
          <motion.div
            key="center-play"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={togglePlay}
            style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: `${THEME.primary}dd`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 40px ${THEME.primaryDim}, 0 8px 32px rgba(0,0,0,0.4)`,
                backdropFilter: 'blur(4px)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21" /></svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replay on end */}
      <AnimatePresence>
        {ended && (
          <motion.div
            key="replay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={togglePlay}
            style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.3)' }}
          >
            <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <polyline points="1,4 1,10 7,10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>Replay</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <AnimatePresence>
        {showControls && ready && (
          <motion.div
            key="controls"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 25,
              background: 'linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
              padding: '40px 16px 10px',
            }}
          >
            {/* Progress bar */}
            <div
              ref={progressRef}
              onClick={handleSeek}
              onMouseMove={handleProgressHover}
              onMouseLeave={() => setHoverTime(null)}
              style={{ height: 20, cursor: 'pointer', position: 'relative', marginBottom: 6, marginTop: -20, display: 'flex', alignItems: 'center' }}
            >
              <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${bufferedPct}%`, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progressPct}%`, background: THEME.primary, borderRadius: 2 }} />
              </div>
              <motion.div
                style={{ position: 'absolute', left: `${progressPct}%`, width: 14, height: 14, borderRadius: '50%', background: THEME.primary, transform: 'translate(-50%, 0)', boxShadow: '0 0 6px rgba(229,9,20,0.5)', zIndex: 2 }}
                animate={{ scale: hoverTime !== null ? 1.3 : 1 }}
                transition={{ duration: 0.15 }}
              />
              {hoverTime !== null && (
                <div style={{ position: 'absolute', bottom: 24, left: `${hoverPos}%`, transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '3px 8px', borderRadius: 4, fontSize: 12, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                  {fmt(hoverTime)}
                </div>
              )}
            </div>

            {/* Controls row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Play/Pause */}
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={togglePlay} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                {playing ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21" /></svg>
                )}
              </motion.button>

              {/* Time */}
              <div style={{ color: THEME.textSec, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(currentTime)} / {fmt(duration)}
              </div>

              {/* Volume */}
              <div onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleMute} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                  {muted || volume === 0 ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                  ) : volume < 0.5 ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                  )}
                </motion.button>
                <AnimatePresence>
                  {showVolume && (
                    <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 72 }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                      <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} onChange={handleVolumeChange}
                        style={{ width: 64, height: 4, appearance: 'none', outline: 'none', background: `linear-gradient(to right, ${THEME.primary} ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(muted ? 0 : volume) * 100}%)`, borderRadius: 2, cursor: 'pointer' }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Season/Episode selector (VidEasy-style) */}
              {isTv && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <select
                    value={season || 1}
                    onChange={e => onSeasonChange?.(Number(e.target.value))}
                    style={{
                      background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white',
                      borderRadius: 6, padding: '3px 6px', fontSize: 12, outline: 'none',
                      cursor: 'pointer', fontFamily: 'DM Sans, system-ui, sans-serif',
                    }}
                  >
                    {Array.from({ length: maxSeason || 1 }, (_, i) => (
                      <option key={i + 1} value={i + 1} style={{ background: '#111' }}>S{i + 1}</option>
                    ))}
                  </select>
                  <select
                    value={episode || 1}
                    onChange={e => onEpisodeChange?.(Number(e.target.value))}
                    style={{
                      background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white',
                      borderRadius: 6, padding: '3px 6px', fontSize: 12, outline: 'none',
                      cursor: 'pointer', fontFamily: 'DM Sans, system-ui, sans-serif',
                    }}
                  >
                    {Array.from({ length: maxEpisode || 99 }, (_, i) => (
                      <option key={i + 1} value={i + 1} style={{ background: '#111' }}>E{i + 1}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Title */}
              {title && (
                <div style={{ color: THEME.textSec, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                  {title}
                </div>
              )}

              {/* Subtitles */}
              {hasSubtitles && (
                <div style={{ position: 'relative' }}>
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => { setShowSubtitles(!showSubtitles); setShowSettings(false); }}
                    style={{
                      background: subtitleTrack >= 0 ? `${THEME.primary}33` : 'none',
                      border: subtitleTrack >= 0 ? `1px solid ${THEME.primary}55` : 'none',
                      color: subtitleTrack >= 0 ? THEME.primary : 'white',
                      cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3, fontSize: 11,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                      <line x1="8" y1="16" x2="14" y2="16" />
                    </svg>
                  </motion.button>
                  <AnimatePresence>
                    {showSubtitles && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        style={{
                          position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
                          background: 'rgba(20,20,30,0.95)', backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 6, minWidth: 170,
                          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                        }}
                      >
                        <div style={{ padding: '6px 10px 4px', fontSize: 11, color: THEME.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Subtitles</div>
                        <motion.div
                          whileHover={{ background: 'rgba(255,255,255,0.06)' }}
                          onClick={() => changeSubtitle(-1)}
                          style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: subtitleTrack === -1 ? `${THEME.primary}22` : 'transparent' }}
                        >
                          {subtitleTrack === -1 && <svg width="14" height="14" viewBox="0 0 24 24" fill={THEME.primary}><polygon points="20 6 9 17 4 12" /></svg>}
                          <div style={{ flex: 1, fontSize: 13, color: subtitleTrack === -1 ? THEME.primary : THEME.textSec, fontWeight: subtitleTrack === -1 ? 600 : 400 }}>Off</div>
                        </motion.div>
                        {subtitleTracks.map(t => (
                          <motion.div
                            key={t.index}
                            whileHover={{ background: 'rgba(255,255,255,0.06)' }}
                            onClick={() => changeSubtitle(t.index)}
                            style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: subtitleTrack === t.index ? `${THEME.primary}22` : 'transparent' }}
                          >
                            {subtitleTrack === t.index && <svg width="14" height="14" viewBox="0 0 24 24" fill={THEME.primary}><polygon points="20 6 9 17 4 12" /></svg>}
                            <div style={{ flex: 1, fontSize: 13, color: subtitleTrack === t.index ? THEME.primary : THEME.textSec, fontWeight: subtitleTrack === t.index ? 600 : 400 }}>{t.name}{t.lang ? ` (${t.lang})` : ''}</div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Settings */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowSettings(!showSettings); setShowSubtitles(false); }}
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </motion.button>
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      style={{
                        position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
                        background: 'rgba(20,20,30,0.95)', backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 6, minWidth: 160,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                      }}
                    >
                      <div style={{ padding: '6px 10px 4px', fontSize: 11, color: THEME.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Speed</div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                        <motion.div key={s} whileHover={{ background: 'rgba(255,255,255,0.06)' }} onClick={() => changeSpeed(s)}
                          style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: speed === s ? `${THEME.primary}22` : 'transparent' }}
                        >
                          {speed === s && <svg width="14" height="14" viewBox="0 0 24 24" fill={THEME.primary}><polygon points="20 6 9 17 4 12" /></svg>}
                          <div style={{ flex: 1, fontSize: 13, color: speed === s ? THEME.primary : THEME.textSec, fontWeight: speed === s ? 600 : 400 }}>{s}x</div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Fullscreen */}
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleFullscreen}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
