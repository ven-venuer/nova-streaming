import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { AppContext } from '../App.jsx';

const API_BASE = '/api';

export default function AuthView({ onLogin }) {
  const ctx = useContext(AppContext);
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // ── Login (against MongoDB) ──
  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) { setError('Enter your username and password.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Pass account + server data to the app
      onLogin(data.account, data.data);
    } catch (err) {
      setError(err.message || 'Login failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  // ── Register (creates account in MongoDB) ──
  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim() || !email.trim()) { setError('All fields are required.'); return; }
    if (username.trim().length < 3) { setError('Username must be at least 3 characters.'); return; }
    if (password.trim().length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (!email.includes('@')) { setError('Enter a valid email address.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password: password.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Auto-login after registration
      onLogin(data.account, { myList: [], watchHistory: [] });
    } catch (err) {
      setError(err.message || 'Registration failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot Password Step 1: Send reset code ──
  async function handleForgotSendCode(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Enter your email address.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'reset' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviewUrl(data.previewUrl);
      setMode('verify-reset');
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot Password Step 2: Verify code ──
  async function handleVerifyReset(e) {
    e.preventDefault();
    setError('');
    if (verifyCode.length !== 6) { setError('Enter the 6-digit code.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMode('new-password');
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot Password Step 3: Set new password (via API) ──
  async function handleSetNewPassword(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 4) { setError('Password must be at least 4 characters.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), newPassword: newPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMode('login');
      setPassword('');
      setVerifyCode('');
      setPreviewUrl(null);
      setError('✅ Password changed! Sign in with your new password.');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 8,
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'white', fontFamily: 'DM Sans', fontSize: 15, outline: 'none',
    transition: 'border-color 0.2s',
  };

  const btnStyle = {
    width: '100%', padding: '14px', borderRadius: 8, border: 'none',
    background: 'var(--accent-primary)', color: 'white', cursor: 'pointer',
    fontFamily: 'Bebas Neue', fontSize: 18, letterSpacing: 3, transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };

  const backBtn = (to) => (
    <div onClick={() => { setMode(to); setError(''); setVerifyCode(''); setPreviewUrl(null); }}
      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 20 }}>
      <ArrowLeft size={16} /> Back
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-void)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(229,9,20,0.08) 0%, transparent 60%)',
    }}>
      <motion.div key={mode} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{
          width: '100%', maxWidth: 420, padding: '48px 40px', borderRadius: 16,
          background: 'rgba(15,15,26,0.95)', border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
        }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: 'Bebas Neue', fontSize: 48, color: 'var(--accent-primary)',
            letterSpacing: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            textShadow: '0 0 40px rgba(229,9,20,0.4)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2L20 12L4 22V2Z"/></svg>
            NOVA
          </div>
        </div>

        {/* ═══ LOGIN ═══ */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>Welcome back. Sign in to continue.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Username or Email</label>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username or email" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                    type={showPw ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: 44 }} />
                  <div onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </div>
              </div>
            </div>
            {error && <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: error.startsWith('✅') ? 'rgba(70,211,105,0.1)' : 'rgba(229,9,20,0.1)', border: `1px solid ${error.startsWith('✅') ? 'rgba(70,211,105,0.3)' : 'rgba(229,9,20,0.3)'}`, fontSize: 13, color: error.startsWith('✅') ? '#46d369' : '#ff6b7a' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...btnStyle, marginTop: 24, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
              <span onClick={() => { setMode('forgot'); setError(''); }} style={{ color: 'var(--accent-primary)', cursor: 'pointer' }}>Forgot password?</span>
              <span onClick={() => { setMode('register'); setError(''); }} style={{ color: 'var(--accent-primary)', cursor: 'pointer' }}>Register</span>
            </div>
            {ctx && (
              <div onClick={() => ctx.setCurrentView('home')} style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>
                ← Continue as Guest
              </div>
            )}
          </form>
        )}

        {/* ═══ REGISTER ═══ */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            {backBtn('login')}
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>Create your NOVA account.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Choose a password"
                    type={showPw ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: 44 }} />
                  <div onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </div>
              </div>
            </div>
            {error && <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)', fontSize: 13, color: '#ff6b7a' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...btnStyle, marginTop: 24, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </button>
          </form>
        )}

        {/* ═══ FORGOT PASSWORD ═══ */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSendCode}>
            {backBtn('login')}
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>Enter your email to receive a reset code.</div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" style={inputStyle} />
            </div>
            {error && <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)', fontSize: 13, color: '#ff6b7a' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...btnStyle, marginTop: 24, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'SENDING...' : 'SEND RESET CODE'}
            </button>
          </form>
        )}

        {/* ═══ VERIFY RESET ═══ */}
        {mode === 'verify-reset' && (
          <form onSubmit={handleVerifyReset}>
            {backBtn('forgot')}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Mail size={40} color="var(--accent-primary)" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Check your email</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                We sent a password reset code to <span style={{ color: 'white' }}>{email}</span>
              </div>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                  View email (Ethereal test preview)
                </a>
              )}
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Reset Code</label>
              <input value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6}
                style={{ ...inputStyle, textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: 700, fontFamily: 'DM Mono' }} />
            </div>
            {error && <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)', fontSize: 13, color: '#ff6b7a' }}>{error}</div>}
            <button type="submit" disabled={loading || verifyCode.length !== 6} style={{ ...btnStyle, marginTop: 24, opacity: (loading || verifyCode.length !== 6) ? 0.6 : 1 }}>
              {loading ? 'VERIFYING...' : 'VERIFY CODE'}
            </button>
          </form>
        )}

        {/* ═══ SET NEW PASSWORD ═══ */}
        {mode === 'new-password' && (
          <form onSubmit={handleSetNewPassword}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <CheckCircle size={40} color="#46d369" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Email verified!</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choose a new password</div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password"
                  type={showPw ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: 44 }} />
                <div onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
            </div>
            {error && <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)', fontSize: 13, color: '#ff6b7a' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...btnStyle, marginTop: 24, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'SAVING...' : 'SET NEW PASSWORD'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
