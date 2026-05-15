import React, { useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Info, TrendingUp, Film, Tv, Star, PlayCircle, Trophy, Zap, Rocket, Laugh, Skull, CalendarDays, Radio, Globe } from 'lucide-react';
import { AppContext } from '../App.jsx';
import ContentRow from './ContentRow.jsx';

const RowIcon = ({ Icon, color = 'var(--accent-primary)' }) => (
  <div style={{
    width: 24, height: 24, borderRadius: 6,
    background: `${color}15`, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }}>
    <Icon size={14} color={color} />
  </div>
);

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
        <motion.div className="hero-badge" variants={fadeUp(0.1)}>
          <Zap size={12} style={{ marginRight: 4, verticalAlign: -1 }} /> FEATURED {item.type === 'tv' ? 'SERIES' : 'MOVIE'}
        </motion.div>
        <motion.h1 className="hero-title" variants={fadeUp(0.25)}>{item.title}</motion.h1>
        <motion.p className="hero-desc" variants={fadeUp(0.4)}>{item.description}</motion.p>
        <motion.div className="hero-meta" variants={fadeUp(0.5)}>
          <span className="gold">★ {item.score}</span> · {item.year} · {item.type === 'tv' ? 'TV Show' : `Movie`} · {item.genre.slice(0, 2).join(' · ')}
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
  const { catalog, watchHistory, allTitles, playTitle } = useContext(AppContext);

  // Build continue watching items from history (deduped by ID)
  const continueItems = [];
  const seen = new Set();
  for (const h of (watchHistory || [])) {
    if (!seen.has(h.id)) {
      seen.add(h.id);
      // Try to find full item in catalog, fallback to history entry
      const full = allTitles.find(t => (t.tmdbId || t.id) === h.id);
      continueItems.push({
        ...(full || {}),
        id: h.id,
        tmdbId: h.id,
        type: h.type,
        title: h.title,
        poster: full?.poster || h.poster,
        backdrop: full?.backdrop || h.backdrop,
        _season: h.season,
        _episode: h.episode,
      });
    }
    if (continueItems.length >= 20) break;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
      <HeroSection />
      <div style={{ marginTop: -60, position: 'relative', zIndex: 20 }}>
        {continueItems.length > 0 && (
          <ContentRow title="Continue Watching" items={continueItems} icon={<RowIcon Icon={PlayCircle} color="#46d369" />} category="movie" />
        )}
        <ContentRow title="Trending Now" items={catalog.trending} icon={<RowIcon Icon={TrendingUp} />} category="movie" />
        <ContentRow title="Popular Movies" items={catalog.popularMovies} icon={<RowIcon Icon={Film} />} category="movie" />
        <ContentRow title="Popular TV Shows" items={catalog.popularTV} icon={<RowIcon Icon={Tv} />} category="tv" />
        <ContentRow title="Top Rated Movies" items={catalog.topRatedMovies} icon={<RowIcon Icon={Star} color="var(--accent-gold)" />} category="movie" />
        <ContentRow title="Now Playing" items={catalog.nowPlaying} icon={<RowIcon Icon={PlayCircle} />} category="movie" />
        <ContentRow title="Filipino Media" items={catalog.filipinoMedia} icon={<RowIcon Icon={Globe} color="#f5c518" />} category="tv" />
        <ContentRow title="Top Rated TV" items={catalog.topRatedTV} icon={<RowIcon Icon={Trophy} color="var(--accent-gold)" />} category="tv" />
        <ContentRow title="Action Movies" items={catalog.actionMovies} icon={<RowIcon Icon={Zap} color="#ff6b35" />} category="movie" />
        <ContentRow title="Sci-Fi" items={catalog.sciFiMovies} icon={<RowIcon Icon={Rocket} color="#4facfe" />} category="movie" />
        <ContentRow title="Comedy" items={catalog.comedyMovies} icon={<RowIcon Icon={Laugh} color="#46d369" />} category="movie" />
        <ContentRow title="Horror" items={catalog.horrorMovies} icon={<RowIcon Icon={Skull} color="#9b59b6" />} category="movie" />
        <ContentRow title="Upcoming" items={catalog.upcoming} icon={<RowIcon Icon={CalendarDays} />} category="movie" />
        <ContentRow title="Airing Today" items={catalog.airingToday} icon={<RowIcon Icon={Radio} color="#4facfe" />} landscape category="tv" />
      </div>
    </motion.div>
  );
}
