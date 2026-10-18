// Database security & workflow integration tests.
// Runs against a LOCAL Supabase stack (`npx supabase start`). Never run against production.
// Usage: npm run test:db
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import "../load-env.mjs";

const URL = process.env.TEST_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON = process.env.TEST_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.TEST_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;
if (!ANON || !SECRET) throw new Error("Set the LOCAL keys from `npx supabase status` in .env.local");
const DB_URL = process.env.TEST_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (!/127\.0\.0\.1|localhost/.test(URL)) throw new Error("Refusing to run tests against a non-local database");

const service = createClient(URL, SECRET, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const sql = (q) => execFileSync("psql", [DB_URL, "-At", "-c", q], { encoding: "utf8" }).trim();

async function makeUser(label) {
  const email = `${label}-${run}@test.local`;
  const password = "Test-pass-123";
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `${label} Tester` } });
  if (error) throw error;
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, email, client };
}

let admin, alice, bob, categoryId, productA, productB, draftProduct;

before(async () => {
  admin = await makeUser("admin");
  alice = await makeUser("alice");
  bob = await makeUser("bob");
  sql(`select public.promote_to_admin('${admin.email}')`);
  // re-sign-in not needed: is_admin() reads the profile row on every request
  categoryId = Number(sql(`select id from public.categories where slug = 'electric-guitars'`));
  const mk = async (title, status) => {
    const { data, error } = await admin.client
      .from("products")
      .insert({ slug: `t-${title.toLowerCase().replace(/\W+/g, "-")}-${run}`, title, category_id: categoryId, price: 5000, condition: "good", status })
      .select("id, slug")
      .single();
    if (error) throw error;
    await admin.client.from("product_private").insert({ product_id: data.id, serial_number: "SN-SECRET-123" });
    return data;
  };
  productA = await mk(`Test Strat A ${run}`, "published");
  productB = await mk(`Test Bass B ${run}`, "published");
  draftProduct = await mk(`Draft Tele ${run}`, "draft");
});

// ---------------------------------------------------------------------------
test("public visitors see published products but not drafts or private data", async () => {
  const { data } = await anon.from("products").select("id").in("id", [productA.id, draftProduct.id]);
  assert.deepEqual(data.map((r) => r.id), [productA.id]);
  const { data: priv } = await anon.from("product_private").select("*");
  assert.equal(priv?.length ?? 0, 0, "anon must not read serial numbers");
  const { data: privCustomer } = await alice.client.from("product_private").select("*");
  assert.equal(privCustomer.length, 0, "customers must not read serial numbers");
  const { data: privAdmin } = await admin.client.from("product_private").select("*").eq("product_id", productA.id);
  assert.equal(privAdmin[0].serial_number, "SN-SECRET-123");
});

test("customers cannot create or change products, roles or settings", async () => {
  const { error: e1 } = await alice.client.from("products").insert({ slug: `hack-${run}`, title: "Hack", category_id: categoryId, price: 1, condition: "good", status: "published" });
  assert.ok(e1, "insert must fail");
  const { data: upd } = await alice.client.from("products").update({ price: 1 }).eq("id", productA.id).select();
  assert.equal(upd.length, 0, "update must affect 0 rows");
  const { error: e2 } = await alice.client.from("profiles").update({ role: "admin" }).eq("id", alice.id);
  assert.ok(e2, "self-promotion must fail");
  assert.equal(sql(`select role from public.profiles where id = '${alice.id}'`), "customer");
  const { error: e3 } = await alice.client.rpc("promote_to_admin", { p_email: alice.email });
  assert.ok(e3, "promote_to_admin must not be callable via API");
  const { data: s } = await alice.client.from("site_settings").update({ value: '"hacked"' }).eq("key", "whatsapp_number").select();
  assert.equal(s.length, 0);
  const { data: hidden } = await anon.from("site_settings").select("key").eq("key", "collection_address");
  assert.equal(hidden.length, 0, "private settings (address) must be hidden from the public");
  const { error: e4 } = await alice.client.rpc("admin_overview", { p_days: 30 });
  assert.ok(e4, "admin_overview must reject customers");
});

