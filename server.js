import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Load .env only in dev (file must exist). In production, env vars are
// injected by the hosting platform — dotenv is not needed and must not crash.
if (existsSync(new URL('.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))) {
  const { default: dotenv } = await import('dotenv');
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const IS_DEV = process.env.NODE_ENV !== 'production';

// ── Middleware ───────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://www.megicsa.com',
    'https://megicsa.com',
    'https://api.megicsa.com'
  ]
}));
app.use(express.json());

// ── Nodemailer transporter (Hostinger SMTP) ───────────────────────
// Hostinger uses port 465 (SSL) — set secure: true
// Alternative: port 587 with secure: false + STARTTLS
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE !== 'false',  // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ── Validation helpers ────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Strip everything except digits/+ for counting
const phoneDigits = (p) => p.replace(/[^\d]/g, '');

function validateContact({ name, email, phone, message }) {
  const errors = {};

  // Name
  if (!name?.trim()) {
    errors.name = 'Full name is required.';
  } else if (name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  // Email
  if (!email?.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  // Phone (optional — but if provided, must be 7–15 digits)
  if (phone?.trim()) {
    const digits = phoneDigits(phone);
    if (digits.length < 7) {
      errors.phone = 'Phone number is too short (min 7 digits).';
    } else if (digits.length > 15) {
      errors.phone = 'Phone number is too long (max 15 digits).';
    }
  }

  // Message
  if (!message?.trim()) {
    errors.message = 'Message is required.';
  } else if (message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  }

  return errors;
}

// ── POST /api/ping  (simple test — two fields) ───────────────────
// curl -X POST https://api.megicsa.com/api/ping \
//      -H "Content-Type: application/json" \
//      -d '{"name":"Alice","message":"hello"}'
app.post('/api/ping', (req, res) => {
  const { name, message } = req.body ?? {};
  return res.status(200).json({
    success: true,
    received: { name: name ?? null, message: message ?? null },
    reply: `Hello ${name ?? 'stranger'} user, your message "${message ?? ''}" was received!`,
    timestamp: new Date().toISOString(),
  });
});

// ── POST /api/ping  (simple test endpoint) ───────────────────────
// Body: { "name": "Alice", "message": "hello" }
app.post("/api/ping", (req, res) => {
  const { name, message } = req.body ?? {};
  res.status(200).json({
    success: true,
    received: { name: name ?? null, message: message ?? null },
    reply: `Hello ${name ?? "stranger"}, got your message: "${message ?? ""}"`,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`✅  API server running → http://localhost:${PORT}`);
  console.log(`   SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} | user: ${process.env.SMTP_USER}`);
});
