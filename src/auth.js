'use strict';
const crypto = require('node:crypto');
const { getSetting, setSetting } = require('./db');

const COOKIE = 'g4u_admin';
const SESSION_HOURS = 12;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(pw, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(pw), salt, 64);
  const real = Buffer.from(hash, 'hex');
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}

// Initialise the admin password once. ADMIN_PASSWORD env always wins if set,
// otherwise a random password is generated and printed on first start.
function initAdminPassword() {
  const envPw = process.env.ADMIN_PASSWORD;
  if (envPw) {
    if (!verifyPassword(envPw, getSetting('admin_password_hash'))) {
      setSetting('admin_password_hash', hashPassword(envPw));
      bumpVersion();
    }
    setSetting('admin_password_source', 'env');
    return null;
  }
  if (!getSetting('admin_password_hash')) {
    const generated = crypto.randomBytes(6).toString('base64url');
    setSetting('admin_password_hash', hashPassword(generated));
    setSetting('admin_password_source', 'generated');
    return generated;
  }
  return null;
}

function bumpVersion() {
  setSetting('session_version', String(Number(getSetting('session_version') || 0) + 1));
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', getSetting('session_secret')).update(body).digest('base64url');
  return `${body}.${mac}`;
}
function unsign(token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', getSetting('session_secret')).update(body).digest('base64url');
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (p.exp < Date.now()) return null;
    if (String(p.v) !== String(getSetting('session_version') || 0)) return null;
    return p;
  } catch { return null; }
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function login(res, req) {
  const token = sign({ exp: Date.now() + SESSION_HOURS * 3600e3, v: getSetting('session_version') || 0 });
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}${secure ? '; Secure' : ''}`);
}
function logout(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}
function isAdmin(req) {
  return !!unsign(parseCookies(req)[COOKIE]);
}
function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Please log in.' });
  next();
}
function changePassword(newPw) {
  setSetting('admin_password_hash', hashPassword(newPw));
  setSetting('admin_password_source', 'admin');
  bumpVersion();
}

module.exports = { initAdminPassword, verifyPassword, login, logout, isAdmin, requireAdmin, changePassword };