test("purchase request: saved, availability checked, private to its owner, notifies admin", async () => {
  const { data, error } = await alice.client.rpc("submit_purchase_request", {
    p_items: [{ product_id: productA.id, quantity: 1 }],
    p_contact_name: "Alice Tester",
    p_contact_phone: "082 123 4567",
    p_contact_email: alice.email,
    p_preferred_contact: "whatsapp",
    p_message: "Can I view it?",
  });
  assert.ifError(error);
  const id = data[0].id;
  assert.match(data[0].reference, /^G4U-PR-\d+$/);
  const { data: mine } = await alice.client.from("purchase_requests").select("id, status, total_estimate").eq("id", id).single();
  assert.equal(mine.status, "submitted");
  assert.equal(Number(mine.total_estimate), 5000);
  const { data: bobs } = await bob.client.from("purchase_requests").select("id").eq("id", id);
  assert.equal(bobs.length, 0, "another customer must not see it");
  const { data: anonView } = await anon.from("purchase_requests").select("id");
  assert.equal(anonView?.length ?? 0, 0);
  const { data: adminView } = await admin.client.from("purchase_requests").select("contact_phone").eq("id", id).single();
  assert.equal(adminView.contact_phone, "082 123 4567");
  const { count } = await admin.client.from("notifications").select("*", { count: "exact", head: true }).eq("audience", "admin").ilike("title", `%${data[0].reference}%`);
  assert.equal(count, 1, "admin notified");
  // Customers cannot set status themselves
  const { data: upd } = await alice.client.from("purchase_requests").update({ status: "completed" }).eq("id", id).select();
  assert.equal(upd.length, 0);
  // Admin updates status → customer notified + timeline
  await admin.client.from("purchase_requests").update({ status: "accepted", customer_message: "Yes! Let's arrange EFT." }).eq("id", id);
  const { data: notes } = await alice.client.from("notifications").select("title, body").ilike("title", `%${data[0].reference}%updated%`);
  assert.equal(notes.length, 1);
  assert.match(notes[0].body, /arrange EFT/);
  const { data: events } = await alice.client.from("status_events").select("to_status").eq("entity_id", id).order("created_at");
  assert.deepEqual(events.map((e) => e.to_status), ["submitted", "accepted"]);
  // Notifications of one customer are invisible to another
  const { data: bobNotes } = await bob.client.from("notifications").select("id").ilike("title", `%${data[0].reference}%`);
  assert.equal(bobNotes.length, 0);
});

test("purchase requests are rejected for unavailable (draft/sold) items", async () => {
  const { error } = await alice.client.rpc("submit_purchase_request", {
    p_items: [{ product_id: draftProduct.id, quantity: 1 }],
    p_contact_name: "Alice", p_contact_phone: "0821234567", p_contact_email: "", p_preferred_contact: "whatsapp", p_message: "",
  });
  assert.ok(error);
  assert.match(error.message, /no longer available/);
  const { error: anonErr } = await anon.rpc("submit_purchase_request", {
    p_items: [{ product_id: productA.id, quantity: 1 }],
    p_contact_name: "Anon", p_contact_phone: "0821234567", p_contact_email: "", p_preferred_contact: "whatsapp", p_message: "",
  });
  assert.ok(anonErr, "anonymous visitors cannot submit");
});

test("reservations need admin approval, prevent conflicts, and release correctly", async () => {
  const req = (c) => c.rpc("request_reservation", { p_product_id: productB.id, p_contact_name: "Res Tester", p_contact_phone: "0821234567", p_contact_email: "", p_preferred_contact: "whatsapp", p_message: "" });
  const { data: a, error: ea } = await req(alice.client);
  assert.ifError(ea);
  const { error: dup } = await req(alice.client);
  assert.ok(dup, "duplicate pending request blocked");
  const { data: b } = await req(bob.client);
  // still requested → product not reserved yet
  assert.equal(sql(`select status from public.products where id='${productB.id}'`), "published");
  // customers cannot approve
  const { error: notAdmin } = await alice.client.rpc("approve_reservation", { p_id: a[0].id, p_hold_days: 3, p_message: "" });
  assert.ok(notAdmin);
  const { error: appr } = await admin.client.rpc("approve_reservation", { p_id: a[0].id, p_hold_days: 2, p_message: "" });
  assert.ifError(appr);
  assert.equal(sql(`select status from public.products where id='${productB.id}'`), "reserved");
  // second approval conflicts
  const { error: conflict } = await admin.client.rpc("approve_reservation", { p_id: b[0].id, p_hold_days: 2, p_message: "" });
  assert.ok(conflict, "cannot approve two reservations for one item");
  // new requests on a reserved item are refused
  const carol = await makeUser("carol");
  const { error: reservedErr } = await req(carol.client);
  assert.ok(reservedErr);
  // purchase requests for reserved item refused too
  const { error: prErr } = await carol.client.rpc("submit_purchase_request", { p_items: [{ product_id: productB.id, quantity: 1 }], p_contact_name: "Carol", p_contact_phone: "0821234567", p_contact_email: "", p_preferred_contact: "whatsapp", p_message: "" });
  assert.ok(prErr);
  // expiry releases the item
  sql(`update public.reservations set expires_at = now() - interval '1 minute' where id = '${a[0].id}'`);
  await anon.rpc("expire_stale_records");
  assert.equal(sql(`select status from public.reservations where id='${a[0].id}'`), "expired");
  assert.equal(sql(`select status from public.products where id='${productB.id}'`), "published");
  // approve bob, then bob cancels → released
  assert.ifError((await admin.client.rpc("approve_reservation", { p_id: b[0].id, p_hold_days: 3, p_message: "" })).error);
  assert.ifError((await bob.client.rpc("cancel_reservation", { p_id: b[0].id })).error);
  assert.equal(sql(`select status from public.products where id='${productB.id}'`), "published");
});

