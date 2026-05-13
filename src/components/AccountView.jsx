import React, { useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Eye as EyeIcon, Clock, Film, Tv, Trash2, Save, Lock, Mail, EyeOff } from 'lucide-react';
import { AppContext } from '../App.jsx';

const API_BASE = '/api';

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

function ChangePasswordCard({ currentUser }) {
  const [step, setStep] = useState('idle'); // 'idle' | 'sending' | 'verify' | 'new-pw' | 'done'
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  async function sendCode() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, username: currentUser.username, type: 'reset' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviewUrl(data.previewUrl);
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Failed to send email. Is the auth server running?');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setError('');
    if (code.length !== 6) { setError('Enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('new-pw');
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  function saveNewPassword() {
    setError('');
    if (newPw.length < 4) { setError('Password must be at least 4 characters.'); return; }
    try {
      const accounts = JSON.parse(localStorage.getItem('nova-accounts')) || [];
      const idx = accounts.findIndex(a => a.username === currentUser.username);
      if (idx !== -1) {
        accounts[idx].passwordHash = simpleHash(newPw);
        localStorage.setItem('nova-accounts', JSON.stringify(accounts));
      }
    } catch {}
    setStep('done');
    setTimeout(() => { setStep('idle'); setCode(''); setNewPw(''); setPreviewUrl(null); }, 3000);
  }

  const btnStyle = {
    padding: '10px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontFamily: 'DM Sans', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
    transition: 'all 0.2s',
  };

  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 12, padding: 24,
      border: '1px solid rgba(255,255,255,0.07)', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Lock size={18} color="var(--accent-primary)" />
        <div style={{ fontSize: 16, fontWeight: 600 }}>Change Password</div>
      </div>

      {step === 'idle' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            We'll send a verification code to <span style={{ color: 'white' }}>{currentUser.email}</span> to confirm it's you.
          </div>
          {error && <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)', fontSize: 13, color: '#ff6b7a' }}>{error}</div>}
          <button onClick={sendCode} disabled={loading} style={{ ...btnStyle, background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', opacity: loading ? 0.6 : 1 }}>
            <Mail size={14} /> {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </>
      )}

      {step === 'verify' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Enter the 6-digit code sent to <span style={{ color: 'white' }}>{currentUser.email}</span>
          </div>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', marginBottom: 12, fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'underline' }}>
              View email (Ethereal test preview)
            </a>
          )}
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000" maxLength={6}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 6, marginBottom: 12,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'white', fontFamily: 'DM Mono', fontSize: 22, letterSpacing: 8,
              textAlign: 'center', outline: 'none',
            }} />
          {error && <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)', fontSize: 13, color: '#ff6b7a' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={verifyCode} disabled={loading || code.length !== 6} style={{ ...btnStyle, background: 'var(--accent-primary)', color: 'white', opacity: (loading || code.length !== 6) ? 0.6 : 1 }}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button onClick={() => { setStep('idle'); setCode(''); setError(''); }} style={{ ...btnStyle, background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Cancel
            </button>
          </div>
        </>
      )}

      {step === 'new-pw' && (
        <>
          <div style={{ fontSize: 13, color: '#46d369', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ Email verified. Enter your new password.
          </div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="New password" type={showPw ? 'text' : 'password'}
              style={{
                width: '100%', padding: '12px 44px 12px 14px', borderRadius: 6,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'white', fontFamily: 'DM Sans', fontSize: 14, outline: 'none',
              }} />
            <div onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              {showPw ? <EyeOff size={16} /> : <EyeIcon size={16} />}
            </div>
          </div>
          {error && <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)', fontSize: 13, color: '#ff6b7a' }}>{error}</div>}
          <button onClick={saveNewPassword} style={{ ...btnStyle, background: 'var(--accent-primary)', color: 'white' }}>
            <Save size={14} /> Save New Password
          </button>
        </>
      )}

      {step === 'done' && (
        <div style={{ fontSize: 14, color: '#46d369', display: 'flex', alignItems: 'center', gap: 8 }}>
          ✓ Password changed successfully!
        </div>
      )}
    </div>
  );
}

