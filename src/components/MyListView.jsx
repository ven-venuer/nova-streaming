import React, { useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Clock, History, Play, X, Trash2, Tv } from 'lucide-react';
import { AppContext } from '../App.jsx';
import { TitleCard } from './ContentRow.jsx';

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(ts).toLocaleDateString();
}

function HistoryCard({ entry, onResume, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        position: 'relative', borderRadius: 8, overflow: 'hidden',
        background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer', transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
      onClick={onResume}
    >
      {/* Poster */}
      <div style={{ position: 'relative' }}>
        <img
          src={entry.poster || entry.backdrop}
          alt={entry.title}
          style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
        {/* Episode badge */}
        {entry.type === 'tv' && entry.season && (
          <div style={{
            position: 'absolute', top: 8, left: 8, padding: '3px 8px',
            borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1,
            background: 'var(--accent-primary)', color: 'white',
          }}>
            S{entry.season} E{entry.episode}
          </div>
        )}
        {/* Play overlay */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s',
        }} className="history-play-overlay">
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--accent-primary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Play size={20} fill="white" color="white" />
          </div>
        </div>
        {/* Remove button */}
        <div
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{
            position: 'absolute', top: 8, right: 8, width: 24, height: 24,
            borderRadius: '50%', background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s',
          }}
          className="history-remove-btn"
        >
          <X size={12} color="white" />
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: '10px 10px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={10} />
          {timeAgo(entry.watchedAt)}
        </div>
      </div>
    </motion.div>
  );
}

const TABS = [
  { key: 'mylist', label: 'My List', icon: Film },
  { key: 'continue', label: 'Continue Watching', icon: Play },
  { key: 'history', label: 'Watch History', icon: History },
];

export default function MyListView() {
  const {
    allTitles, myList, setCurrentView,
    watchHistory, removeFromHistory, clearHistory, playTitle,
  } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('mylist');

  const listItems = allTitles.filter(t => myList.includes(t.id));

  // Continue watching: dedupe by ID (most recent entry per title)
  const continueItems = [];
  const seenIds = new Set();
  for (const h of watchHistory) {
    if (!seenIds.has(h.id)) {
      seenIds.add(h.id);
      continueItems.push(h);
    }
  }

  const handleResume = (entry) => {
    // Build a minimal item object to pass to playTitle
    const item = allTitles.find(t => (t.tmdbId || t.id) === entry.id) || {
      id: entry.id, tmdbId: entry.id, type: entry.type, title: entry.title,
      poster: entry.poster, backdrop: entry.backdrop,
    };
    playTitle(item, entry.season || 1, entry.episode || 1);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} style={{ paddingTop: 100 }}>
      <h1 className="font-display" style={{ fontSize: 32, padding: '0 clamp(24px,5vw,80px)', marginBottom: 8 }}>My List</h1>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0, padding: '0 clamp(24px,5vw,80px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 24,
        overflowX: 'auto',
      }} className="no-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          const count = tab.key === 'mylist' ? listItems.length
            : tab.key === 'continue' ? continueItems.length
            : watchHistory.length;
          return (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '14px 20px', cursor: 'pointer', position: 'relative',
                display: 'flex', alignItems: 'center', gap: 8,
                color: active ? 'white' : 'var(--text-muted)',
                fontSize: 14, fontWeight: active ? 600 : 400,
                transition: 'color 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <Icon size={16} />
              {tab.label}
              {count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                  background: active ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                  color: 'white', minWidth: 18, textAlign: 'center',
                }}>{count}</span>
              )}
              {active && (
                <motion.div layoutId="mylist-tab-indicator" style={{
                  position: 'absolute', bottom: -1, left: 0, right: 0,
                  height: 2, background: 'var(--accent-primary)', borderRadius: 1,
                }} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* MY LIST TAB */}
        {activeTab === 'mylist' && (
          <motion.div key="mylist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {listItems.length === 0 ? (
              <div className="empty-state">
                <Film size={48} className="empty-icon" />
                <div className="empty-title">Your list is empty</div>
                <div className="empty-sub">Add movies and shows to your list to watch them later</div>
                <button onClick={() => setCurrentView('home')} style={{
                  padding: '10px 28px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)', color: 'white', cursor: 'pointer',
                  fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: 2, transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 8,
                }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                   onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}>
                  <Film size={14} /> BROWSE CONTENT
                </button>
              </div>
            ) : (
              <div className="browse-grid">
                {listItems.map((item, i) => (
                  <div key={item.id} className="card-animate" style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                    <TitleCard item={item} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* CONTINUE WATCHING TAB */}
        {activeTab === 'continue' && (
          <motion.div key="continue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {continueItems.length === 0 ? (
              <div className="empty-state">
                <Play size={48} className="empty-icon" />
                <div className="empty-title">Nothing here yet</div>
                <div className="empty-sub">Start watching something and it will appear here for easy resuming</div>
                <button onClick={() => setCurrentView('home')} style={{
                  padding: '10px 28px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)', color: 'white', cursor: 'pointer',
                  fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: 2, transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 8,
                }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                   onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}>
                  <Play size={14} /> START WATCHING
                </button>
              </div>
            ) : (
              <div className="browse-grid">
                <AnimatePresence>
                  {continueItems.map((entry, i) => (
                    <HistoryCard
                      key={`${entry.id}-${entry.season}-${entry.episode}`}
                      entry={entry}
                      onResume={() => handleResume(entry)}
                      onRemove={() => removeFromHistory(entry.id, entry.season, entry.episode)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* WATCH HISTORY TAB */}
        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {watchHistory.length === 0 ? (
              <div className="empty-state">
                <History size={48} className="empty-icon" />
                <div className="empty-title">No watch history</div>
                <div className="empty-sub">Your viewing history will be recorded here</div>
                <button onClick={() => setCurrentView('home')} style={{
                  padding: '10px 28px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)', color: 'white', cursor: 'pointer',
                  fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: 2, transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 8,
                }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                   onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}>
                  <Film size={14} /> BROWSE CONTENT
                </button>
              </div>
            ) : (
              <>
                {/* Clear all button */}
                <div style={{ padding: '0 clamp(24px,5vw,80px)', marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={clearHistory}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 6, border: '1px solid rgba(229,9,20,0.3)',
                      background: 'rgba(229,9,20,0.08)', color: 'var(--accent-primary)',
                      fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(229,9,20,0.08)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                  >
                    <Trash2 size={14} /> Clear All History
                  </button>
                </div>
                <div className="browse-grid">
                  <AnimatePresence>
                    {watchHistory.map((entry, i) => (
                      <HistoryCard
                        key={`${entry.id}-${entry.season}-${entry.episode}-${entry.watchedAt}`}
                        entry={entry}
                        onResume={() => handleResume(entry)}
                        onRemove={() => removeFromHistory(entry.id, entry.season, entry.episode)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
