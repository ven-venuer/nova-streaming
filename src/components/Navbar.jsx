import React, { useContext, useState, useEffect, useRef } from 'react';
import { Search, Bell, X, User, Settings, LogOut, CheckCircle, Home, Film, Tv, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../App.jsx';
import { searchMulti, img } from '../tmdb.js';

export default function Navbar() {
  const { currentView, setCurrentView, searchQuery, setSearchQuery, setSelectedTitle, currentUser, handleSignOut } = useContext(AppContext);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchMulti(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const links = [
    { key: 'home', label: 'Home' },
    { key: 'movies', label: 'Movies' },
    { key: 'shows', label: 'TV Shows' },
    { key: 'series', label: 'Series' },
    { key: 'mylist', label: 'My List' },
  ];

  return (
    <nav className={`navbar ${scrolled || currentView !== 'home' ? 'scrolled' : ''}`}>
      <div className="logo" onClick={() => { setCurrentView('home'); setSearchQuery(''); setSearchOpen(false); setNotifOpen(false); setProfileOpen(false); }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2L20 12L4 22V2Z"/></svg>
        NOVA
      </div>
      <ul className="nav-links">
        {links.map(l => (
          <li key={l.key} className={currentView === l.key ? 'active' : ''} onClick={() => { setCurrentView(l.key); setSearchQuery(''); setSearchOpen(false); setNotifOpen(false); setProfileOpen(false); setSearchResults([]); }}>
            {l.label}
          </li>
        ))}
      </ul>
      <div className="nav-right">
        <div style={{ position: 'relative' }}>
          <div className="search-bar" style={{ width: searchOpen ? 'min(280px, calc(100vw - 140px))' : 0, opacity: searchOpen ? 1 : 0, padding: searchOpen ? '0 12px' : 0 }}>
            <Search size={16} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
            <input placeholder="Search movies, TV shows..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchOpen && <X size={16} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }} />}
          </div>
          {/* Search results dropdown */}
          <AnimatePresence>
            {searchOpen && searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  width: 'min(360px, calc(100vw - 32px))', maxHeight: 480, overflowY: 'auto', borderRadius: 8,
                  background: 'rgba(15,15,26,0.98)', border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(20px)', zIndex: 100,
                }}>
                {searchResults.slice(0, 8).map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ display: 'flex', gap: 12, padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onClick={() => { setSelectedTitle(item); setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {item.poster && <img src={item.poster} alt="" style={{ width: 40, height: 60, objectFit: 'cover', borderRadius: 4 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.type === 'tv' ? 'TV Show' : 'Movie'} · {item.year} · ★ {item.score}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!searchOpen && <div className="nav-icon" onClick={() => { setSearchOpen(true); setNotifOpen(false); setProfileOpen(false); }}><Search size={18} /></div>}
        
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <div className="nav-icon" onClick={() => { setNotifOpen(!notifOpen); setSearchOpen(false); setProfileOpen(false); }}>
            <Bell size={18} />
            {!notifRead && <div style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-primary)' }} />}
          </div>
          <AnimatePresence>
            {notifOpen && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{
                  position: 'absolute', top: '100%', right: -60, marginTop: 12,
                  width: 'min(320px, calc(100vw - 32px))', borderRadius: 8, background: 'rgba(15,15,26,0.98)',
                  border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', zIndex: 100,
                  overflow: 'hidden'
                }}>
                <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>Notifications</div>
                <div style={{ padding: '12px 16px', display: 'flex', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 40, height: 40, borderRadius: 4, background: 'rgba(229,9,20,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={20} color="var(--accent-primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Welcome to NOVA</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>Enjoy the ultimate cinematic streaming experience.</div>
                  </div>
                </div>
                <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: notifRead ? '#46d369' : 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => !notifRead && (e.currentTarget.style.color = 'white')} onMouseLeave={e => !notifRead && (e.currentTarget.style.color = 'var(--text-muted)')} onClick={() => setNotifRead(true)}>
                  {notifRead ? '✓ All caught up' : 'Mark all as read'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div style={{ position: 'relative' }}>
          <div className="avatar" onClick={() => { setProfileOpen(!profileOpen); setSearchOpen(false); setNotifOpen(false); }}>
            {currentUser ? currentUser.username.substring(0, 2).toUpperCase() : <User size={16} />}
          </div>
          <AnimatePresence>
            {profileOpen && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 12,
                  width: 200, borderRadius: 8, background: 'rgba(15,15,26,0.98)',
                  border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', zIndex: 100,
                  overflow: 'hidden'
                }}>

                {currentUser ? (
                  <>
                    {/* Logged-in header */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{currentUser.username}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{currentUser.email}</div>
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => { setCurrentView('account'); setProfileOpen(false); }}>
                      <User size={16} color="var(--text-secondary)" /> <span style={{ fontSize: 13 }}>Account</span>
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => { setCurrentView('settings'); setProfileOpen(false); }}>
                      <Settings size={16} color="var(--text-secondary)" /> <span style={{ fontSize: 13 }}>Settings</span>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--accent-primary)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(229,9,20,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => { setProfileOpen(false); handleSignOut(); }}>
                      <LogOut size={16} /> <span style={{ fontSize: 13 }}>Sign Out</span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Guest */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12, color: 'var(--text-muted)' }}>
                      Browsing as Guest
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => { setCurrentView('settings'); setProfileOpen(false); }}>
                      <Settings size={16} color="var(--text-secondary)" /> <span style={{ fontSize: 13 }}>Settings</span>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--accent-primary)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(229,9,20,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => { setCurrentView('login'); setProfileOpen(false); }}>
                      <User size={16} /> <span style={{ fontSize: 13 }}>Sign In / Register</span>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}

export function MobileNav() {
  const { currentView, setCurrentView, searchQuery, setSearchQuery } = useContext(AppContext);
  const tabs = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'movies', label: 'Movies', icon: Film },
    { key: 'shows', label: 'Shows', icon: Tv },
    { key: 'mylist', label: 'My List', icon: Heart },
  ];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
      background: 'rgba(8,8,16,0.95)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', justifyContent: 'space-around', padding: '8px 0 env(safe-area-inset-bottom, 8px)',
    }} className="mobile-bottom-nav">
      {tabs.map(t => {
        const Icon = t.icon;
        const active = currentView === t.key;
        return (
          <div key={t.key} onClick={() => { setCurrentView(t.key); setSearchQuery(''); }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              cursor: 'pointer', padding: '4px 12px', fontSize: 10, fontWeight: 500,
              color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
              transition: 'color 0.2s',
            }}>
            <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            {t.label}
          </div>
        );
      })}
    </div>
  );
}
