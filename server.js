'use strict';
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');

const { db, UPLOAD_DIR, allSettings, setSetting, getSetting } = require('./src/db');
const auth = require('./src/auth');
const mail = require('./src/mailer');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// ---------------- helpers ----------------
const TYPES = ['Electric', 'Acoustic', 'Electro-acoustic', 'Classical', 'Bass'];
const CONDITIONS = ['Mint', 'Excellent', 'Very Good', 'Good', 'Fair'];
const GUITAR_STATUSES = ['available', 'reserved', 'sold', 'hidden'];
const RES_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
const REPAIR_STATUSES = ['requested', 'booked', 'received', 'in_progress', 'awaiting_parts', 'ready', 'collected', 'cancelled'];
const REPAIR_LABELS = {
  requested: 'Request received', booked: 'Booked in', received: 'Guitar received', in_progress: 'Work in progress',
  awaiting_parts: 'Awaiting parts', ready: 'Ready for collection', collected: 'Collected', cancelled: 'Cancelled'
};

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const str = (v, max = 500) => (v === undefined || v === null ? '' : String(v)).trim().slice(0, max);
function required(v, label, max) {
  const s = str(v, max);
  if (!s) throw new HttpError(400, `${label} is required.`);
  return s;
}
function email(v) {
  const s = required(v, 'Email', 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new HttpError(400, 'Please enter a valid email address.');
  return s.toLowerCase();
}
function oneOf(v, list, label) {
  if (!list.includes(v)) throw new HttpError(400, `Invalid ${label}.`);
  return v;
}
function money(v, label, { optional = false } = {}) {
  if (optional && (v === '' || v === null || v === undefined)) return null;
  const n = Math.round(Number(String(v).replace(/[^0-9.]/g, '')));
  if (!Number.isFinite(n) || n < 0 || String(v).trim() === '') throw new HttpError(400, `${label} must be a number.`);
  return n;
}
function makeRef(prefix, table) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (;;) {
    let r = '';
    for (const b of crypto.randomBytes(6)) r += alphabet[b % alphabet.length];
    const ref = `${prefix}-${r}`;
    if (!db.prepare(`SELECT 1 FROM ${table} WHERE ref = ?`).get(ref)) return ref;
  }
}
const randZAR = n => 'R' + Number(n).toLocaleString('en-ZA');
const wrap = fn => (req, res, next) => { try { const r = fn(req, res, next); if (r && r.catch) r.catch(next); } catch (e) { next(e); } };
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

// Tiny in-memory rate limiter for public form posts.
const hits = new Map();
function rateLimit(bucket, max, windowMs = 15 * 60e3) {
  return (req, res, next) => {
    const key = `${bucket}:${req.ip}`;
    const t = Date.now();
    const arr = (hits.get(key) || []).filter(x => t - x < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: 'Too many requests. Please try again a bit later or contact us on WhatsApp.' });
    arr.push(t); hits.set(key, arr); next();
  };
}
setInterval(() => { const t = Date.now(); for (const [k, v] of hits) if (!v.some(x => t - x < 15 * 60e3)) hits.delete(k); }, 10 * 60e3).unref();

function guitarOut(g) {
  if (!g) return g;
  return { ...g, photos: JSON.parse(g.photos || '[]'), featured: !!g.featured, is_sample: !!g.is_sample };
}
function ownerEmail() { return process.env.NOTIFY_EMAIL || allSettings().email; }

const PUBLIC_SETTING_KEYS = ['business_name', 'owner_name', 'phone', 'whatsapp', 'email', 'area', 'hours', 'delivery_note', 'instagram', 'facebook', 'announcement'];

// ---------------- public API ----------------
const api = express.Router();

api.get('/settings', (req, res) => {
  const s = allSettings();
  const out = {};
  for (const k of PUBLIC_SETTING_KEYS) out[k] = s[k];
  res.json(out);
});

api.get('/meta', (req, res) => res.json({ types: TYPES, conditions: CONDITIONS, repairStatuses: REPAIR_STATUSES.map(s => ({ value: s, label: REPAIR_LABELS[s] })) }));

