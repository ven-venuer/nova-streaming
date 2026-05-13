import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { Film } from 'lucide-react';
import { AppContext } from '../App.jsx';
import { TitleCard } from './ContentRow.jsx';

export default function MyListView() {
  const { allTitles, myList, setCurrentView } = useContext(AppContext);
  const items = allTitles.filter(t => myList.includes(t.id));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} style={{ paddingTop: 100 }}>
      <h1 className="font-display" style={{ fontSize: 32, padding: '0 clamp(24px,5vw,80px)', marginBottom: 24 }}>My List</h1>
      {items.length === 0 ? (
        <div className="empty-state">
          <Film size={64} className="empty-icon" />
          <div className="empty-title">Your list is empty</div>
          <div className="empty-sub">Add movies and shows to your list to watch them later</div>
          <button className="btn-play" onClick={() => setCurrentView('home')}>BROWSE CONTENT</button>
        </div>
      ) : (
        <div className="browse-grid">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <TitleCard item={item} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
