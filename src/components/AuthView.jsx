import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
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

export default function AuthView({ onLogin }) {
  const ctx = useContext(AppContext);
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'verify-register' | 'forgot' | 'verify-reset' | 'new-password'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  function getAccounts() {
    try { return JSON.parse(localStorage.getItem('nova-accounts')) || []; }
    catch { return []; }
  }
  function saveAccounts(accounts) {
    localStorage.setItem('nova-accounts', JSON.stringify(accounts));
  }

  // ── Login ──
  function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) { setError('Enter your username and password.'); return; }
    const accounts = getAccounts();
    const account = accounts.find(a => a.username.toLowerCase() === username.trim().toLowerCase());
    if (!account) { setError('Account not found. Register first.'); return; }
    if (account.passwordHash !== simpleHash(password)) { setError('Incorrect password.'); return; }
    onLogin(account);
  }

  // ── Register Step 1: Send verification email ──
  async function handleRegisterSendCode(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim() || !email.trim()) { setError('All fields are required.'); return; }
    if (username.trim().length < 3) { setError('Username must be at least 3 characters.'); return; }
    if (password.trim().length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (!email.includes('@')) { setError('Enter a valid email address.'); return; }
    const accounts = getAccounts();
    if (accounts.find(a => a.username.toLowerCase() === username.trim().toLowerCase())) {
      setError('That username is already taken.'); return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          passwordHash: simpleHash(password),
          type: 'register',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviewUrl(data.previewUrl);
      setMode('verify-register');
    } catch (err) {
      setError(err.message || 'Failed to send verification email. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  // ── Register Step 2: Verify code and create account ──
  async function handleVerifyRegister(e) {
    e.preventDefault();
    setError('');
    if (verifyCode.length !== 6) { setError('Enter the 6-digit code from your email.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Code verified — create the account
      const newAccount = {
        username: data.username || username.trim(),
        email: email.trim(),
        passwordHash: data.passwordHash || simpleHash(password),
        createdAt: new Date().toISOString(),
      };
      const accounts = getAccounts();
      accounts.push(newAccount);
      saveAccounts(accounts);
      localStorage.setItem(`nova-${newAccount.username}-mylist`, JSON.stringify([]));
      localStorage.setItem(`nova-${newAccount.username}-profile`, JSON.stringify({ name: newAccount.username, email: newAccount.email, plan: 'Premium' }));
      onLogin(newAccount);
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot Password Step 1: Send reset code ──
  async function handleForgotSendCode(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Enter your email address.'); return; }
    const accounts = getAccounts();
    const account = accounts.find(a => a.email?.toLowerCase() === email.trim().toLowerCase());
    if (!account) { setError('No account found with that email.'); return; }
    setUsername(account.username);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), username: account.username, type: 'reset' }),
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

  // ── Forgot Password Step 3: Set new password ──
  function handleSetNewPassword(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 4) { setError('Password must be at least 4 characters.'); return; }
    const accounts = getAccounts();
    const idx = accounts.findIndex(a => a.email?.toLowerCase() === email.trim().toLowerCase());
    if (idx === -1) { setError('Account not found.'); return; }
    accounts[idx].passwordHash = simpleHash(newPassword);
    saveAccounts(accounts);
    setMode('login');
    setPassword('');
    setError('');
    setVerifyCode('');
    setPreviewUrl(null);
    // Show success briefly
    setError('✅ Password changed! Sign in with your new password.');
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
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" style={inputStyle} />
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
            <button type="submit" style={{ ...btnStyle, marginTop: 24 }}>SIGN IN</button>
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
          <form onSubmit={handleRegisterSendCode}>
            {backBtn('login')}
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>Create your account. We'll send a verification code to your email.</div>
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
              {loading ? 'SENDING...' : 'SEND VERIFICATION CODE'}
            </button>
          </form>
        )}

        {/* ═══ VERIFY REGISTER ═══ */}
        {mode === 'verify-register' && (
          <form onSubmit={handleVerifyRegister}>
            {backBtn('register')}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Mail size={40} color="var(--accent-primary)" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Check your email</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                We sent a 6-digit verification code to <span style={{ color: 'white' }}>{email}</span>
              </div>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                  View email (Ethereal test preview)
                </a>
              )}
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Verification Code</label>
              <input value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6}
                style={{ ...inputStyle, textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: 700, fontFamily: 'DM Mono' }} />
            </div>
            {error && <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)', fontSize: 13, color: '#ff6b7a' }}>{error}</div>}
            <button type="submit" disabled={loading || verifyCode.length !== 6} style={{ ...btnStyle, marginTop: 24, opacity: (loading || verifyCode.length !== 6) ? 0.6 : 1 }}>
              {loading ? 'VERIFYING...' : 'VERIFY & CREATE ACCOUNT'}
            </button>
          </form>
        )}

        {/* ═══ FORGOT PASSWORD ═══ */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSendCode}>
            {backBtn('login')}
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>Enter the email you registered with. We'll send a reset code.</div>
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
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choose a new password for <span style={{ color: 'white' }}>{username}</span></div>
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
            <button type="submit" style={{ ...btnStyle, marginTop: 24 }}>SET NEW PASSWORD</button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
