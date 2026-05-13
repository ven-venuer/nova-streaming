import React, { useContext, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../App.jsx';
import { TitleCard } from './ContentRow.jsx';

export default function BrowseView({ type }) {
  const { allTitles } = useContext(AppContext);
  const [genre, setGenre] = useState('All');
  const [sort, setSort] = useState('score');

  const filtered = useMemo(() => {
    let items = allTitles;
    if (type === 'movies') items = items.filter(t => t.type === 'movie');
    else if (type === 'shows' || type === 'series') items = items.filter(t => t.type === 'tv');
    if (genre !== 'All') items = items.filter(t => (t.genreNames || t.genre || []).includes(genre));
    if (sort === 'score') items = [...items].sort((a, b) => b.score - a.score);
    else if (sort === 'year') items = [...items].sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (sort === 'title') items = [...items].sort((a, b) => a.title.localeCompare(b.title));
    return items;
  }, [allTitles, type, genre, sort]);

  const heroItem = filtered[0];
  const allGenres = ['All', ...new Set(allTitles.flatMap(t => t.genreNames || t.genre || []))];
  const label = type === 'movies' ? 'Movies' : type === 'shows' ? 'TV Shows' : 'Series';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
      {heroItem && (
        <div className="section-hero-short">
          <div className="hero-bg" style={{ backgroundImage: heroItem.backdrop ? `url(${heroItem.backdrop})` : 'none', opacity: 1 }} />
          <div className="hero-overlay" />
          <div style={{ position: 'relative', zIndex: 10 }}>
            <h1 className="hero-title" style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>{label}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginTop: 8 }}>Browse {filtered.length} titles</p>
          </div>
        </div>
      )}
      <div className="filter-bar">
        <select className="filter-select" value={genre} onChange={e => setGenre(e.target.value)}>
          {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="score">Top Rated</option>
          <option value="year">Newest</option>
          <option value="title">A–Z</option>
        </select>
        {genre !== 'All' && (
          <motion.div className="filter-pill" initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setGenre('All')}>
            {genre} <span>✕</span>
          </motion.div>
        )}
      </div>
      <div style={{ padding: '24px 0' }}>
        <div className="browse-grid">
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.6), duration: 0.3 }}>
              <TitleCard item={item} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