test("availability alerts notify customers when an item becomes available again", async () => {
  await admin.client.from("products").update({ status: "reserved" }).eq("id", productB.id);
  const { error } = await alice.client.from("availability_alerts").insert({ user_id: alice.id, product_id: productB.id });
  assert.ifError(error);
  await admin.client.from("products").update({ status: "published" }).eq("id", productB.id);
  const { data } = await alice.client.from("notifications").select("title").eq("type", "availability");
  assert.ok(data.some((n) => n.title.includes(`Test Bass B ${run}`)));
});

test("marking an item sold declines its pending reservation requests and shows in the sold archive", async () => {
  const dave = await makeUser("dave");
  const { data: r } = await dave.client.rpc("request_reservation", { p_product_id: productA.id, p_contact_name: "Dave", p_contact_phone: "0821234567", p_contact_email: "", p_preferred_contact: "whatsapp", p_message: "" });
  await admin.client.from("products").update({ status: "sold" }).eq("id", productA.id);
  assert.equal(sql(`select status from public.reservations where id='${r[0].id}'`), "declined");
  assert.notEqual(sql(`select sold_at from public.products where id='${productA.id}'`), "");
  const { data } = await anon.rpc("search_products", { p_availability: "sold", p_q: `Test Strat A ${run}` });
  assert.equal(data.length, 1);
  const { data: avail } = await anon.rpc("search_products", { p_availability: "available", p_q: `Test Strat A ${run}` });
  assert.equal(avail.length, 0, "sold items are removed from active purchasing");
});

test("seller submission → offer → acceptance, with server-controlled fields", async () => {
  const { data: sub, error } = await alice.client
    .from("seller_submissions")
    .insert({ user_id: alice.id, contact_name: "Alice", contact_phone: "0821234567", brand: "Fender", model: "Strat", category_id: categoryId, condition: "fair", is_working: false, privacy_consent: true, status: "purchased", customer_message: "fake" })
    .select("id, status, customer_message")
    .single();
  assert.ifError(error);
  assert.equal(sub.status, "submitted", "customers cannot choose the status");
  assert.equal(sub.customer_message, null);
  const { error: noConsent } = await alice.client.from("seller_submissions").insert({ user_id: alice.id, contact_name: "Alice", brand: "X", model: "Y", condition: "fair", is_working: true, privacy_consent: false });
  assert.ok(noConsent, "privacy consent required");
  // bob cannot see it or respond
  const { data: bobView } = await bob.client.from("seller_submissions").select("id").eq("id", sub.id);
  assert.equal(bobView.length, 0);
  const { error: offerErr } = await alice.client.from("seller_offers").insert({ submission_id: sub.id, amount: 99999 });
  assert.ok(offerErr, "customers cannot create offers");
  const { data: offer, error: oe } = await admin.client.from("seller_offers").insert({ submission_id: sub.id, amount: 2500, message: "Subject to inspection" }).select("id").single();
  assert.ifError(oe);
  assert.equal(sql(`select status from public.seller_submissions where id='${sub.id}'`), "offer_made");
  const { error: bobResp } = await bob.client.rpc("respond_to_offer", { p_offer_id: offer.id, p_accept: true });
  assert.ok(bobResp, "only the seller can respond");
  assert.ifError((await alice.client.rpc("respond_to_offer", { p_offer_id: offer.id, p_accept: true })).error);
  assert.equal(sql(`select status from public.seller_submissions where id='${sub.id}'`), "offer_accepted");
  const { count } = await admin.client.from("notifications").select("*", { count: "exact", head: true }).eq("audience", "admin").ilike("title", "%Offer accepted%");
  assert.ok(count >= 1, "admin notified of acceptance");
});

