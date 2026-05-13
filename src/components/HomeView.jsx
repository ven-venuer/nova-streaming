import React, { useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Info } from 'lucide-react';
import { AppContext } from '../App.jsx';
import ContentRow from './ContentRow.jsx';

function HeroSection() {
  const { catalog, setSelectedTitle, playTitle } = useContext(AppContext);
  const featured = catalog.trending.filter(t => t.featured && t.backdrop);
  const [idx, setIdx] = useState(0);
  const item = featured[idx] || featured[0];

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => setIdx(i => (i + 1) % featured.length), 8000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (!item) return null;

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.15 } } };
  const fadeUp = (delay = 0) => ({ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay } } });

  return (
    <div className="hero">
      {featured.map((f, i) => (
        <div key={f.id} className="hero-bg" style={{ backgroundImage: `url(${f.backdrop})`, opacity: i === idx ? 1 : 0 }} />
      ))}
      <div className="hero-overlay" />
      <motion.div className="hero-content" variants={stagger} initial="hidden" animate="visible" key={item.id}>
        <motion.div className="hero-badge" variants={fadeUp(0.1)}>⚡ FEATURED {item.type === 'tv' ? 'SERIES' : 'MOVIE'}</motion.div>
        <motion.h1 className="hero-title" variants={fadeUp(0.25)}>{item.title}</motion.h1>
        <motion.p className="hero-desc" variants={fadeUp(0.4)}>{item.description}</motion.p>
        <motion.div className="hero-meta" variants={fadeUp(0.5)}>
          <span className="gold">⭐ {item.score}</span> · {item.year} · {item.type === 'tv' ? 'TV Show' : `Movie`} · {item.genre.slice(0, 2).join(' · ')}
        </motion.div>
        <motion.div className="hero-buttons" variants={fadeUp(0.6)}>
          <button className="btn-play" onClick={() => playTitle(item)}><Play size={18} fill="white" /> PLAY NOW</button>
          <button className="btn-info" onClick={() => setSelectedTitle(item)}><Info size={18} /> MORE INFO</button>
        </motion.div>
      </motion.div>
      <div className="hero-dots">
        {featured.map((_, i) => <div key={i} className={`hero-dot ${i === idx ? 'active' : ''}`} onClick={() => setIdx(i)} />)}
      </div>
    </div>
  );
}

export default function HomeView() {
  const { catalog } = useContext(AppContext);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
      <HeroSection />
      <div style={{ marginTop: -60, position: 'relative', zIndex: 20 }}>
        <ContentRow title="Trending Now" items={catalog.trending} icon="🔥" />
        <ContentRow title="Popular Movies" items={catalog.popularMovies} icon="🎬" />
        <ContentRow title="Popular TV Shows" items={catalog.popularTV} icon="📺" />
        <ContentRow title="Top Rated Movies" items={catalog.topRatedMovies} icon="⭐" />
        <ContentRow title="Now Playing" items={catalog.nowPlaying} icon="▶" />
        <ContentRow title="Top Rated TV" items={catalog.topRatedTV} icon="🏆" />
        <ContentRow title="Action Movies" items={catalog.actionMovies} icon="💥" />
        <ContentRow title="Sci-Fi" items={catalog.sciFiMovies} icon="🚀" />
        <ContentRow title="Comedy" items={catalog.comedyMovies} icon="😂" />
        <ContentRow title="Horror" items={catalog.horrorMovies} icon="👻" />
        <ContentRow title="Upcoming" items={catalog.upcoming} icon="📅" />
        <ContentRow title="Airing Today" items={catalog.airingToday} icon="📡" landscape />
      </div>
    </motion.div>
  );
}
