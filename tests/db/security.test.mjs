// Database security and workflow tests (run: npm run test:db).
// These call the real Supabase API directly — exactly what an attacker with the
// public key could do — to prove the rules hold even without the website.
import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { admin, anon, makeProduct, makeUser, psql, signedIn, unique } from '../helpers.mjs';

let owner, staffRepairs, custA, custB, A, B, S, O;

before(async () => {
  owner = await makeUser('owner', 'owner');
  staffRepairs = await makeUser('staff', 'staff', ['repairs']);
  custA = await makeUser('custa');
  custB = await makeUser('custb');
  [A, B, S, O] = await Promise.all([signedIn(custA.email), signedIn(custB.email), signedIn(staffRepairs.email), signedIn(owner.email)]);
});

describe('public visibility', () => {
  test('anonymous visitors see published guitars but never drafts or archived', async () => {
    const pub = makeProduct();
    const draft = makeProduct({ status: 'draft' });
    const archived = makeProduct({ status: 'archived' });
    const { data } = await anon().from('products').select('id').in('id', [pub, draft, archived]);
    assert.deepEqual(data.map((r) => r.id), [pub]);
  });
  test('private product data (serials, costs) is hidden from customers', async () => {
    const pid = makeProduct();
    psql(`insert into public.product_private (product_id, serial_number, acquisition_cost) values ('${pid}', 'SN-SECRET', 999)`);
    const { data: a } = await anon().from('product_private').select('*').eq('product_id', pid);
    const { data: c } = await A.from('product_private').select('*').eq('product_id', pid);
    const { data: o } = await O.from('product_private').select('*').eq('product_id', pid);
    assert.equal(a.length, 0); assert.equal(c.length, 0); assert.equal(o.length, 1);
  });
  test('public reviews never expose the reviewer user id', async () => {
    const { error } = await anon().from('reviews').select('user_id').limit(1);
    assert.ok(error, 'selecting user_id as anon should be refused');
  });
});

describe('form tables cannot be written directly from the browser', () => {
  for (const [table, row] of [
    ['enquiries', { name: 'X', email: 'x@x.test' }],
    ['repairs', { name: 'X', email: 'x@x.test', brand: 'b', model: 'm', problem: 'broken neck' }],
    ['seller_enquiries', { name: 'X', email: 'x@x.test', whatsapp: '0821234567', brand: 'b', model: 'm', condition: 'broken', suburb: 's' }],
    ['reviews', { display_name: 'X', rating: 5, body: 'Fake glowing review!!' }],
    ['payments', { entity_type: 'product', entity_id: '00000000-0000-0000-0000-000000000000', amount: 1, method: 'eft', received_on: '2026-01-01', verified_confirmation: true }],
  ]) {
    test(`${table}: insert refused for anonymous and signed-in customers`, async () => {
      const r1 = await anon().from(table).insert(row);
      const r2 = await A.from(table).insert(row);
      assert.ok(r1.error, 'anon insert should fail');
      assert.ok(r2.error, 'customer insert should fail');
    });
  }
});