test("repair booking: quote → customer accepts → stays awaiting owner approval", async () => {
  const { data: rep, error } = await bob.client
    .from("repair_bookings")
    .insert({ user_id: bob.id, contact_name: "Bob", contact_phone: "0821234567", guitar_type: "acoustic", problem_description: "Buzzing on the low E string", requested_services: ["setup"], status: "in_progress", quote_amount: 1 })
    .select("id, status, quote_amount")
    .single();
  assert.ifError(error);
  assert.equal(rep.status, "submitted");
  assert.equal(rep.quote_amount, null, "customers cannot set quotes");
  const { error: past } = await bob.client.from("repair_bookings").insert({ user_id: bob.id, contact_name: "Bob", contact_phone: "0821234567", guitar_type: "acoustic", problem_description: "Buzzing on the low E string", requested_services: ["setup"], preferred_date: "2020-01-01" });
  assert.ok(past, "past dates rejected");
  await admin.client.from("repair_bookings").update({ quote_amount: 650, quote_message: "Full setup", status: "quote_provided" }).eq("id", rep.id);
  assert.equal(sql(`select quote_status from public.repair_bookings where id='${rep.id}'`), "pending");
  assert.ifError((await bob.client.rpc("respond_to_repair_quote", { p_id: rep.id, p_accept: true })).error);
  assert.equal(sql(`select status || '/' || quote_status from public.repair_bookings where id='${rep.id}'`), "awaiting_review/accepted");
  const { data: aliceView } = await alice.client.from("repair_bookings").select("id").eq("id", rep.id);
  assert.equal(aliceView.length, 0);
});

test("reviews require moderation; verified purchase is never self-declared", async () => {
  const { data: rv, error } = await bob.client
    .from("reviews")
    .insert({ user_id: bob.id, display_name: "Bob", rating: 5, body: "Great service and a lovely guitar, thanks!", status: "approved", verified_purchase: true })
    .select("id, status, verified_purchase")
    .single();
  assert.ifError(error);
  assert.equal(rv.status, "pending");
  assert.equal(rv.verified_purchase, false, "bob has no completed purchase");
  const { data: pub1 } = await anon.from("public_reviews").select("id").eq("id", rv.id);
  assert.equal(pub1.length, 0, "pending review not public");
  await admin.client.from("reviews").update({ status: "approved" }).eq("id", rv.id);
  const { data: pub2 } = await anon.from("public_reviews").select("*").eq("id", rv.id);
  assert.equal(pub2.length, 1);
  assert.equal(pub2[0].user_id, undefined, "user id not exposed publicly");
  // Alice has a completed purchase → verified
  sql(`update public.purchase_requests set status='completed' where user_id='${alice.id}'`);
  const { data: rv2 } = await alice.client.from("reviews").insert({ user_id: alice.id, display_name: "Alice", rating: 4, body: "Smooth purchase, honest description." }).select("verified_purchase").single();
  assert.equal(rv2.verified_purchase, true);
  // reports
  assert.ifError((await alice.client.from("review_reports").insert({ review_id: rv.id, reason: "Looks like spam" })).error);
  const { data: rep } = await alice.client.from("review_reports").select("id");
  assert.equal(rep.length, 0, "reports readable by admin only");
});

test("rate limiting stops floods of submissions", async () => {
  const eve = await makeUser("eve");
  let lastError = null;
  for (let i = 0; i < 6; i++) {
    const { error } = await eve.client.from("repair_bookings").insert({ user_id: eve.id, contact_name: "Eve", contact_phone: "0821234567", guitar_type: "electric", problem_description: "Pickup not working at all", requested_services: ["electronics"] });
    lastError = error;
  }
  assert.ok(lastError, "6th booking within a day is refused");
  assert.match(lastError.message, /Too many/);
});