api.get('/guitars', (req, res) => {
  const where = [];
  const params = [];
  const status = req.query.status;
  if (status === 'all') where.push("status IN ('available','reserved','sold')");
  else if (status === 'sold') where.push("status = 'sold'");
  else where.push("status IN ('available','reserved')");
  if (TYPES.includes(req.query.type)) { where.push('type = ?'); params.push(req.query.type); }
  if (CONDITIONS.includes(req.query.condition)) { where.push('condition = ?'); params.push(req.query.condition); }
  if (req.query.min) { where.push('price >= ?'); params.push(Number(req.query.min) || 0); }
  if (req.query.max) { where.push('price <= ?'); params.push(Number(req.query.max) || 0); }
  if (req.query.featured === '1') where.push('featured = 1');
  if (req.query.q) {
    where.push("(brand || ' ' || model || ' ' || description) LIKE ?");
    params.push(`%${str(req.query.q, 80)}%`);
  }
  const sorts = { newest: 'created_at DESC, id DESC', price_asc: 'price ASC', price_desc: 'price DESC', brand: 'brand ASC, model ASC' };
  const order = sorts[req.query.sort] || sorts.newest;
  const limit = Math.min(Number(req.query.limit) || 200, 200);
  const rows = db.prepare(`SELECT * FROM guitars WHERE ${where.join(' AND ')} ORDER BY (status = 'sold'), ${order} LIMIT ${limit}`).all(...params);
  res.json(rows.map(guitarOut));
});

api.get('/guitars/:id', (req, res) => {
  const g = db.prepare("SELECT * FROM guitars WHERE id = ? AND status != 'hidden'").get(Number(req.params.id));
  if (!g) return res.status(404).json({ error: 'Guitar not found.' });
  res.json(guitarOut(g));
});