describe('customers can only see their own records', () => {
  test('repairs, seller enquiries and enquiries are isolated between customers', async () => {
    const { data: rep } = await admin.from('repairs').insert({ user_id: custA.id, name: 'A', email: custA.email, brand: 'b', model: 'm', problem: 'buzzing frets' }).select('id').single();
    const { data: sel } = await admin.from('seller_enquiries').insert({ user_id: custA.id, name: 'A', email: custA.email, whatsapp: '0821234567', brand: 'b', model: 'm', condition: 'broken', suburb: 'Sandringham' }).select('id').single();
    assert.equal((await A.from('repairs').select('id').eq('id', rep.id)).data.length, 1);
    assert.equal((await B.from('repairs').select('id').eq('id', rep.id)).data.length, 0);
    assert.equal((await B.from('seller_enquiries').select('id').eq('id', sel.id)).data.length, 0);
    assert.equal((await anon().from('repairs').select('id').eq('id', rep.id)).data.length, 0);
    // Staff with only the "repairs" permission can see repairs but not seller enquiries.
    assert.equal((await S.from('repairs').select('id').eq('id', rep.id)).data.length, 1);
    assert.equal((await S.from('seller_enquiries').select('id').eq('id', sel.id)).data.length, 0);
  });
  test('a customer cannot change another customer\'s record by guessing its id', async () => {
    const { data: rep } = await admin.from('repairs').insert({ user_id: custA.id, name: 'A', email: custA.email, brand: 'b', model: 'm', problem: 'needs setup' }).select('id').single();
    await B.from('repairs').update({ admin_notes: 'hacked' }).eq('id', rep.id);
    await A.from('repairs').update({ admin_notes: 'hacked' }).eq('id', rep.id);
    const { data } = await admin.from('repairs').select('admin_notes').eq('id', rep.id).single();
    assert.equal(data.admin_notes, '');
  });
  test('profiles: a customer sees only their own and cannot read others', async () => {
    const { data } = await A.from('profiles').select('id');
    assert.deepEqual(data.map((r) => r.id), [custA.id]);
  });
});

describe('privilege escalation is blocked', () => {
  test('a customer cannot make themselves an admin', async () => {
    const { error } = await A.from('profiles').update({ role: 'owner' }).eq('id', custA.id);
    assert.ok(error);
    assert.equal(psql(`select role from public.profiles where id='${custA.id}'`), 'customer');
  });
  test('a customer cannot grant themselves permissions or use owner functions', async () => {
    const { error: e1 } = await A.from('profiles').update({ permissions: ['inventory'] }).eq('id', custA.id);
    const { error: e2 } = await A.rpc('owner_set_access', { p_user_id: custA.id, p_role: 'owner', p_permissions: [], p_blocked: false });
    const { error: e3 } = await A.rpc('bootstrap_owner', { p_email: custA.email });
    assert.ok(e1 && e2 && e3);
    assert.equal(psql(`select role from public.profiles where id='${custA.id}'`), 'customer');
  });
  test('staff cannot use permissions they were not given', async () => {
    const { error } = await S.from('products').insert({ slug: 'x-' + unique(), brand: 'b', model: 'm', category: 'bass', condition: 'good', price: 1 });
    assert.ok(error, 'repairs-only staff must not create products');
    const { error: e2 } = await S.rpc('owner_set_access', { p_user_id: staffRepairs.id, p_role: 'owner', p_permissions: [], p_blocked: false });
    assert.ok(e2, 'staff cannot promote themselves');
  });
  test('customers cannot call server-only functions (reservations, enquiries, rate limits)', async () => {
    const pid = makeProduct();
    const r = await A.rpc('reserve_product', { p_product_id: pid, p_user_id: custB.id, p_name: 'x', p_email: 'x', p_phone: '0', p_message: '' });
    const e = await A.rpc('submit_enquiry', { p_user_id: custB.id, p_name: 'x', p_email: 'x@x.test', p_phone: '', p_preferred_contact: 'email', p_message: '', p_product_ids: [pid] });
    assert.ok(r.error && e.error);
  });
  test('product status cannot be changed directly (must use the reservation-aware function)', async () => {
    const pid = makeProduct();
    await O.from('products').update({ status: 'sold' }).eq('id', pid);
    assert.equal(psql(`select status from public.products where id='${pid}'`), 'available');
  });
  test('blocked staff lose access immediately', async () => {
    const blocked = await makeUser('blocked', 'staff', ['inventory']);
    const c = await signedIn(blocked.email);
    psql(`update public.profiles set is_blocked = true where id='${blocked.id}'`);
    const { error } = await c.from('products').insert({ slug: 'b-' + unique(), brand: 'b', model: 'm', category: 'bass', condition: 'good', price: 1 });
    assert.ok(error);
  });
});

