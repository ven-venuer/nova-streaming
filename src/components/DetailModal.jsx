import React, { useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Plus, ThumbsUp, ThumbsDown } from 'lucide-react';
import { AppContext } from '../App.jsx';
import { fetchMovieDetails, fetchTVDetails, fetchTVSeasonEpisodes } from '../tmdb.js';

export default function DetailModal() {
  const { selectedTitle: item, setSelectedTitle, playTitle, toggleMyList, myList } = useContext(AppContext);
  const [tab, setTab] = useState('overview');
  const [details, setDetails] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const inList = myList.includes(item.id);

  useEffect(() => {
    setLoadingDetails(true);
    setTab('overview');
    const fetcher = item.type === 'tv' ? fetchTVDetails : fetchMovieDetails;
    fetcher(item.id).then(d => {
      setDetails(d);
      setLoadingDetails(false);
    }).catch(() => setLoadingDetails(false));
  }, [item.id, item.type]);

  useEffect(() => {
    if (item.type === 'tv' && tab === 'episodes') {
      fetchTVSeasonEpisodes(item.id, selectedSeason).then(setEpisodes).catch(() => setEpisodes([]));
    }
  }, [item.id, item.type, tab, selectedSeason]);

  const d = details || item;
  const scoreColor = d.score >= 8.5 ? 'var(--accent-gold)' : d.score >= 7 ? '#46d369' : 'var(--text-muted)';

  return (
    <AnimatePresence>
      <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTitle(null)}>
        <motion.div className="modal-panel" onClick={e => e.stopPropagation()} initial={{ scale: 0.92, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.92, y: 40, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <div className="modal-hero">
            {d.backdrop && <img src={d.backdrop} alt={d.title} />}
            <div className="modal-hero-overlay" />
            <div className="modal-hero-content">
              <div className="modal-title">{d.title}</div>
              <div className="modal-meta">
                <span style={{ color: scoreColor }}>⭐ {d.score}</span>
                <span>{d.year}</span>
                {d.seasons && <span>{d.seasons} Season{d.seasons > 1 ? 's' : ''}</span>}
                {d.runtime && <span>{d.runtime}m</span>}
                <span className="rating-badge">{d.rating}</span>
              </div>
              <div className="modal-buttons">
                <button className="btn-play" style={{ padding: '10px 28px', fontSize: 14 }} onClick={() => { playTitle(d); setSelectedTitle(null); }}>
                  <Play size={16} fill="white" /> PLAY
                </button>
                <button className="hover-action-btn" style={{ width: 40, height: 40 }} onClick={() => toggleMyList(d.id)}>
                  <Plus size={18} style={inList ? { transform: 'rotate(45deg)', color: 'var(--accent-primary)' } : {}} />
                </button>
                <button className="hover-action-btn" style={{ width: 40, height: 40 }}><ThumbsUp size={18} /></button>
                <button className="hover-action-btn" style={{ width: 40, height: 40 }}><ThumbsDown size={18} /></button>
              </div>
            </div>
            <button className="modal-close" onClick={() => setSelectedTitle(null)}><X size={18} /></button>
          </div>

          <div className="tabs">
            {['overview', ...(d.type === 'tv' ? ['episodes'] : []), 'more'].map(t => (
              <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'overview' ? 'Overview' : t === 'episodes' ? 'Episodes' : 'More Like This'}
                {tab === t && <motion.div className="tab-indicator" layoutId="tab-indicator" />}
              </div>
            ))}
          </div>

          {loadingDetails ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <>
              {tab === 'overview' && (
                <div className="modal-body">
                  <div className="modal-left">
                    <div className="hover-match" style={{ fontSize: 14 }}>{d.matchScore}% Match</div>
                    <div className="modal-desc">{d.description}</div>
                    {d.cast && d.cast.length > 0 && (
                      <><div className="modal-label">Cast</div><div className="modal-value">{d.cast.join(', ')}</div></>
                    )}
                    {d.director && (
                      <><div className="modal-label">{d.type === 'tv' ? 'Creator' : 'Director'}</div><div className="modal-value">{d.director}</div></>
                    )}
                  </div>
                  <div className="modal-right">
                    <div className="modal-label">Genres</div>
                    <div style={{ marginTop: 4 }}>{(d.genreNames || d.genre || []).map(g => <span key={g} className="genre-pill" style={{ marginBottom: 4 }}>{g}</span>)}</div>
                    <div className="modal-label">Language</div>
                    <div className="modal-value">{d.language}</div>
                    {d.type === 'tv' && d.seasons && (
                      <><div className="modal-label">Seasons</div><div className="modal-value">{d.seasons} ({d.episodes} episodes)</div></>
                    )}
                  </div>
                </div>
              )}

              {tab === 'episodes' && (
                <div style={{ padding: '16px 0' }}>
                  <div style={{ padding: '0 24px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Season:</span>
                    <select className="filter-select" value={selectedSeason} onChange={e => setSelectedSeason(Number(e.target.value))}>
                      {Array.from({ length: d.seasons || 1 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>Season {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  {episodes.length === 0 && <div style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading episodes...</div>}
                  {episodes.map(ep => (
                    <div key={ep.num} className="episode-item" onClick={() => { playTitle(d, selectedSeason, ep.num); setSelectedTitle(null); }}>
                      <div className="episode-thumb">
                        {ep.thumb ? <img src={ep.thumb} alt={ep.title} /> : <div style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)' }} />}
                        <div className="episode-play-overlay"><Play size={24} fill="white" /></div>
                      </div>
                      <div className="episode-info">
                        <div className="episode-number">E{ep.num} · {ep.dur}</div>
                        <div className="episode-title">{ep.title}</div>
                        <div className="episode-desc">{ep.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'more' && (
                <div style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Browse similar titles from the home page
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