test("contact form works for visitors with validation and limits", async () => {
  const { error } = await anon.rpc("submit_contact_message", { p_name: "Visitor", p_email: `v-${run}@test.local`, p_phone: "", p_subject: "Hi", p_message: "Do you have any Gibsons?" });
  assert.ifError(error);
  const { error: noContact } = await anon.rpc("submit_contact_message", { p_name: "Visitor", p_email: "", p_phone: "", p_subject: "", p_message: "Do you have any Gibsons?" });
  assert.ok(noContact);
  const { data } = await anon.from("contact_messages").select("id");
  assert.equal(data?.length ?? 0, 0, "messages are not public");
});

test("storage: private photos are isolated per customer; shop photos are admin-only uploads", async () => {
  const png = new Blob([Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex")], { type: "image/png" });
  const own = `${alice.id}/test-${run}/a.png`;
  assert.ifError((await alice.client.storage.from("submission-images").upload(own, png, { contentType: "image/png" })).error);
  const { error: foreign } = await alice.client.storage.from("submission-images").upload(`${bob.id}/x/a.png`, png, { contentType: "image/png" });
  assert.ok(foreign, "cannot upload into another user's folder");
  const { data: bobRead } = await bob.client.storage.from("submission-images").createSignedUrl(own, 60);
  assert.equal(bobRead, null, "other customers cannot read the photo");
  const { data: adminRead } = await admin.client.storage.from("submission-images").createSignedUrl(own, 60);
  assert.ok(adminRead?.signedUrl, "admin can read");
  const { error: badType } = await alice.client.storage.from("submission-images").upload(`${alice.id}/x/evil.html`, new Blob(["<script>"], { type: "text/html" }), { contentType: "text/html" });
  assert.ok(badType, "non-image files rejected");
  const { error: shopUpload } = await alice.client.storage.from("product-images").upload(`x-${run}.png`, png, { contentType: "image/png" });
  assert.ok(shopUpload, "customers cannot upload shop photos");
  assert.ifError((await admin.client.storage.from("product-images").upload(`x-${run}.png`, png, { contentType: "image/png" })).error);
});

test("audit log records admin changes and is admin-only", async () => {
  const { data } = await admin.client.from("audit_logs").select("action, table_name, actor_email").eq("table_name", "products").eq("actor_id", admin.id).limit(5);
  assert.ok(data.length > 0);
  assert.equal(data[0].actor_email, admin.email);
  const { data: c } = await alice.client.from("audit_logs").select("id");
  assert.equal(c.length, 0);
  const { error } = await admin.client.from("audit_logs").delete().gt("id", 0);
  const remaining = Number(sql(`select count(*) from public.audit_logs`));
  assert.ok(error || remaining > 0, "audit log cannot be deleted via the API");
});

test("account deletion anonymises records but keeps business history", async () => {
  const frank = await makeUser("frank");
  await admin.client.from("products").update({ status: "published" }).eq("id", productB.id);
  const { data: pr } = await frank.client.rpc("submit_purchase_request", { p_items: [{ product_id: productB.id, quantity: 1 }], p_contact_name: "Frank Private", p_contact_phone: "0831112222", p_contact_email: frank.email, p_preferred_contact: "email", p_message: "secret" });
  await frank.client.from("data_requests").insert({ user_id: frank.id, request_type: "deletion" });
  const { error: notAllowed } = await frank.client.rpc("admin_anonymise_user", { p_user_id: frank.id });
  assert.ok(notAllowed);
  assert.ifError((await admin.client.rpc("admin_anonymise_user", { p_user_id: frank.id })).error);
  assert.equal(sql(`select count(*) from auth.users where id='${frank.id}'`), "0");
  assert.equal(sql(`select contact_name || '|' || coalesce(contact_phone,'null') || '|' || coalesce(user_id::text,'null') from public.purchase_requests where id='${pr[0].id}'`), "Deleted customer|null|null");
});

test("demo data can be loaded and fully removed", async () => {
  await admin.client.rpc("admin_remove_demo_data");
  const { data: n, error } = await admin.client.rpc("admin_load_demo_data");
  assert.ifError(error);
  assert.equal(n, 4);
  const { data: demo } = await anon.from("products").select("id").eq("is_demo", true);
  assert.equal(demo.length, 4);
  const { error: custErr } = await alice.client.rpc("admin_remove_demo_data");
  assert.ok(custErr);
  assert.equal((await admin.client.rpc("admin_remove_demo_data")).data, 4);
  assert.equal(sql(`select count(*) from public.products where is_demo`), "0");
});
