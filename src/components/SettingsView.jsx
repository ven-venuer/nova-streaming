import React, { useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Volume2, Globe, Bell, Shield, Palette, Save } from 'lucide-react';
import { AppContext } from '../App.jsx';

const Toggle = ({ value, onChange }) => (
  <div onClick={() => onChange(!value)} style={{
    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
    background: value ? 'var(--accent-primary)' : 'rgba(255,255,255,0.15)',
    transition: 'background 0.2s', position: 'relative', flexShrink: 0,
  }}>
    <div style={{
      width: 18, height: 18, borderRadius: '50%', background: 'white',
      position: 'absolute', top: 3,
      left: value ? 23 : 3, transition: 'left 0.2s',
    }} />
  </div>
);

const SettingRow = ({ icon, label, description, children }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 16,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(229,9,20,0.08)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>}
      </div>
    </div>
    <div>{children}</div>
  </div>
);

function defaults() {
  return {
    autoplay: true, autoNextEpisode: true, quality: 'auto', volume: 80,
    language: 'en', subtitles: true, notifications: true, newReleases: true,
    recommendations: false, matureContent: false, accentColor: 'red',
  };
}

export default function SettingsView() {
  const { userSettings, setUserSettings, applyAccentColor, accentColors } = useContext(AppContext);

  const [settings, setSettings] = useState(() => userSettings || defaults());
  const [saved, setSaved] = useState(false);

  // Sync from context if it changes externally
  useEffect(() => {
    if (userSettings) setSettings(userSettings);
  }, [userSettings]);

  const update = (key, val) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    // Apply accent color immediately on pick
    if (key === 'accentColor') {
      applyAccentColor(val);
    }
  };

  const handleSave = () => {
    setUserSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectStyle = {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'white', padding: '8px 14px', borderRadius: 6,
    fontFamily: 'DM Sans', fontSize: 13, cursor: 'pointer', outline: 'none', appearance: 'none',
  };
  const optionStyle = { background: 'var(--bg-elevated)', color: 'white' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ paddingTop: 100, minHeight: '100vh', background: 'var(--bg-void)' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px' }}>

        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 36, letterSpacing: 2, marginBottom: 32 }}>Settings</h1>

        {/* Playback */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: '8px 24px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '16px 0 8px' }}>Playback</div>
          <SettingRow icon={<Monitor size={18} />} label="Auto-play" description="Automatically start playing when you open a title">
            <Toggle value={settings.autoplay} onChange={v => update('autoplay', v)} />
          </SettingRow>
          <SettingRow icon={<Monitor size={18} />} label="Auto Next Episode" description="Automatically play the next episode when one ends">
            <Toggle value={settings.autoNextEpisode} onChange={v => update('autoNextEpisode', v)} />
          </SettingRow>
          <SettingRow icon={<Monitor size={18} />} label="Preferred Quality" description="Choose your default streaming quality">
            <select value={settings.quality} onChange={e => update('quality', e.target.value)} style={selectStyle}>
              <option style={optionStyle} value="auto">Auto</option>
              <option style={optionStyle} value="4k">4K Ultra HD</option>
              <option style={optionStyle} value="1080p">1080p Full HD</option>
              <option style={optionStyle} value="720p">720p HD</option>
              <option style={optionStyle} value="480p">480p SD</option>
            </select>
          </SettingRow>
          <SettingRow icon={<Volume2 size={18} />} label={`Default Volume — ${settings.volume}%`} description="Set your preferred default volume level">
            <input type="range" min="0" max="100" value={settings.volume}
              onChange={e => update('volume', Number(e.target.value))}
              style={{ width: 120, accentColor: 'var(--accent-primary)', cursor: 'pointer' }} />
          </SettingRow>
        </div>

        {/* Language */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: '8px 24px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '16px 0 8px' }}>Language & Accessibility</div>
          <SettingRow icon={<Globe size={18} />} label="Display Language" description="Choose your preferred UI language">
            <select value={settings.language} onChange={e => update('language', e.target.value)} style={selectStyle}>
              <option style={optionStyle} value="en">English</option>
              <option style={optionStyle} value="es">Español</option>
              <option style={optionStyle} value="fr">Français</option>
              <option style={optionStyle} value="de">Deutsch</option>
              <option style={optionStyle} value="ja">日本語</option>
              <option style={optionStyle} value="ko">한국어</option>
            </select>
          </SettingRow>
          <SettingRow icon={<Globe size={18} />} label="Subtitles" description="Show subtitles by default when available">
            <Toggle value={settings.subtitles} onChange={v => update('subtitles', v)} />
          </SettingRow>
        </div>

        {/* Notifications */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: '8px 24px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '16px 0 8px' }}>Notifications</div>
          <SettingRow icon={<Bell size={18} />} label="Push Notifications" description="Receive notifications about your activity">
            <Toggle value={settings.notifications} onChange={v => update('notifications', v)} />
          </SettingRow>
          <SettingRow icon={<Bell size={18} />} label="New Releases" description="Get notified when new movies and shows drop">
            <Toggle value={settings.newReleases} onChange={v => update('newReleases', v)} />
          </SettingRow>
          <SettingRow icon={<Bell size={18} />} label="Recommendations" description="Receive personalized content recommendations">
            <Toggle value={settings.recommendations} onChange={v => update('recommendations', v)} />
          </SettingRow>
        </div>

        {/* Privacy */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: '8px 24px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '16px 0 8px' }}>Privacy & Content</div>
          <SettingRow icon={<Shield size={18} />} label="Mature Content" description="Allow R-rated and mature content to appear">
            <Toggle value={settings.matureContent} onChange={v => update('matureContent', v)} />
          </SettingRow>
        </div>

        {/* Appearance */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: '8px 24px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '16px 0 8px' }}>Appearance</div>
          <SettingRow icon={<Palette size={18} />} label="Accent Color" description="Choose your preferred accent color for the UI">
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(accentColors).map(([key, c]) => (
                <div key={key} onClick={() => update('accentColor', key)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c.primary, cursor: 'pointer',
                  border: settings.accentColor === key ? '2px solid white' : '2px solid transparent',
                  transition: 'all 0.2s', boxShadow: settings.accentColor === key ? `0 0 12px ${c.primary}` : 'none',
                }} />
              ))}
            </div>
          </SettingRow>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
          <button onClick={handleSave} style={{
            padding: '12px 32px', borderRadius: 8, border: 'none',
            background: 'var(--accent-primary)', color: 'white', cursor: 'pointer',
            fontFamily: 'Bebas Neue', fontSize: 18, letterSpacing: 2,
            display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
          }}>
            <Save size={18} /> Save Settings
          </button>
          {saved && (
            <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              style={{ fontSize: 14, color: '#46d369' }}>
              ✓ Settings saved!
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
