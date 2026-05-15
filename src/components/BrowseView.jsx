import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TitleCard } from './ContentRow.jsx';
import { discoverMedia, REVERSE_GENRE_MAP } from '../tmdb.js';

export default function BrowseView({ type }) {
  const [genre, setGenre] = useState('All');
  const [sort, setSort] = useState('popularity');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const observerTarget = useRef(null);

  // Initial load & when filters change
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchData(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, genre, sort]);

  const fetchData = async (pageNum, reset = false) => {
    setLoading(true);
    try {
      const genreId = genre === 'All' ? '' : REVERSE_GENRE_MAP[genre] || '';
      const newItems = await discoverMedia(type, pageNum, genreId, sort);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => {
          // Prevent duplicates that sometimes happen with TMDB pagination
          const combined = reset ? newItems : [...prev, ...newItems];
          const unique = [];
          const seen = new Set();
          for (const item of combined) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              unique.push(item);
            }
          }
          return unique;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchData(nextPage);
        }
      },
      { rootMargin: '400px' } // Trigger fetch slightly before reaching the very bottom
    );
    
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [page, hasMore, loading, type, genre, sort]);

  const heroItem = items[0];
  const label = type === 'movies' ? 'Movies' : type === 'shows' ? 'TV Shows' : type === 'series' ? 'Series' : type === 'filipino' ? 'Filipino Media' : type === 'kdrama' ? 'K-Dramas' : type === 'anime' ? 'Anime' : 'Media';
  
  // Get all unique TMDB genres
  const allGenres = ['All', ...Object.keys(REVERSE_GENRE_MAP).sort()];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
      {heroItem && (
        <div className="section-hero-short">
          <div className="hero-bg" style={{ backgroundImage: heroItem.backdrop ? `url(${heroItem.backdrop})` : 'none', opacity: 1 }} />
          <div className="hero-overlay" />
          <div style={{ position: 'relative', zIndex: 10 }}>
            <h1 className="hero-title" style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>{label}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginTop: 8 }}>Explore limitless titles</p>
          </div>
        </div>
      )}
      <div className="filter-bar">
        <select className="filter-select" value={genre} onChange={e => setGenre(e.target.value)}>
          {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="popularity">Most Popular</option>
          <option value="score">Top Rated</option>
          <option value="year">Newest</option>
        </select>
        {genre !== 'All' && (
          <motion.div className="filter-pill" initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setGenre('All')}>
            {genre} <span>✕</span>
          </motion.div>
        )}
      </div>
      <div style={{ padding: '24px 0' }}>
        <div className="browse-grid">
          {items.map((item, i) => (
            <div key={item.id} className="card-animate" style={{ animationDelay: `${Math.min((i % 20) * 20, 400)}ms` }}>
              <TitleCard item={item} />
            </div>
          ))}
        </div>
        
        {/* Infinite Scroll Anchor */}
        <div ref={observerTarget} style={{ height: 40, width: '100%', marginTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {loading && (
            <div style={{ width: 24, height: 24, border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          )}
          {!hasMore && items.length > 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>You've reached the end!</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
