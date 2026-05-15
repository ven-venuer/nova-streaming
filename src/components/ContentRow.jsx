import React, { useContext, useRef, useState, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, ThumbsUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppContext } from '../App.jsx';

const TitleCard = memo(function TitleCard({ item, landscape }) {
  const { setSelectedTitle, playTitle, toggleMyList, myList } = useContext(AppContext);
  const inList = myList.includes(item.id);
  const [liked, setLiked] = useState(false);
  const scoreColor = item.score >= 8.5 ? 'var(--accent-gold)' : item.score >= 7 ? '#46d369' : 'var(--text-muted)';
  const imgSrc = landscape ? (item.thumbnail || item.backdrop) : (item.poster || item.thumbnail);

  if (!imgSrc) return null;

  return (
    <div className={`title-card ${landscape ? 'landscape' : 'poster'}`} onClick={() => setSelectedTitle(item)}>
      <img src={imgSrc} alt={item.title} loading="lazy" decoding="async" />
      <div className="card-gradient" />
      <div className="card-title">{item.title}</div>
      <div className="card-hover-info">
        <div className="hover-match">{item.matchScore}% Match</div>
        <div className="hover-title">{item.title}</div>
        <div className="hover-meta">
          <span style={{ color: scoreColor }}>★ {item.score}</span> · {item.year} · {item.type === 'tv' ? 'TV' : 'Movie'}
        </div>
        <div className="hover-actions">
          <button className="hover-action-btn play" onClick={e => { e.stopPropagation(); playTitle(item); }}><Play size={14} fill="white" /></button>
          <button className="hover-action-btn" onClick={e => { e.stopPropagation(); toggleMyList(item.id); }} style={inList ? { background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' } : {}}>
            <Plus size={14} style={inList ? { transform: 'rotate(45deg)' } : {}} />
          </button>
          <button className="hover-action-btn" onClick={e => { e.stopPropagation(); setLiked(!liked); }} style={liked ? { background: '#46d369', borderColor: '#46d369' } : {}}><ThumbsUp size={14} /></button>
          <button className="hover-action-btn" onClick={e => { e.stopPropagation(); setSelectedTitle(item); }}><ChevronDown size={14} /></button>
        </div>
        <div style={{ marginTop: 6 }}>{(item.genreNames || item.genre || []).slice(0,2).map(g => <span key={g} className="genre-pill">{g}</span>)}</div>
      </div>
    </div>
  );
});

const ContentRow = memo(function ContentRow({ title, items, icon, landscape, category, targetView }) {
  const { setCurrentView } = useContext(AppContext);
  const ref = useRef(null);
  const scroll = useCallback((dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 600, behavior: 'smooth' });
  }, []);

  if (!items || items.length === 0) return null;

  const handleSeeAll = () => {
    if (targetView) setCurrentView(targetView);
    else if (category === 'tv') setCurrentView('shows');
    else setCurrentView('movies');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div className="content-row" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.5 }}>
      <div className="row-header">
        <div className="row-title">{icon} {title}</div>
        <div className="row-see-all" onClick={handleSeeAll}>See All →</div>
      </div>
      <button className="row-arrow left" onClick={() => scroll(-1)}><ChevronLeft size={24} /></button>
      <div className="row-scroll-container no-scrollbar" ref={ref}>
        {items.map((item, i) => (
          <div key={item.id + '-' + i} className="card-animate" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
            <TitleCard item={item} landscape={landscape} />
          </div>
        ))}
      </div>
      <button className="row-arrow right" onClick={() => scroll(1)}><ChevronRight size={24} /></button>
    </motion.div>
  );
});

export default ContentRow;
export { TitleCard };