api.post('/reservations', rateLimit('reserve', 10), wrap(async (req, res) => {
  const b = req.body || {};
  const data = {
    guitar_id: Number(b.guitar_id),
    name: required(b.name, 'Name', 120),
    email: email(b.email),
    phone: required(b.phone, 'Phone number', 40),
    fulfilment: oneOf(b.fulfilment || 'collection', ['collection', 'courier'], 'collection option'),
    address: str(b.address, 400),
    message: str(b.message, 2000)
  };
  if (data.fulfilment === 'courier' && !data.address) throw new HttpError(400, 'Please enter a delivery address for courier.');
  const result = tx(() => {
    const g = db.prepare('SELECT * FROM guitars WHERE id = ?').get(data.guitar_id);
    if (!g || g.status === 'hidden') throw new HttpError(404, 'Guitar not found.');
    if (g.status !== 'available') throw new HttpError(409, 'Sorry, this guitar has just been reserved or sold.');
    const ref = makeRef('G4U', 'reservations');
    const label = `${g.brand} ${g.model}${g.year ? ` (${g.year})` : ''}`;
    db.prepare(`INSERT INTO reservations(ref, guitar_id, guitar_label, price, name, email, phone, fulfilment, address, message)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(ref, g.id, label, g.price, data.name, data.email, data.phone, data.fulfilment, data.address, data.message);
    db.prepare("UPDATE guitars SET status = 'reserved', updated_at = ? WHERE id = ?").run(now(), g.id);
    return { ref, label, price: g.price };
  });
  const s = allSettings();
  mail.send({
    to: ownerEmail(), replyTo: data.email,
    subject: `New reservation ${result.ref}: ${result.label}`,
    text: `${data.name} reserved ${result.label} (${randZAR(result.price)}).\n\nEmail: ${data.email}\nPhone: ${data.phone}\nOption: ${data.fulfilment}${data.address ? `\nAddress: ${data.address}` : ''}\n\nMessage:\n${data.message || '(none)'}\n\nManage it in the admin panel.`
  });
  mail.send({
    to: data.email, replyTo: s.email,
    subject: `Your Guitarz4U reservation ${result.ref}`,
    text: `Hi ${data.name},\n\nThanks for reserving the ${result.label} (${randZAR(result.price)}). We're holding it for you and will be in touch shortly to confirm and arrange ${data.fulfilment === 'courier' ? 'courier delivery' : 'collection'}.\n\nYour reference: ${result.ref}\n\nPayment is by EFT or cash on collection. Nothing is charged online.\n\nQuestions? WhatsApp ${s.phone} or reply to this email.\n\n${s.business_name}`
  });
  res.status(201).json(result);
}));

api.get('/services', (req, res) => {
  res.json(db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort, id').all());
});

api.post('/repairs', rateLimit('repair', 10), wrap(async (req, res) => {
  const b = req.body || {};
  const ids = Array.isArray(b.service_ids) ? b.service_ids.map(Number).filter(Boolean).slice(0, 15) : [];
  const svc = ids.length ? db.prepare(`SELECT name FROM services WHERE active = 1 AND id IN (${ids.map(() => '?').join(',')})`).all(...ids) : [];
  const issue = str(b.issue, 3000);
  if (!svc.length && !issue) throw new HttpError(400, 'Choose at least one service or describe the problem.');
  let drop = str(b.dropoff_date, 10);
  if (drop && !/^\d{4}-\d{2}-\d{2}$/.test(drop)) drop = '';
  const data = [
    required(b.name, 'Name', 120), email(b.email), required(b.phone, 'Phone number', 40),
    oneOf(b.guitar_type || 'Electric', [...TYPES, 'Other'], 'guitar type'), str(b.guitar_brand, 80), str(b.guitar_model, 120),
    svc.map(s => s.name).join(', '), issue, drop
  ];
  const ref = tx(() => {
    const ref = makeRef('RPR', 'repairs');
    const info = db.prepare(`INSERT INTO repairs(ref, name, email, phone, guitar_type, guitar_brand, guitar_model, service_names, issue, dropoff_date)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(ref, ...data);
    db.prepare('INSERT INTO repair_events(repair_id, status, note) VALUES (?,?,?)').run(info.lastInsertRowid, 'requested', 'Booking request submitted online.');
    return ref;
  });
  const [name, em, phone, type, brand, model, services] = data;
  const s = allSettings();
  mail.send({
    to: ownerEmail(), replyTo: em,
    subject: `New repair booking ${ref}: ${[brand, model].filter(Boolean).join(' ') || type}`,
    text: `${name} requested a repair.\n\nGuitar: ${type} ${brand} ${model}\nServices: ${services || '(not specified)'}\nPreferred drop-off: ${drop || 'flexible'}\nEmail: ${em}\nPhone: ${phone}\n\nDetails:\n${issue || '(none)'}`
  });
  mail.send({
    to: em, replyTo: s.email,
    subject: `Repair booking received: ${ref}`,
    text: `Hi ${name},\n\nThanks for booking your guitar in with ${s.business_name}. We'll confirm your drop-off time shortly.\n\nYour repair reference: ${ref}\nTrack progress any time on our website (Track a repair) using this reference and your email.\n\n${s.business_name} · WhatsApp ${s.phone}`
  });
  res.status(201).json({ ref });
}));

api.post('/repairs/track', rateLimit('track', 30), (req, res) => {
  const ref = str(req.body?.ref, 20).toUpperCase();
  const em = str(req.body?.email, 200).toLowerCase();
  const r = db.prepare('SELECT * FROM repairs WHERE ref = ? AND email = ?').get(ref, em);
  if (!r) return res.status(404).json({ error: 'We couldn’t find a repair with that reference and email. Check both and try again.' });
  const events = db.prepare('SELECT status, note, created_at FROM repair_events WHERE repair_id = ? ORDER BY id').all(r.id);
  const { internal_note, id, ...pub } = r;
  res.json({ ...pub, status_label: REPAIR_LABELS[r.status], events: events.map(e => ({ ...e, label: REPAIR_LABELS[e.status] })) });
});

api.post('/messages', rateLimit('message', 8), wrap(async (req, res) => {
  const b = req.body || {};
  const d = [required(b.name, 'Name', 120), email(b.email), str(b.phone, 40), str(b.subject, 150), required(b.body, 'Message', 4000)];
  db.prepare('INSERT INTO messages(name, email, phone, subject, body) VALUES (?,?,?,?,?)').run(...d);
  mail.send({ to: ownerEmail(), replyTo: d[1], subject: `Website message: ${d[3] || 'General enquiry'}`, text: `From: ${d[0]} <${d[1]}> ${d[2]}\n\n${d[4]}` });
  res.status(201).json({ ok: true });
}));

api.get('/reviews', (req, res) => {
  const rows = db.prepare('SELECT id, name, rating, kind, body, created_at FROM reviews WHERE approved = 1 ORDER BY id DESC LIMIT 30').all();
  res.json(rows);
});
api.post('/reviews', rateLimit('review', 4), (req, res) => {
  const b = req.body || {};
  const rating = Math.round(Number(b.rating));
  if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Please choose a rating from 1 to 5.');
  db.prepare('INSERT INTO reviews(name, rating, kind, body) VALUES (?,?,?,?)')
    .run(required(b.name, 'Name', 80), rating, oneOf(b.kind || 'purchase', ['purchase', 'repair'], 'review type'), required(b.body, 'Review', 1500));
  res.status(201).json({ ok: true });
});

// ---------------- admin API ----------------
const admin = express.Router();

admin.post('/login', rateLimit('login', 10), (req, res) => {
  if (!auth.verifyPassword(str(req.body?.password, 200), getSetting('admin_password_hash'))) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  auth.login(res, req);
  res.json({ ok: true });
});
admin.post('/logout', (req, res) => { auth.logout(res); res.json({ ok: true }); });
admin.get('/me', (req, res) => res.json({ admin: auth.isAdmin(req) }));

admin.use(auth.requireAdmin);
// CSRF defence: admin mutations must come from our own JS (custom header can't be set cross-site without CORS).
admin.use((req, res, next) => {
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'guitarz4u') return res.status(403).json({ error: 'Bad request origin.' });
  next();
});

admin.get('/stats', (req, res) => {
  const one = sql => db.prepare(sql).get().n;
  res.json({
    available: one("SELECT COUNT(*) n FROM guitars WHERE status = 'available'"),
    reserved: one("SELECT COUNT(*) n FROM guitars WHERE status = 'reserved'"),
    sold: one("SELECT COUNT(*) n FROM guitars WHERE status = 'sold'"),
    pendingReservations: one("SELECT COUNT(*) n FROM reservations WHERE status = 'pending'"),
    openRepairs: one("SELECT COUNT(*) n FROM repairs WHERE status NOT IN ('collected','cancelled')"),
    newRepairs: one("SELECT COUNT(*) n FROM repairs WHERE status = 'requested'"),
    readyRepairs: one("SELECT COUNT(*) n FROM repairs WHERE status = 'ready'"),
    unreadMessages: one('SELECT COUNT(*) n FROM messages WHERE is_read = 0'),
    pendingReviews: one('SELECT COUNT(*) n FROM reviews WHERE approved = 0'),
    samples: one('SELECT COUNT(*) n FROM guitars WHERE is_sample = 1'),
    salesTotal: db.prepare("SELECT COALESCE(SUM(price),0) n FROM reservations WHERE status = 'completed'").get().n,
    repairsTotal: db.prepare("SELECT COALESCE(SUM(quote),0) n FROM repairs WHERE status = 'collected'").get().n,
    emailEnabled: mail.enabled(),
    passwordFromEnv: allSettings().admin_password_source === 'env'
  });
});

// --- guitars ---
function guitarInput(b) {
  return [
    required(b.brand, 'Brand', 80), required(b.model, 'Model', 120), oneOf(b.type, TYPES, 'type'), str(b.year, 10),
    oneOf(b.condition, CONDITIONS, 'condition'), money(b.price, 'Price'), str(b.description, 5000), str(b.specs, 3000),
    oneOf(b.status || 'available', GUITAR_STATUSES, 'status'), b.featured ? 1 : 0
  ];
}
admin.get('/guitars', (req, res) => {
  res.json(db.prepare('SELECT * FROM guitars ORDER BY id DESC').all().map(guitarOut));
});
admin.post('/guitars', (req, res) => {
  const info = db.prepare(`INSERT INTO guitars(brand, model, type, year, condition, price, description, specs, status, featured)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(...guitarInput(req.body || {}));
  res.status(201).json(guitarOut(db.prepare('SELECT * FROM guitars WHERE id = ?').get(info.lastInsertRowid)));
});
admin.put('/guitars/:id', (req, res) => {
  const id = Number(req.params.id);
  const g = db.prepare('SELECT * FROM guitars WHERE id = ?').get(id);
  if (!g) throw new HttpError(404, 'Not found.');
  const b = req.body || {};
  db.prepare(`UPDATE guitars SET brand=?, model=?, type=?, year=?, condition=?, price=?, description=?, specs=?, status=?, featured=?, is_sample=0, updated_at=? WHERE id=?`)
    .run(...guitarInput(b), now(), id);
  if (Array.isArray(b.photos)) {
    // Allow reordering/removing photos; only keep paths that already belong to this guitar.
    const current = JSON.parse(g.photos || '[]');
    const next = b.photos.filter(p => current.includes(p));
    for (const p of current) if (!next.includes(p)) removeUpload(p);
    db.prepare('UPDATE guitars SET photos = ? WHERE id = ?').run(JSON.stringify(next), id);
  }
  res.json(guitarOut(db.prepare('SELECT * FROM guitars WHERE id = ?').get(id)));
});
admin.delete('/guitars/:id', (req, res) => {
  const g = db.prepare('SELECT * FROM guitars WHERE id = ?').get(Number(req.params.id));
  if (!g) throw new HttpError(404, 'Not found.');
  for (const p of JSON.parse(g.photos || '[]')) removeUpload(p);
  db.prepare('DELETE FROM guitars WHERE id = ?').run(g.id);
  res.json({ ok: true });
});
admin.post('/clear-samples', (req, res) => {
  const rows = db.prepare('SELECT * FROM guitars WHERE is_sample = 1').all();
  for (const g of rows) for (const p of JSON.parse(g.photos || '[]')) removeUpload(p);
  db.prepare('DELETE FROM guitars WHERE is_sample = 1').run();
  res.json({ removed: rows.length });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype];
      cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});
function removeUpload(p) {
  if (!p.startsWith('/uploads/')) return;
  fs.rm(path.join(UPLOAD_DIR, path.basename(p)), { force: true }, () => {});
}
admin.post('/guitars/:id/photos', upload.array('photos', 10), (req, res) => {
  const g = db.prepare('SELECT * FROM guitars WHERE id = ?').get(Number(req.params.id));
  if (!g) { for (const f of req.files || []) fs.rm(f.path, { force: true }, () => {}); throw new HttpError(404, 'Not found.'); }
  const photos = JSON.parse(g.photos || '[]').concat((req.files || []).map(f => `/uploads/${f.filename}`)).slice(0, 12);
  db.prepare('UPDATE guitars SET photos = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(photos), now(), g.id);
  res.json(guitarOut(db.prepare('SELECT * FROM guitars WHERE id = ?').get(g.id)));
});

// --- reservations ---
admin.get('/reservations', (req, res) => {
  res.json(db.prepare('SELECT * FROM reservations ORDER BY id DESC').all());
});
admin.put('/reservations/:id', (req, res) => {
  const status = oneOf(req.body?.status, RES_STATUSES, 'status');
  const r = db.prepare('SELECT * FROM reservations WHERE id = ?').get(Number(req.params.id));
  if (!r) throw new HttpError(404, 'Not found.');
  tx(() => {
    db.prepare('UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), r.id);
    if (r.guitar_id) {
      const g = db.prepare('SELECT status FROM guitars WHERE id = ?').get(r.guitar_id);
      if (g) {
        let gs = g.status;
        if (status === 'completed') gs = 'sold';
        else if (status === 'pending' || status === 'confirmed') gs = 'reserved';
        else if (status === 'cancelled') {
          const otherActive = db.prepare("SELECT 1 FROM reservations WHERE guitar_id = ? AND id != ? AND status IN ('pending','confirmed','completed')").get(r.guitar_id, r.id);
          if (!otherActive && g.status === 'reserved') gs = 'available';
        }
        db.prepare('UPDATE guitars SET status = ?, updated_at = ? WHERE id = ?').run(gs, now(), r.guitar_id);
      }
    }
  });
  if (status === 'confirmed' && r.status !== 'confirmed') {
    const s = allSettings();
    mail.send({
      to: r.email, replyTo: s.email, subject: `Reservation confirmed: ${r.ref}`,
      text: `Hi ${r.name},\n\nYour reservation of the ${r.guitar_label} (${randZAR(r.price)}) is confirmed.\n\nPayment:\n${s.bank_details}\nPlease use ${r.ref} as your payment reference.\n\n${s.delivery_note}\n\n${s.business_name} · WhatsApp ${s.phone}`
    });
  }
  res.json(db.prepare('SELECT * FROM reservations WHERE id = ?').get(r.id));
});
admin.delete('/reservations/:id', (req, res) => {
  db.prepare('DELETE FROM reservations WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// --- repairs ---
admin.get('/repairs', (req, res) => {
  const rows = REPAIR_STATUSES.includes(req.query.status)
    ? db.prepare('SELECT * FROM repairs WHERE status = ? ORDER BY id DESC').all(req.query.status)
    : db.prepare('SELECT * FROM repairs ORDER BY id DESC').all();
  res.json(rows);
});
admin.get('/repairs/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM repairs WHERE id = ?').get(Number(req.params.id));
  if (!r) throw new HttpError(404, 'Not found.');
  r.events = db.prepare('SELECT * FROM repair_events WHERE repair_id = ? ORDER BY id').all(r.id);
  res.json(r);
});
admin.post('/repairs', (req, res) => {
  // Walk-in jobs created by the owner.
  const b = req.body || {};
  const ref = tx(() => {
    const ref = makeRef('RPR', 'repairs');
    const info = db.prepare(`INSERT INTO repairs(ref, name, email, phone, guitar_type, guitar_brand, guitar_model, service_names, issue, dropoff_date, status, quote)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(ref, required(b.name, 'Name', 120), email(b.email), required(b.phone, 'Phone', 40),
      oneOf(b.guitar_type || 'Electric', [...TYPES, 'Other'], 'guitar type'), str(b.guitar_brand, 80), str(b.guitar_model, 120),
      str(b.service_names, 500), str(b.issue, 3000), str(b.dropoff_date, 10), 'received', money(b.quote, 'Quote', { optional: true }));
    db.prepare('INSERT INTO repair_events(repair_id, status, note) VALUES (?,?,?)').run(info.lastInsertRowid, 'received', 'Guitar booked in at the workshop.');
    return ref;
  });
  res.status(201).json({ ref });
});
admin.put('/repairs/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM repairs WHERE id = ?').get(Number(req.params.id));
  if (!r) throw new HttpError(404, 'Not found.');
  const b = req.body || {};
  const status = oneOf(b.status || r.status, REPAIR_STATUSES, 'status');
  const quote = b.quote === undefined ? r.quote : money(b.quote, 'Quote', { optional: true });
  const customerNote = b.customer_note === undefined ? r.customer_note : str(b.customer_note, 2000);
  const internalNote = b.internal_note === undefined ? r.internal_note : str(b.internal_note, 4000);
  const eventNote = str(b.event_note, 500);
  tx(() => {
    db.prepare('UPDATE repairs SET status=?, quote=?, customer_note=?, internal_note=?, updated_at=? WHERE id=?')
      .run(status, quote, customerNote, internalNote, now(), r.id);
    if (status !== r.status || eventNote) {
      db.prepare('INSERT INTO repair_events(repair_id, status, note) VALUES (?,?,?)').run(r.id, status, eventNote);
    }
  });
  if (status !== r.status && b.notify !== false) {
    const s = allSettings();
    const extra = status === 'ready' ? `\n\nYour guitar is ready for collection${quote != null ? `. Amount due: ${randZAR(quote)} (EFT or cash on collection)` : ''}.` : '';
    mail.send({
      to: r.email, replyTo: s.email, subject: `Repair ${r.ref}: ${REPAIR_LABELS[status]}`,
      text: `Hi ${r.name},\n\nUpdate on your ${[r.guitar_brand, r.guitar_model].filter(Boolean).join(' ') || 'guitar'}: ${REPAIR_LABELS[status]}.${eventNote ? `\n\n${eventNote}` : ''}${extra}\n\nTrack it any time on our website with reference ${r.ref}.\n\n${s.business_name} · WhatsApp ${s.phone}`
    });
  }
  res.json(db.prepare('SELECT * FROM repairs WHERE id = ?').get(r.id));
});
admin.delete('/repairs/:id', (req, res) => {
  db.prepare('DELETE FROM repairs WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// --- services ---
function serviceInput(b) {
  return [required(b.category, 'Category', 60), required(b.name, 'Name', 120), str(b.description, 1000), money(b.price_from, 'Price'),
    str(b.price_note, 60), str(b.turnaround, 60), b.active === false || b.active === 0 ? 0 : 1, Number(b.sort) || 0];
}
admin.get('/services', (req, res) => res.json(db.prepare('SELECT * FROM services ORDER BY sort, id').all()));
admin.post('/services', (req, res) => {
  const info = db.prepare('INSERT INTO services(category, name, description, price_from, price_note, turnaround, active, sort) VALUES (?,?,?,?,?,?,?,?)').run(...serviceInput(req.body || {}));
  res.status(201).json(db.prepare('SELECT * FROM services WHERE id = ?').get(info.lastInsertRowid));
});
admin.put('/services/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('UPDATE services SET category=?, name=?, description=?, price_from=?, price_note=?, turnaround=?, active=?, sort=? WHERE id=?').run(...serviceInput(req.body || {}), id);
  if (!info.changes) throw new HttpError(404, 'Not found.');
  res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(id));
});
admin.delete('/services/:id', (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// --- messages ---
admin.get('/messages', (req, res) => res.json(db.prepare('SELECT * FROM messages ORDER BY id DESC').all()));
admin.put('/messages/:id', (req, res) => {
  db.prepare('UPDATE messages SET is_read = ? WHERE id = ?').run(req.body?.is_read ? 1 : 0, Number(req.params.id));
  res.json({ ok: true });
});
admin.delete('/messages/:id', (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// --- reviews ---
admin.get('/reviews', (req, res) => res.json(db.prepare('SELECT * FROM reviews ORDER BY approved, id DESC').all()));
admin.put('/reviews/:id', (req, res) => {
  db.prepare('UPDATE reviews SET approved = ? WHERE id = ?').run(req.body?.approved ? 1 : 0, Number(req.params.id));
  res.json({ ok: true });
});
admin.delete('/reviews/:id', (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// --- settings ---
const EDITABLE_SETTINGS = [...PUBLIC_SETTING_KEYS, 'bank_details'];
admin.get('/settings', (req, res) => {
  const s = allSettings();
  const out = {};
  for (const k of EDITABLE_SETTINGS) out[k] = s[k];
  res.json(out);
});
admin.put('/settings', (req, res) => {
  const b = req.body || {};
  for (const k of EDITABLE_SETTINGS) if (b[k] !== undefined) setSetting(k, str(b[k], 2000));
  if (b.whatsapp !== undefined) setSetting('whatsapp', str(b.whatsapp, 30).replace(/\D/g, ''));
  res.json({ ok: true });
});
admin.put('/password', (req, res) => {
  if (allSettings().admin_password_source === 'env') throw new HttpError(400, 'The password is set by the ADMIN_PASSWORD environment variable. Change it there.');
  if (!auth.verifyPassword(str(req.body?.current, 200), allSettings().admin_password_hash)) throw new HttpError(400, 'Current password is incorrect.');
  const next = str(req.body?.next, 200);
  if (next.length < 8) throw new HttpError(400, 'New password must be at least 8 characters.');
  auth.changePassword(next);
  auth.login(res, req);
  res.json({ ok: true });
});

api.use('/admin', admin);
app.use('/api', api);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// ---------------- static ----------------
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '1h' }));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on our side. Please try again.' : err.message });
});

if (require.main === module) {
  const generated = auth.initAdminPassword();
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Guitarz4U running on http://localhost:${port}`);
    if (generated) {
      console.log('\n  ┌─────────────────────────────────────────────────────────');
      console.log(`  │ Admin password generated: ${generated}`);
      console.log('  │ Log in at /admin and change it under Settings,');
      console.log('  │ or set the ADMIN_PASSWORD environment variable.');
      console.log('  └─────────────────────────────────────────────────────────\n');
    }
    if (!mail.enabled()) console.log('Email notifications are off (set SMTP_HOST etc. to enable).');
  });
} else {
  auth.initAdminPassword();
}

module.exports = app;
