import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

// ── In-memory store for verification codes (resets on server restart) ──
const pendingCodes = new Map(); // key: email, value: { code, type, username, passwordHash, expiresAt }

// ── Email transporter ──
let transporter;

async function initTransporter() {
  // Check for real SMTP config in environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    console.log(`📧 Using real SMTP: ${process.env.SMTP_HOST}`);
  } else {
    // Use Ethereal (free test email service - emails viewable at ethereal.email)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 Using Ethereal test email (no real emails sent)');
    console.log(`   View sent emails at: https://ethereal.email/login`);
    console.log(`   Login: ${testAccount.user}`);
    console.log(`   Pass:  ${testAccount.pass}`);
  }
}

function generateCode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendVerificationEmail(to, code, type) {
  const subject = type === 'register'
    ? 'NOVA — Verify your email'
    : 'NOVA — Password reset code';

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f0f1a; color: white; border-radius: 12px; overflow: hidden; border: 1px solid #222;">
      <div style="padding: 32px; text-align: center; background: linear-gradient(135deg, #e50914 0%, #b20710 100%);">
        <h1 style="margin: 0; font-size: 36px; letter-spacing: 4px;">NOVA</h1>
      </div>
      <div style="padding: 32px; text-align: center;">
        <p style="color: #a0a0b8; font-size: 14px; margin-bottom: 24px;">
          ${type === 'register' ? 'Welcome! Enter this code to verify your email and create your account:' : 'Enter this code to reset your password:'}
        </p>
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #e50914; background: rgba(229,9,20,0.1); padding: 16px 0; border-radius: 8px; border: 1px solid rgba(229,9,20,0.3);">
          ${code}
        </div>
        <p style="color: #505068; font-size: 12px; margin-top: 24px;">
          This code expires in 10 minutes. If you didn't request this, ignore this email.
        </p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: '"NOVA Streaming" <noreply@nova.stream>',
    to,
    subject,
    html,
  });

  // For Ethereal, log the preview URL
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`📨 Preview email: ${previewUrl}`);
  }

  return { messageId: info.messageId, previewUrl };
}

// ── Routes ──

// Send verification code for registration
app.post('/api/auth/send-code', async (req, res) => {
  const { email, username, passwordHash, type } = req.body;

  if (!email || !type) {
    return res.status(400).json({ error: 'Email and type are required.' });
  }

  const code = generateCode();
  pendingCodes.set(email.toLowerCase(), {
    code,
    type,
    username,
    passwordHash,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
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

// Verify code
app.post('/api/auth/verify-code', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  const pending = pendingCodes.get(email.toLowerCase());

  if (!pending) {
    return res.status(400).json({ error: 'No verification code found. Request a new one.' });
  }

  if (Date.now() > pending.expiresAt) {
    pendingCodes.delete(email.toLowerCase());
    return res.status(400).json({ error: 'Code expired. Request a new one.' });
  }

  if (pending.code !== code) {
    return res.status(400).json({ error: 'Incorrect code. Try again.' });
  }

  // Code is correct
  const result = {
    success: true,
    type: pending.type,
    username: pending.username,
    passwordHash: pending.passwordHash,
  };

  pendingCodes.delete(email.toLowerCase());
  res.json(result);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', pending: pendingCodes.size });
});

// ── Start ──
const PORT = process.env.PORT || 3001;

initTransporter();

// Only listen if run directly (e.g., node api/index.js)
if (process.env.NODE_ENV !== 'production' && process.argv[1] && process.argv[1].endsWith('index.js')) {
  app.listen(PORT, () => {
    console.log(`\n🚀 NOVA Auth Server running on http://localhost:${PORT}`);
    console.log(`   POST /api/auth/send-code  — Send verification email`);
    console.log(`   POST /api/auth/verify-code — Verify code\n`);
  });
}

// Export for Vercel serverless
export default app;