export default function AccountView() {
  const { myList, catalog, currentUser, userProfile, setUserProfile, handleSignOut } = useContext(AppContext);

  const [profile, setProfile] = useState(() => userProfile || { name: currentUser?.username || '', email: currentUser?.email || '', plan: 'Premium' });
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile]);

  const totalWatched = catalog.trending.length + catalog.popularMovies.length;

  const handleSave = () => {
    setUserProfile(profile);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const stats = [
    { icon: <Film size={20} />, label: 'Movies in List', value: myList.filter(id => {
      const item = Object.values(catalog).flat().find(t => t.id === id);
      return item && item.type === 'movie';
    }).length },
    { icon: <Tv size={20} />, label: 'Shows in List', value: myList.filter(id => {
      const item = Object.values(catalog).flat().find(t => t.id === id);
      return item && item.type === 'tv';
    }).length },
    { icon: <EyeIcon size={20} />, label: 'Titles Browsed', value: totalWatched },
    { icon: <Clock size={20} />, label: 'Member Since', value: currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ paddingTop: 100, minHeight: '100vh', background: 'var(--bg-void)' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px' }}>

        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 36, letterSpacing: 2, marginBottom: 32 }}>Account</h1>

        {/* Profile Card */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: 12, padding: 32,
          border: '1px solid rgba(255,255,255,0.07)', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, fontFamily: 'Bebas Neue', letterSpacing: 2,
            }}>
              {(profile.name || currentUser?.username || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{profile.name || currentUser?.username}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>@{currentUser?.username}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Crown size={14} color="var(--accent-gold)" /> {profile.plan} Plan
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Display Name</label>
              <input value={profile.name} disabled={!editing}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 6,
                  background: editing ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${editing ? 'var(--accent-primary)' : 'rgba(255,255,255,0.07)'}`,
                  color: 'white', fontFamily: 'DM Sans', fontSize: 14, outline: 'none', transition: 'all 0.2s',
                }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Email</label>
              <input value={profile.email} disabled={!editing}
                onChange={e => setProfile({ ...profile, email: e.target.value })}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 6,
                  background: editing ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${editing ? 'var(--accent-primary)' : 'rgba(255,255,255,0.07)'}`,
                  color: 'white', fontFamily: 'DM Sans', fontSize: 14, outline: 'none', transition: 'all 0.2s',
                }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Username (read-only)</label>
              <div style={{
                padding: '10px 14px', borderRadius: 6,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                color: 'var(--text-secondary)', fontSize: 14,
              }}>
                {currentUser?.username}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Subscription</label>
              <div style={{
                padding: '10px 14px', borderRadius: 6,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                color: 'var(--text-secondary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Crown size={16} color="var(--accent-gold)" /> {profile.plan}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={{
                padding: '10px 24px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer',
                fontFamily: 'DM Sans', fontSize: 13, transition: 'all 0.2s',
              }}>
                Edit Profile
              </button>
            ) : (
              <>
                <button onClick={handleSave} style={{
                  padding: '10px 24px', borderRadius: 6, border: 'none',
                  background: 'var(--accent-primary)', color: 'white', cursor: 'pointer',
                  fontFamily: 'DM Sans', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Save size={14} /> Save Changes
                </button>
                <button onClick={() => { setEditing(false); setProfile(userProfile || profile); }} style={{
                  padding: '10px 24px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                  fontFamily: 'DM Sans', fontSize: 13,
                }}>
                  Cancel
                </button>
              </>
            )}
          </div>
          {saved && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#46d369', display: 'flex', alignItems: 'center', gap: 6 }}>
              ✓ Profile saved successfully
            </div>
          )}
        </div>

        {/* Change Password */}
        <ChangePasswordCard currentUser={currentUser} />

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              style={{
                background: 'var(--bg-surface)', borderRadius: 10, padding: '20px',
                border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 14,
              }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'rgba(229,9,20,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)',
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Danger Zone */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: 12, padding: 24,
          border: '1px solid rgba(229,9,20,0.15)', marginBottom: 48,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--accent-primary)' }}>Danger Zone</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Delete your account and all associated data. This cannot be undone.
          </div>
          <button onClick={() => {
            if (window.confirm('Are you sure? This will permanently delete your account and all data.')) {
              // Remove all user-scoped data
              const username = currentUser.username;
              localStorage.removeItem(`nova-${username}-mylist`);
              localStorage.removeItem(`nova-${username}-settings`);
              localStorage.removeItem(`nova-${username}-profile`);
              // Remove from accounts list
              try {
                const accounts = JSON.parse(localStorage.getItem('nova-accounts')) || [];
                const filtered = accounts.filter(a => a.username !== username);
                localStorage.setItem('nova-accounts', JSON.stringify(filtered));
              } catch {}
              handleSignOut();
            }
          }} style={{
            padding: '10px 20px', borderRadius: 6, border: '1px solid rgba(229,9,20,0.4)',
            background: 'rgba(229,9,20,0.1)', color: 'var(--accent-primary)', cursor: 'pointer',
            fontFamily: 'DM Sans', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Trash2 size={14} /> Delete Account
          </button>
        </div>
      </div>
    </motion.div>
  );
}
