'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(process.env.DB_FILE || path.join(DATA_DIR, 'guitarz4u.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS guitars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  type TEXT NOT NULL,
  year TEXT DEFAULT '',
  condition TEXT NOT NULL,
  price INTEGER NOT NULL,
  description TEXT DEFAULT '',
  specs TEXT DEFAULT '',
  photos TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'available',
  featured INTEGER NOT NULL DEFAULT 0,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  guitar_id INTEGER REFERENCES guitars(id) ON DELETE SET NULL,
  guitar_label TEXT NOT NULL,
  price INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  fulfilment TEXT NOT NULL DEFAULT 'collection',
  address TEXT DEFAULT '',
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_from INTEGER NOT NULL DEFAULT 0,
  price_note TEXT DEFAULT '',
  turnaround TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS repairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  guitar_type TEXT DEFAULT '',
  guitar_brand TEXT DEFAULT '',
  guitar_model TEXT DEFAULT '',
  service_names TEXT DEFAULT '',
  issue TEXT DEFAULT '',
  dropoff_date TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested',
  quote INTEGER,
  customer_note TEXT DEFAULT '',
  internal_note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS repair_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repair_id INTEGER NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'purchase',
  body TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

const DEFAULT_SETTINGS = {
  business_name: 'Guitarz4U',
  owner_name: 'Shua Weinfas',
  phone: '064 856 7019',
  whatsapp: '27648567019',
  email: 'joshuaweinfas@gmail.com',
  area: 'Johannesburg, Gauteng',
  hours: 'Mon–Fri 09:00–17:00\nSat 09:00–13:00\nSun & public holidays: by appointment',
  bank_details: 'Bank details are shared once your reservation is confirmed.',
  delivery_note: 'Collection in Johannesburg, or nationwide courier (quoted per guitar, fully insured).',
  instagram: '',
  facebook: '',
  announcement: ''
};

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : undefined;
}
function setSetting(key, value) {
  db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
}
function allSettings() {
  const out = { ...DEFAULT_SETTINGS };
  for (const r of db.prepare('SELECT key, value FROM settings').all()) out[r.key] = r.value;
  return out;
}

for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
  if (getSetting(k) === undefined) setSetting(k, v);
}
if (!getSetting('session_secret')) setSetting('session_secret', crypto.randomBytes(32).toString('hex'));

// ---------- seed repair services (placeholder ZAR prices, editable in admin) ----------
const serviceCount = db.prepare('SELECT COUNT(*) AS n FROM services').get().n;
if (serviceCount === 0) {
  const ins = db.prepare('INSERT INTO services(category, name, description, price_from, price_note, turnaround, sort) VALUES (?,?,?,?,?,?,?)');
  const S = [
    ['Setups & Restrings', 'Restring & clean', 'Fresh strings, fretboard clean and condition, tuner and hardware check.', 250, 'plus strings', 'Same day', 1],
    ['Setups & Restrings', 'Full setup', 'Truss rod, action, intonation, nut height, pickup height, restring and full clean. The single best thing you can do for a guitar.', 650, 'strings included', '2–3 days', 2],
    ['Setups & Restrings', 'Intonation & action adjust', 'Dial in string height and intonation so your guitar plays in tune all the way up the neck.', 350, '', '1–2 days', 3],
    ['Setups & Restrings', 'Floyd Rose / tremolo setup', 'Balance, block and set up floating or locking tremolo systems.', 850, 'strings included', '2–3 days', 4],
    ['Fretwork', 'Fret level, crown & polish', 'Removes buzz and dead spots from worn or uneven frets. Includes a full setup.', 1200, '', '3–5 days', 10],
    ['Fretwork', 'Fret end dressing', 'Smooths sharp fret ends caused by fretboard shrinkage.', 450, '', '1–2 days', 11],
    ['Fretwork', 'Partial refret', 'Replace the most worn frets (typically first 7–12) and level to match.', 1800, 'from', '1 week', 12],
    ['Fretwork', 'Full refret', 'All frets replaced with your choice of wire (nickel or stainless), levelled, crowned and set up.', 3500, 'from, wire extra', '1–2 weeks', 13],
    ['Structural & Finish', 'Bone nut replacement', 'Hand-cut bone nut for better tuning stability, tone and comfortable low action.', 600, '', '2–3 days', 20],
    ['Structural & Finish', 'Saddle replacement / compensation', 'New bone saddle for acoustics, shaped and compensated for accurate intonation.', 450, '', '2–3 days', 21],
    ['Structural & Finish', 'Bridge reglue', 'Lifting acoustic bridge removed, cleaned up and reglued.', 900, 'from', '1 week', 22],
    ['Structural & Finish', 'Crack repair', 'Top, back or side cracks cleated and glued, with optional finish touch-up.', 800, 'from', '1 week', 23],
    ['Structural & Finish', 'Headstock repair', 'Broken or cracked headstocks glued and reinforced.', 1500, 'from', '1–2 weeks', 24],
    ['Structural & Finish', 'Neck reset', 'Restore playable action on acoustics where the neck angle has moved.', 3000, 'from', '2–3 weeks', 25],
    ['Structural & Finish', 'Finish touch-up', 'Chips, dings and lacquer checking blended in.', 500, 'from', '3–5 days', 26]
  ];
  for (const s of S) ins.run(...s);
}

