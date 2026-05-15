import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { getDb } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// ── In-memory store for verification codes (short-lived, OK for serverless) ──
const pendingCodes = new Map();

// ── Email transporter ──
let transporter;

async function initTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    console.log(`📧 Using real SMTP: ${process.env.SMTP_HOST}`);
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email', port: 587, secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      console.log('📧 Using Ethereal test email');
    } catch {
      console.warn('⚠️  Could not create email transporter');
    }
  }
}

function generateCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function sendVerificationEmail(to, code, type) {
  if (!transporter) throw new Error('Email not configured');
  const subject = type === 'register' ? 'NOVA — Verify your email' : 'NOVA — Password reset code';
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f0f1a; color: white; border-radius: 12px; overflow: hidden; border: 1px solid #222;">
      <div style="padding: 32px; text-align: center; background: linear-gradient(135deg, #e50914 0%, #b20710 100%);">
        <h1 style="margin: 0; font-size: 36px; letter-spacing: 4px;">NOVA</h1>
      </div>
      <div style="padding: 32px; text-align: center;">
        <p style="color: #a0a0b8; font-size: 14px; margin-bottom: 24px;">
          ${type === 'register' ? 'Welcome! Enter this code to verify your email:' : 'Enter this code to reset your password:'}
        </p>
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #e50914; background: rgba(229,9,20,0.1); padding: 16px 0; border-radius: 8px; border: 1px solid rgba(229,9,20,0.3);">
          ${code}
        </div>
        <p style="color: #505068; font-size: 12px; margin-top: 24px;">This code expires in 10 minutes.</p>
      </div>
    </div>
  `;
  const info = await transporter.sendMail({
    from: '"NOVA Streaming" <noreply@nova.stream>', to, subject, html,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log(`📨 Preview: ${previewUrl}`);
  return { messageId: info.messageId, previewUrl };
}

// ═══════════════════════════════════════════════════
//  AUTH ROUTES (MongoDB-backed)
// ═══════════════════════════════════════════════════

// ── Register ──
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    const db = await getDb();
    const users = db.collection('users');

    // Check duplicates
    const existingUser = await users.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${username}$`, 'i') } },
        { email: email.toLowerCase() },
      ]
    });
    if (existingUser) {
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        return res.status(409).json({ error: 'Username already taken.' });
      }
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    // Create account
    const account = {
      username: username.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      plan: 'Premium',
      createdAt: new Date(),
      myList: [],
      watchHistory: [],
    };
    await users.insertOne(account);

    // Return safe user object (no password hash)
    res.json({
      success: true,
      account: { username: account.username, email: account.email, plan: account.plan, createdAt: account.createdAt },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── Login ──
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const db = await getDb();
    const users = db.collection('users');

    // Find by username or email
    const input = username.trim().toLowerCase();
    const user = await users.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${input}$`, 'i') } },
        { email: input },
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Account not found. Register first.' });
    }

    if (user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    // Return account + user data
    res.json({
      success: true,
      account: { username: user.username, email: user.email, plan: user.plan || 'Premium', createdAt: user.createdAt },
      data: { myList: user.myList || [], watchHistory: user.watchHistory || [], settings: user.settings || null, profile: user.profile || null },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── Sync user data (myList + watchHistory + settings + profile) ──
app.post('/api/user/sync', async (req, res) => {
  try {
    const { username, myList, watchHistory, settings, profile } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required.' });

    const db = await getDb();
    const update = {};
    if (Array.isArray(myList)) update.myList = myList;
    if (Array.isArray(watchHistory)) update.watchHistory = watchHistory.slice(0, 100);
    if (settings && typeof settings === 'object') update.settings = settings;
    if (profile && typeof profile === 'object') update.profile = profile;

    if (Object.keys(update).length === 0) return res.json({ success: true });

    await db.collection('users').updateOne(
      { username: { $regex: new RegExp(`^${username}$`, 'i') } },
      { $set: update }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync failed.' });
  }
});

// ── Fetch user data ──
app.get('/api/user/data', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username required.' });

    const db = await getDb();
    const user = await db.collection('users').findOne(
      { username: { $regex: new RegExp(`^${username}$`, 'i') } },
      { projection: { myList: 1, watchHistory: 1, settings: 1, profile: 1, _id: 0 } }
    );

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ myList: user.myList || [], watchHistory: user.watchHistory || [], settings: user.settings || null, profile: user.profile || null });
  } catch (err) {
    console.error('Fetch data error:', err);
    res.status(500).json({ error: 'Failed to fetch data.' });
  }
});

// ── Email verification (for future use / optional) ──
app.post('/api/auth/send-code', async (req, res) => {
  const { email, username, passwordHash, type } = req.body;
  if (!email || !type) return res.status(400).json({ error: 'Email and type are required.' });

  const code = generateCode();
  pendingCodes.set(email.toLowerCase(), {
    code, type, username, passwordHash,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  try {
    const result = await sendVerificationEmail(email, code, type);
    console.log(`✅ Code sent to ${email}: ${code}`);
    res.json({ success: true, previewUrl: result.previewUrl || null });
  } catch (err) {
    console.error('Failed to send email:', err);
    res.status(500).json({ error: 'Failed to send verification email.' });
  }
});

app.post('/api/auth/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });

  const pending = pendingCodes.get(email.toLowerCase());
  if (!pending) return res.status(400).json({ error: 'No verification code found. Request a new one.' });
  if (Date.now() > pending.expiresAt) {
    pendingCodes.delete(email.toLowerCase());
    return res.status(400).json({ error: 'Code expired. Request a new one.' });
  }
  if (pending.code !== code) return res.status(400).json({ error: 'Incorrect code. Try again.' });

  const result = { success: true, type: pending.type, username: pending.username, passwordHash: pending.passwordHash };
  pendingCodes.delete(email.toLowerCase());
  res.json(result);
});

// ── Password reset ──
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password required.' });

    const db = await getDb();
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { passwordHash: hashPassword(newPassword) } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Account not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// ── FMovies Streaming Source Extraction (Puppeteer + Sparticuz Chromium) ──
app.get('/api/stream-source', async (req, res) => {
  const { tmdbId, type = 'movie', title } = req.query;
  
  if (!tmdbId && !title) {
    return res.status(400).json({ error: 'tmdbId or title is required' });
  }

  console.log(`[stream-source] Fetching stream for tmdbId: ${tmdbId}, title: ${title}, type: ${type}`);

  let browser;
  
  try {
    const puppeteer = await import('puppeteer-core');
    const chromium = await import('@sparticuz/chromium');
    
    browser = await puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    let netodaGetUrl = null;
    let m3u8Url = null;
    
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const reqUrl = request.url();
      
      if (reqUrl.includes('netoda.tech') && reqUrl.includes('/get/')) {
        netodaGetUrl = reqUrl;
      }
      
      if (reqUrl.includes('.m3u8') && reqUrl.includes('netoda.tech')) {
        m3u8Url = reqUrl;
      }
      
      request.continue();
    });

    // Determine movie URL - either from title search or direct ID
    let movieUrl = null;
    
    if (title) {
      // Search fmoviess for the movie
      console.log(`[stream-source] Searching fmoviess for: ${title}`);
      await page.goto('https://fmoviess.org/', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      // Try search box
      const searchInput = await page.$('#nav-search, input[name="search"], input[type="search"]');
      if (searchInput) {
        await searchInput.click();
        await searchInput.type(title, { delay: 100 });
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 3000));
      } else {
        // Fallback to direct search URL
        await page.goto(`https://fmoviess.org/search/?q=${encodeURIComponent(title)}`, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
        await new Promise(r => setTimeout(r, 3000));
      }
      
      // Find first movie link
      const movieLink = await page.$('a[href*="/film/"]');
      if (movieLink) {
        const href = await movieLink.getAttribute('href');
        movieUrl = href.startsWith('http') ? href : `https://fmoviess.org${href}`;
        console.log(`[stream-source] Found movie URL: ${movieUrl}`);
      }
    } else if (tmdbId) {
      // Try direct URL with TMDB ID
      movieUrl = `https://fmoviess.org/film/${tmdbId}/`;
    }
    
    if (!movieUrl) {
      await browser.close();
      return res.status(404).json({ error: 'Movie not found on fmoviess' });
    }

    // Load movie page
    console.log(`[stream-source] Loading movie page: ${movieUrl}`);
    await page.goto(movieUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Check if page loaded correctly
    const midElement = await page.$('#mid');
    if (!midElement) {
      await browser.close();
      return res.status(404).json({ error: 'Movie page not found on fmoviess' });
    }
    
    const mid = await midElement.getAttribute('data-mid');
    console.log(`[stream-source] Movie page loaded! data-mid: ${mid}`);

    // Click play button to expand player
    console.log('[stream-source] Clicking play button...');
    try {
      const coverImg = await page.$('#cover-img');
      if (coverImg) await coverImg.click();
      await new Promise(r => setTimeout(r, 1500));
      
      const playNowBtn = await page.$('#play-now');
      if (playNowBtn) await playNowBtn.click();
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.log('[stream-source] Click error:', e.message);
    }

    // Select Server 1 or 2
    console.log('[stream-source] Selecting server...');
    try {
      await page.waitForSelector('#srv-1, #srv-2', { visible: true, timeout: 10000 });
      
      let serverBtn = await page.$('#srv-1');
      if (!serverBtn) serverBtn = await page.$('#srv-2');
      
      if (serverBtn) {
        await serverBtn.click();
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      console.log('[stream-source] Server selection error:', e.message);
    }

    // Click play to start video
    console.log('[stream-source] Starting video playback...');
    try {
      const playerArea = await page.$('#player-area, .player-area, #play-btn');
      if (playerArea) await playerArea.click();
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.log('[stream-source] Play error:', e.message);
    }

    // Wait for network requests
    console.log('[stream-source] Waiting for stream request...');
    await new Promise(r => setTimeout(r, 5000));

    // Get the m3u8 URL
    if (netodaGetUrl) {
      console.log('[stream-source] Fetching hash from netoda...');
      try {
        const response = await fetch(netodaGetUrl);
        const hashData = await response.json();
        
        if (hashData && hashData.info) {
          const finalM3u8 = `https://netoda.tech/hls/${hashData.info}/master.m3u8`;
          console.log('[stream-source] SUCCESS! m3u8 URL:', finalM3u8);
          
          await browser.close();
          return res.json({ 
            success: true, 
            url: finalM3u8,
            provider: 'netoda',
            type
          });
        }
      } catch (err) {
        console.log('[stream-source] Error fetching hash:', err.message);
      }
    }
    
    if (m3u8Url) {
      console.log('[stream-source] Got m3u8 directly:', m3u8Url);
      await browser.close();
      return res.json({ 
        success: true, 
        url: m3u8Url,
        provider: 'netoda',
        type
      });
    }

    console.log('[stream-source] Failed to extract m3u8 URL');
    await browser.close();
    return res.status(500).json({ 
      error: 'Could not extract m3u8 URL',
      details: 'No netoda requests were captured'
    });

  } catch (err) {
    console.error('[stream-source] Error:', err.message);
    
    if (browser) {
      await browser.close().catch(() => {});
    }
    
    return res.status(500).json({ 
      error: 'Stream extraction failed',
      details: err.message
    });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.json({ status: 'ok', db: 'disconnected', error: err.message });
  }
});

// ── Start ──
const PORT = process.env.PORT || 3001;

initTransporter();

if (process.env.NODE_ENV !== 'production' && process.argv[1] && process.argv[1].endsWith('index.js')) {
  app.listen(PORT, () => {
    console.log(`\n🚀 NOVA Auth Server running on http://localhost:${PORT}\n`);
  });
}

export default app;