describe('reservations', () => {
  test('only ONE of many simultaneous reservation attempts succeeds', async () => {
    const pid = makeProduct();
    const users = await Promise.all(Array.from({ length: 8 }, (_, i) => makeUser('racer' + i)));
    const results = await Promise.all(users.map((u) => admin.rpc('reserve_product', { p_product_id: pid, p_user_id: u.id, p_name: 'Racer', p_email: u.email, p_phone: '0821234567', p_message: '' })));
    assert.equal(results.filter((r) => !r.error).length, 1);
    assert.ok(results.filter((r) => r.error).every((r) => /already reserved/.test(r.error.message)));
    assert.equal(psql(`select status from public.products where id='${pid}'`), 'reserved');
    assert.equal(psql(`select count(*) from public.reservations where product_id='${pid}' and status='active'`), '1');
  });
  test('default reservation lasts 48 hours', async () => {
    const pid = makeProduct();
    const { data } = await admin.rpc('reserve_product', { p_product_id: pid, p_user_id: custA.id, p_name: 'A', p_email: custA.email, p_phone: '0821234567', p_message: '' });
    const hours = (new Date(data.expires_at) - new Date(data.created_at)) / 3600000;
    assert.ok(Math.abs(hours - 48) < 0.01, `expected 48h, got ${hours}`);
    await A.rpc('customer_cancel_reservation', { p_reservation_id: data.id });
  });
  test('sold guitars cannot be reserved', async () => {
    const pid = makeProduct({ status: 'sold' });
    const { error } = await admin.rpc('reserve_product', { p_product_id: pid, p_user_id: custA.id, p_name: 'A', p_email: custA.email, p_phone: '1', p_message: '' });
    assert.match(error.message, /already been sold/);
  });
  test('expired reservations are released automatically and history is kept', async () => {
    const pid = makeProduct();
    const { data } = await admin.rpc('reserve_product', { p_product_id: pid, p_user_id: custB.id, p_name: 'B', p_email: custB.email, p_phone: '1', p_message: '' });
    psql(`update public.reservations set expires_at = now() - interval '1 minute' where id='${data.id}'`);
    const { data: n } = await anon().rpc('expire_reservations');
    assert.ok(n >= 1);
    assert.equal(psql(`select status from public.reservations where id='${data.id}'`), 'expired');
    assert.equal(psql(`select status from public.products where id='${pid}'`), 'available');
    assert.equal(psql(`select string_agg(to_status, ',' order by id) from public.status_history where entity_id='${data.id}'`), 'active,expired');
  });
  test('expiry does not override an owner\'s sale', async () => {
    const pid = makeProduct();
    const { data } = await admin.rpc('reserve_product', { p_product_id: pid, p_user_id: custB.id, p_name: 'B', p_email: custB.email, p_phone: '1', p_message: '' });
    const { error } = await O.rpc('staff_reservation_action', { p_reservation_id: data.id, p_action: 'convert' });
    assert.ifError(error);
    psql(`update public.reservations set expires_at = now() - interval '1 minute' where id='${data.id}'`);
    await anon().rpc('expire_reservations');
    assert.equal(psql(`select status from public.products where id='${pid}'`), 'sold');
  });
  test('customers cannot cancel someone else\'s reservation', async () => {
    const pid = makeProduct();
    const { data } = await admin.rpc('reserve_product', { p_product_id: pid, p_user_id: custA.id, p_name: 'A', p_email: custA.email, p_phone: '1', p_message: '' });
    const { error } = await B.rpc('customer_cancel_reservation', { p_reservation_id: data.id });
    assert.ok(error);
    assert.equal(psql(`select status from public.reservations where id='${data.id}'`), 'active');
  });
  test('per-customer reservation limit is enforced', async () => {
    const u = await makeUser('limit');
    const ok1 = await admin.rpc('reserve_product', { p_product_id: makeProduct(), p_user_id: u.id, p_name: 'L', p_email: u.email, p_phone: '1', p_message: '' });
    const ok2 = await admin.rpc('reserve_product', { p_product_id: makeProduct(), p_user_id: u.id, p_name: 'L', p_email: u.email, p_phone: '1', p_message: '' });
    const no3 = await admin.rpc('reserve_product', { p_product_id: makeProduct(), p_user_id: u.id, p_name: 'L', p_email: u.email, p_phone: '1', p_message: '' });
    assert.ok(!ok1.error && !ok2.error);
    assert.match(no3.error.message, /up to 2 reservations/);
  });
});

