// Shared helpers for the form endpoints (files under api/_lib are not exposed as routes).
//
// Required environment variables (Vercel > Project > Settings > Environment Variables):
//   GMAIL_USER          sending Gmail address
//   GMAIL_APP_PASSWORD  16-char App Password of that account (not the login password)
// Optional:
//   MAIL_TO             recipient, defaults to kind-one@email.plala.or.jp
//   ALLOWED_ORIGINS     extra comma-separated origins allowed to post (e.g. a preview URL)

const nodemailer = require('nodemailer');

const DEFAULT_TO = 'kind-one@email.plala.or.jp';
const ALLOWED_ORIGINS = [
  'https://www.kindvija.com',
  'https://kindvija.com',
  ...String(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
];
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

// Trim, drop control characters (keep newlines only where allowed) and cap the length.
function clean(value, max, multiline = false) {
  let s = value == null ? '' : String(value);
  s = multiline ? s.replace(/\r\n?/g, '\n').replace(/[^\S\n]+\n/g, '\n') : s.replace(/\s+/g, ' ');
  s = s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim();
  return s.slice(0, max);
}

function isEmail(s) {
  return s.length <= 254 && EMAIL_RE.test(s);
}

// Common request checks. Returns the parsed body, or null after sending an error response.
function readRequest(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return null;
  }
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    res.status(403).json({ ok: false, error: 'forbidden_origin' });
    return null;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ ok: false, error: 'invalid_body' });
    return null;
  }
  return body;
}

// Honeypot: real users never fill the hidden "website" field. Answer as if it succeeded.
function isBot(body) {
  return Boolean(body.website && String(body.website).trim());
}

async function sendMail({ subject, text, replyTo }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Mail is not configured: set GMAIL_USER and GMAIL_APP_PASSWORD');
  }
  await getTransporter().sendMail({
    from: { name: 'カインド・ONE Webフォーム', address: process.env.GMAIL_USER },
    to: process.env.MAIL_TO || DEFAULT_TO,
    replyTo: replyTo || undefined,
    subject,
    text,
  });
}

function nowJst() {
  return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

module.exports = { clean, isEmail, readRequest, isBot, sendMail, nowJst };
