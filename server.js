import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const IS_DEV = process.env.NODE_ENV !== 'production';

// ── Middleware ───────────────────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
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
    // Hostinger sometimes uses self-signed certs in shared hosting
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
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

// ── POST /api/contact ─────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, company, email, phone, country, service, message } = req.body;

  // Server-side validation
  const errors = validateContact({ name, email, phone, message });
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const serviceLabels = {
    'soft-landing': 'Soft Landing (Company Setup)',
    'biz-dev': 'Business Development',
    '180-day': 'Full 180-Day Programme',
    retainer: 'Strategic Retainer',
    equity: 'Equity Partnership',
  };
  const serviceLabel = serviceLabels[service] || service || 'Not specified';

  const mailOptions = {
    from: `"Megic SA Website" <${process.env.SMTP_USER}>`,
    to: process.env.CONTACT_TO || process.env.SMTP_USER,
    replyTo: email,
    subject: `New Consultation Request — ${name}`,
    text: `
New enquiry received via the Megic SA website contact form.

──────────────────────────────
CONTACT DETAILS
──────────────────────────────
Full Name  : ${name}
Company    : ${company || 'Not provided'}
Email      : ${email}
Phone      : ${phone || 'Not provided'}
Country    : ${country || 'Not provided'}
Service    : ${serviceLabel}

──────────────────────────────
MESSAGE
──────────────────────────────
${message}

──────────────────────────────
Sent at ${new Date().toUTCString()}
    `.trim(),

    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 24px; }
    .card { background: #ffffff; border-radius: 8px; max-width: 600px; margin: 0 auto; overflow: hidden; }
    .header { background: #0a0a0a; padding: 28px 32px; }
    .header h1 { color: #c8f135; margin: 0; font-size: 20px; letter-spacing: 0.5px; }
    .header p  { color: #888; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 28px 32px; }
    .row { margin-bottom: 14px; }
    .label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 2px; }
    .value { color: #111; font-size: 14px; font-weight: 600; }
    hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }
    .message-box { background: #f9f9f9; border-left: 3px solid #c8f135; padding: 14px 16px; border-radius: 4px; color: #333; font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
    .footer { background: #f0f0f0; padding: 14px 32px; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>New Consultation Request</h1>
      <p>Received via megicsa.com contact form</p>
    </div>
    <div class="body">
      <div class="row"><span class="label">Full Name</span><span class="value">${name}</span></div>
      <div class="row"><span class="label">Company</span><span class="value">${company || '—'}</span></div>
      <div class="row"><span class="label">Email</span><span class="value"><a href="mailto:${email}" style="color:#0066cc">${email}</a></span></div>
      <div class="row"><span class="label">Phone</span><span class="value">${phone || '—'}</span></div>
      <div class="row"><span class="label">Country</span><span class="value">${country || '—'}</span></div>
      <div class="row"><span class="label">Service Interest</span><span class="value">${serviceLabel}</span></div>
      <hr />
      <span class="label" style="margin-bottom:10px;display:block">Message</span>
      <div class="message-box">${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</div>
    </div>
    <div class="footer">Sent at ${new Date().toUTCString()}</div>
  </div>
</body>
</html>
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[contact] ✅ Email sent from ${email}`);
    return res.status(200).json({ success: true, message: 'Email sent successfully.' });
  } catch (err) {
    // Always log the real error on the server
    console.error('[contact] ❌ sendMail error:', err.message);
    // In dev return the real error; in prod return a generic message
    return res.status(500).json({
      success: false,
      error: IS_DEV
        ? `SMTP Error: ${err.message}`
        : 'Failed to send email. Please try again later or contact us directly at info@megicsa.com',
    });
  }
});

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Serve React Frontend (Production) ─────────────────────────────
if (!IS_DEV) {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✅  API server running → http://localhost:${PORT}`);
  console.log(`   SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} | user: ${process.env.SMTP_USER}`);
});