describe('purchase enquiries re-check availability', () => {
  test('an enquiry including a sold guitar is refused as a whole', async () => {
    const free = makeProduct();
    const sold = makeProduct({ status: 'sold' });
    const { error } = await admin.rpc('submit_enquiry', { p_user_id: null, p_name: 'G', p_email: 'g@x.test', p_phone: '', p_preferred_contact: 'email', p_message: '', p_product_ids: [free, sold] });
    assert.match(error.message, /No longer available/);
  });
  test('the customer who reserved a guitar CAN enquire about it; others cannot', async () => {
    const pid = makeProduct();
    const u = await makeUser('enq');
    await admin.rpc('reserve_product', { p_product_id: pid, p_user_id: u.id, p_name: 'E', p_email: u.email, p_phone: '1', p_message: '' });
    const mine = await admin.rpc('submit_enquiry', { p_user_id: u.id, p_name: 'E', p_email: u.email, p_phone: '', p_preferred_contact: 'email', p_message: '', p_product_ids: [pid] });
    const other = await admin.rpc('submit_enquiry', { p_user_id: custB.id, p_name: 'B', p_email: custB.email, p_phone: '', p_preferred_contact: 'email', p_message: '', p_product_ids: [pid] });
    assert.ifError(mine.error);
    assert.ok(other.error);
    assert.equal(psql(`select count(*) from public.enquiry_items where enquiry_id='${mine.data.id}'`), '1');
  });
});

describe('repairs: quote approval rules', () => {
  test('work cannot start before the customer approves; extra costs need approval too', async () => {
    const { data: rep } = await admin.from('repairs').insert({ user_id: custA.id, name: 'A', email: custA.email, brand: 'Yamaha', model: 'C40', problem: 'cracked bridge' }).select('id').single();
    // Staff cannot jump to "in progress" without an approved quote.
    let r = await S.rpc('set_status', { p_entity: 'repairs', p_id: rep.id, p_status: 'repair-in-progress', p_note: '', p_visible: true });
    assert.match(r.error.message, /must approve the quote/);
    const { data: q1 } = await S.rpc('staff_send_quote', { p_repair_id: rep.id, p_kind: 'initial', p_labour: 400, p_parts: 150, p_parts_detail: 'bone saddle', p_notes: '' });
    assert.equal(Number(q1.total_amount), 550);
    assert.equal(psql(`select status from public.repairs where id='${rep.id}'`), 'awaiting-quote-approval');
    // Another customer cannot approve it.
    assert.ok((await B.rpc('customer_decide_quote', { p_quote_id: q1.id, p_decision: 'approved' })).error);
    // The real customer approves on the website.
    const ok = await A.rpc('customer_decide_quote', { p_quote_id: q1.id, p_decision: 'approved', p_note: '' });
    assert.ifError(ok.error);
    assert.equal(psql(`select status from public.repairs where id='${rep.id}'`), 'approved');
    r = await S.rpc('set_status', { p_entity: 'repairs', p_id: rep.id, p_status: 'repair-in-progress', p_note: 'Started', p_visible: true });
    assert.ifError(r.error);
    // Additional cost: pending quote blocks completion until a decision is recorded.
    const { data: q2 } = await S.rpc('staff_send_quote', { p_repair_id: rep.id, p_kind: 'additional', p_labour: 100, p_parts: 0, p_parts_detail: '', p_notes: 'loose brace' });
    r = await S.rpc('set_status', { p_entity: 'repairs', p_id: rep.id, p_status: 'repair-completed', p_note: '', p_visible: true });
    assert.match(r.error.message, /awaiting the customer/);
    // Staff recording a decision must say how the customer gave it.
    assert.ok((await S.rpc('staff_record_quote_decision', { p_quote_id: q2.id, p_decision: 'approved', p_method: 'whatsapp', p_note: '' })).error);
    assert.ifError((await S.rpc('staff_record_quote_decision', { p_quote_id: q2.id, p_decision: 'approved', p_method: 'whatsapp', p_note: 'WA 3 Nov 10:02 "yes"' })).error);
    r = await S.rpc('set_status', { p_entity: 'repairs', p_id: rep.id, p_status: 'repair-completed', p_note: '', p_visible: true });
    assert.ifError(r.error);
    assert.notEqual(psql(`select completed_at from public.repairs where id='${rep.id}'`), '');
    const history = psql(`select string_agg(to_status, ',' order by id) from public.status_history where entity_id='${rep.id}' and from_status is distinct from to_status`);
    assert.equal(history, 'request-received,awaiting-quote-approval,approved,repair-in-progress,repair-completed');
  });
});

