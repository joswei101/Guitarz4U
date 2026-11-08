'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'g4u-test-'));
process.env.DATA_DIR = tmp;
process.env.ADMIN_PASSWORD = 'test-password-123';
delete process.env.SMTP_HOST;

const app = require('../server');
let server, base, cookie = '';

before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

async function call(method, url, body, { admin = false } = {}) {
  const headers = { 'X-Requested-With': 'guitarz4u' };
  if (body) headers['Content-Type'] = 'application/json';
  if (admin) headers.Cookie = cookie;
  const res = await fetch(base + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  return { status: res.status, body: await res.json().catch(() => null) };
}

test('public listings and services are seeded', async () => {
  const g = await call('GET', '/api/guitars');
  assert.equal(g.status, 200);
  assert.ok(g.body.length >= 6);
  const s = await call('GET', '/api/services');
  assert.ok(s.body.some(x => x.category === 'Fretwork'));
  assert.ok(!s.body.some(x => /pickup/i.test(x.name)), 'no electronics services');
});

test('filters work', async () => {
  const bass = await call('GET', '/api/guitars?type=Bass');
  assert.ok(bass.body.length > 0 && bass.body.every(g => g.type === 'Bass'));
  const cheap = await call('GET', '/api/guitars?max=4000&sort=price_asc');
  assert.ok(cheap.body.every(g => g.price <= 4000));
});

test('reservation flow reserves the guitar and blocks double booking', async () => {
  const [g] = (await call('GET', '/api/guitars?sort=price_asc')).body;
  const bad = await call('POST', '/api/reservations', { guitar_id: g.id, name: 'A', email: 'nope', phone: '1' });
  assert.equal(bad.status, 400);
  const ok = await call('POST', '/api/reservations', { guitar_id: g.id, name: 'Thandi', email: 'thandi@example.com', phone: '0821234567' });
  assert.equal(ok.status, 201);
  assert.match(ok.body.ref, /^G4U-/);
  assert.equal((await call('GET', `/api/guitars/${g.id}`)).body.status, 'reserved');
  const again = await call('POST', '/api/reservations', { guitar_id: g.id, name: 'B', email: 'b@example.com', phone: '082' });
  assert.equal(again.status, 409);
});

test('admin endpoints require login', async () => {
  cookie = '';
  assert.equal((await call('GET', '/api/admin/stats', null, { admin: true })).status, 401);
  assert.equal((await call('POST', '/api/admin/login', { password: 'wrong' })).status, 401);
  assert.equal((await call('POST', '/api/admin/login', { password: 'test-password-123' })).status, 200);
  assert.ok(cookie.startsWith('g4u_admin='));
  const st = await call('GET', '/api/admin/stats', null, { admin: true });
  assert.equal(st.status, 200);
  assert.equal(st.body.pendingReservations, 1);
});

test('completing a reservation marks the guitar sold; cancelling frees it', async () => {
  const [r] = (await call('GET', '/api/admin/reservations', null, { admin: true })).body;
  await call('PUT', `/api/admin/reservations/${r.id}`, { status: 'completed' }, { admin: true });
  assert.equal((await call('GET', `/api/guitars/${r.guitar_id}`)).body.status, 'sold');
  await call('PUT', `/api/admin/reservations/${r.id}`, { status: 'cancelled' }, { admin: true });
  // sold stays sold unless owner changes it (only reserved -> available on cancel)
  assert.equal((await call('GET', `/api/guitars/${r.guitar_id}`)).body.status, 'sold');
});

test('repair booking, admin status update, and customer tracking', async () => {
  const svcs = (await call('GET', '/api/services')).body;
  const none = await call('POST', '/api/repairs', { name: 'Sipho', email: 's@example.com', phone: '083' });
  assert.equal(none.status, 400);
  const b = await call('POST', '/api/repairs', { name: 'Sipho', email: 'S@Example.com', phone: '0831112222', guitar_type: 'Acoustic', guitar_brand: 'Martin', service_ids: [svcs[0].id, svcs[1].id], dropoff_date: '2030-01-15' });
  assert.equal(b.status, 201);
  const ref = b.body.ref;
  assert.equal((await call('POST', '/api/repairs/track', { ref, email: 'other@example.com' })).status, 404);

  const list = (await call('GET', '/api/admin/repairs', null, { admin: true })).body;
  const job = list.find(x => x.ref === ref);
  assert.equal(job.service_names, `${svcs[0].name}, ${svcs[1].name}`);
  await call('PUT', `/api/admin/repairs/${job.id}`, { status: 'ready', quote: '950', customer_note: 'All done', internal_note: 'secret', event_note: 'Setup complete' }, { admin: true });

  const t = await call('POST', '/api/repairs/track', { ref: ref.toLowerCase(), email: 's@example.com' });
  assert.equal(t.status, 200);
  assert.equal(t.body.status, 'ready');
  assert.equal(t.body.quote, 950);
  assert.equal(t.body.internal_note, undefined, 'internal notes stay private');
  assert.deepEqual(t.body.events.map(e => e.status), ['requested', 'ready']);
});

test('admin guitar CRUD and CSRF header check', async () => {
  const noHeader = await fetch(base + '/api/admin/guitars', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(noHeader.status, 403);
  const c = await call('POST', '/api/admin/guitars', { brand: 'PRS', model: 'SE Custom 24', type: 'Electric', condition: 'Mint', price: 'R 15 500' }, { admin: true });
  assert.equal(c.status, 201);
  assert.equal(c.body.price, 15500);
  const u = await call('PUT', `/api/admin/guitars/${c.body.id}`, { ...c.body, status: 'hidden' }, { admin: true });
  assert.equal(u.body.status, 'hidden');
  assert.equal((await call('GET', `/api/guitars/${c.body.id}`)).status, 404);
  assert.equal((await call('DELETE', `/api/admin/guitars/${c.body.id}`, null, { admin: true })).status, 200);
});

test('reviews need approval; messages are stored', async () => {
  await call('POST', '/api/reviews', { name: 'Lee', rating: 5, body: 'Great setup!', kind: 'repair' });
  assert.equal((await call('GET', '/api/reviews')).body.length, 0);
  const [rv] = (await call('GET', '/api/admin/reviews', null, { admin: true })).body;
  await call('PUT', `/api/admin/reviews/${rv.id}`, { approved: true }, { admin: true });
  assert.equal((await call('GET', '/api/reviews')).body.length, 1);
  assert.equal((await call('POST', '/api/messages', { name: 'X', email: 'x@example.com', body: 'Hi' })).status, 201);
  assert.equal((await call('GET', '/api/admin/stats', null, { admin: true })).body.unreadMessages, 1);
});

test('public settings never leak secrets', async () => {
  const s = (await call('GET', '/api/settings')).body;
  assert.equal(s.admin_password_hash, undefined);
  assert.equal(s.session_secret, undefined);
  assert.equal(s.bank_details, undefined);
});

test('clear samples removes seeded listings', async () => {
  const r = await call('POST', '/api/admin/clear-samples', null, { admin: true });
  assert.ok(r.body.removed >= 1);
  assert.equal((await call('GET', '/api/admin/stats', null, { admin: true })).body.samples, 0);
});
