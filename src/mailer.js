'use strict';
// Optional email notifications. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// (and optionally SMTP_FROM, NOTIFY_EMAIL). Without them, emails are skipped and logged.
let transporter = null;
if (process.env.SMTP_HOST) {
  const nodemailer = require('nodemailer');
  const port = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
}

const enabled = () => !!transporter;

async function send({ to, subject, text, replyTo }) {
  if (!to) return;
  if (!transporter) {
    console.log(`[mail skipped: SMTP not configured] to=${to} subject="${subject}"`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to, subject, text, replyTo
    });
  } catch (err) {
    console.error('[mail error]', err.message);
  }
}

module.exports = { send, enabled };