describe('payments are manual and owner-only', () => {
  test('customers cannot record payments; staff without permission cannot either; voids are kept', async () => {
    const pid = makeProduct();
    const row = { entity_type: 'product', entity_id: pid, amount: 2500, method: 'eft', received_on: '2026-10-01', verified_confirmation: true };
    assert.ok((await A.from('payments').insert({ ...row, recorded_by: custA.id })).error);
    assert.ok((await S.from('payments').insert({ ...row, recorded_by: staffRepairs.id })).error);
    // Unverified payments cannot be stored at all.
    assert.ok((await O.from('payments').insert({ ...row, verified_confirmation: false, recorded_by: owner.id })).error);
    const { data, error } = await O.from('payments').insert({ ...row, recorded_by: owner.id }).select('id').single();
    assert.ifError(error);
    assert.ok((await O.from('payments').delete().eq('id', data.id)).error || psql(`select count(*) from public.payments where id='${data.id}'`) === '1');
    assert.ifError((await O.from('payments').update({ voided: true, void_reason: 'typo' }).eq('id', data.id)).error);
    assert.equal(psql(`select voided from public.payments where id='${data.id}'`), 't');
  });
});

describe('audit log', () => {
  test('admin changes are recorded with who did them; customers cannot read or alter the log', async () => {
    const pid = makeProduct();
    await O.from('products').update({ price: 3100 }).eq('id', pid);
    const entry = psql(`select actor_id || '|' || (changes->'price'->>'to') from public.audit_log where table_name='products' and record_id='${pid}' and action='update' order by id desc limit 1`);
    assert.equal(entry, `${owner.id}|3100.00`);
    assert.equal((await A.from('audit_log').select('id').limit(1)).data.length, 0);
    assert.ok((await O.from('audit_log').delete().gt('id', 0)).error || Number(psql('select count(*) from public.audit_log')) > 0);
  });
});

describe('storage', () => {
  test('private submission files cannot be listed or read by visitors or customers', async () => {
    const path = `repair/${crypto.randomUUID()}/x.jpg`;
    await admin.storage.from('submissions').upload(path, new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }), { contentType: 'image/jpeg' });
    const a = await anon().storage.from('submissions').download(path);
    const c = await A.storage.from('submissions').download(path);
    const s = await S.storage.from('submissions').download(path); // repairs staff may read repair files
    assert.ok(a.error && c.error);
    assert.ifError(s.error);
  });
  test('customers cannot upload product photos; disallowed file types are rejected', async () => {
    const r = await A.storage.from('product-images').upload(`x/${unique()}.jpg`, new Blob(['x'], { type: 'image/jpeg' }), { contentType: 'image/jpeg' });
    assert.ok(r.error);
    const { data } = await admin.storage.from('submissions').createSignedUploadUrl(`seller/${crypto.randomUUID()}/evil.html`);
    const up = await anon().storage.from('submissions').uploadToSignedUrl(data.path, data.token, new Blob(['<script>'], { type: 'text/html' }), { contentType: 'text/html' });
    assert.ok(up.error, 'HTML must be rejected by the bucket allow-list');
  });
});