// ---------- seed sample listings so a fresh install isn't empty ----------
if (!getSetting('samples_seeded')) {
  const ins = db.prepare('INSERT INTO guitars(brand, model, type, year, condition, price, description, specs, featured, is_sample) VALUES (?,?,?,?,?,?,?,?,?,1)');
  const G = [
    ['Fender', 'Player Stratocaster', 'Electric', '2021', 'Excellent', 13500, 'Lovely Mexican-made Strat in Tidepool. Light play wear only, freshly set up in our workshop with 10s.', 'Body: Alder\nNeck: Maple, modern C\nFretboard: Pau Ferro\nPickups: Player Series Alnico 5 single-coils\nIncludes: Gig bag', 1],
    ['Gibson', 'Les Paul Studio', 'Electric', '2016', 'Very Good', 21000, 'Wine red Les Paul Studio with a few honest dings on the back. Frets have plenty of life left. Plays beautifully.', 'Body: Mahogany, maple cap\nNeck: Mahogany\nFretboard: Rosewood\nPickups: 490R / 498T humbuckers\nIncludes: Gibson gig bag', 1],
    ['Yamaha', 'FG800', 'Acoustic', '2022', 'Mint', 3400, 'Barely played solid-top dreadnought. A brilliant first acoustic with a full, balanced sound.', 'Top: Solid spruce\nBack & sides: Nato/okoume\nNeck: Nato\nFretboard: Walnut', 0],
    ['Ibanez', 'SR300E', 'Bass', '2019', 'Good', 5200, 'Fast, light 4-string bass with active EQ. Visible wear on the edges but electronics are perfect.', 'Body: Okoume\nNeck: Jatoba/Walnut 5-piece\nPickups: PowerSpan dual-coil\nElectronics: 3-band active EQ', 0],
    ['Taylor', '114ce', 'Electro-acoustic', '2018', 'Very Good', 12800, 'Grand Auditorium cutaway with ES2 electronics. Bright, articulate and great for gigging. New bone saddle fitted.', 'Top: Solid Sitka spruce\nBack & sides: Walnut layered\nElectronics: Taylor ES2\nIncludes: Taylor gig bag', 1],
    ['Admira', 'Malaga', 'Classical', '2020', 'Excellent', 2900, 'Spanish-made classical with a warm voice. Ideal for students. Fresh nylon strings fitted.', 'Top: Solid cedar\nBack & sides: Sapele\nNeck: Mahogany', 0],
    ['Epiphone', 'Casino', 'Electric', '2015', 'Good', 8900, 'Hollow-body with plenty of vintage vibe. P-90s sound fantastic. Some finish checking on the top.', 'Body: Laminated maple hollow-body\nNeck: Mahogany\nPickups: Dogear P-90s', 0],
    ['Squier', 'Classic Vibe 60s Jazz Bass', 'Bass', '2020', 'Excellent', 7400, 'Great-sounding vintage-style J bass. Recently set up with new flatwound strings.', 'Body: Poplar\nNeck: Maple\nFretboard: Indian Laurel\nPickups: Fender-designed Alnico single-coils', 0]
  ];
  for (const g of G) ins.run(...g);
  setSetting('samples_seeded', '1');
}

module.exports = { db, DATA_DIR, UPLOAD_DIR, getSetting, setSetting, allSettings };
