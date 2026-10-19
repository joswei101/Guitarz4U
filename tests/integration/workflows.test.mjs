// Integration tests for database security (RLS) and business workflows.
// Run with: npm run test:db   (requires `npx supabase start`)
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { anon, cleanup, contact, makeProduct, makeUser, productStatus, service } from "./helpers.mjs";

after(cleanup);

test("public visitors only see published/reserved products and never private data", async () => {
  const draft = await makeProduct({ status: "draft" });
  const live = await makeProduct();
  await service.from("product_private").insert({ product_id: live.id, serial_number: "SECRET-123" });
  const a = anon();

  const { data: visible } = await a.from("products").select("id").in("id", [draft.id, live.id]);
  assert.deepEqual(visible.map((p) => p.id), [live.id]);

  const { data: priv, error } = await a.from("product_private").select("*").eq("product_id", live.id);
  assert.ok(error || priv.length === 0, "anonymous users must not read serial numbers");

  const customer = await makeUser();
  const { data: priv2 } = await customer.client.from("product_private").select("*").eq("product_id", live.id);
  assert.equal(priv2?.length ?? 0, 0, "customers must not read serial numbers");
});

test("customers cannot make themselves administrators or write protected tables", async () => {
  const c = await makeUser();
  const { error } = await c.client.from("profiles").update({ role: "admin" }).eq("id", c.id);
  assert.ok(error, "role update must be rejected");
  const { data: me } = await service.from("profiles").select("role").eq("id", c.id).single();
  assert.equal(me.role, "customer");

  const { error: e2 } = await c.client.from("purchase_requests").insert({ user_id: c.id, contact_name: "x", contact_email: "a@b.co" });
  assert.ok(e2, "direct inserts into purchase_requests must be rejected");

  const product = await makeProduct();
  const { error: e3 } = await c.client.from("products").update({ price: 1 }).eq("id", product.id);
  const { data: after } = await service.from("products").select("price").eq("id", product.id).single();
  assert.ok(e3 || Number(after.price) === Number(product.price), "customers must not edit products");

  const { error: e4 } = await c.client.rpc("admin_set_purchase_status", {
    p_request_id: "00000000-0000-0000-0000-000000000000", p_status: "payment_confirmed", p_customer_message: "", p_admin_note: "",
  });
  assert.match(e4?.message ?? "", /NOT_AUTHORISED/);

  const { data: logs } = await c.client.from("audit_logs").select("id").limit(1);
  assert.equal(logs?.length ?? 0, 0, "customers must not read the audit log");
});

test("purchase request workflow with manual EFT confirmation by the administrator", async () => {
  const customer = await makeUser({ name: "Buyer One" });
  const other = await makeUser({ name: "Other Customer" });
  const admin = await makeUser({ admin: true, name: "Owner" });
  const product = await makeProduct();
  const draft = await makeProduct({ status: "draft" });

  // Drafts can't be requested.
  const bad = await customer.client.rpc("submit_purchase_request", { ...contact, p_product_ids: [draft.id] });
  assert.match(bad.error?.message ?? "", /PRODUCT_UNAVAILABLE/);

  const { data, error } = await customer.client.rpc("submit_purchase_request", { ...contact, p_product_ids: [product.id] });
  assert.ifError(error);
  const req = data[0];
  assert.match(req.reference, /^G4U-PR-\d{5}$/);

  // Submitting does not change inventory or confirm anything.
  assert.equal(await productStatus(product.id), "published");
  const { data: row } = await customer.client.from("purchase_requests").select("status, payment_confirmed_at, estimated_total").eq("id", req.id).single();
  assert.equal(row.status, "submitted");
  assert.equal(row.payment_confirmed_at, null);
  assert.equal(Number(row.estimated_total), Number(product.price));

  // Duplicate open request for the same guitar is rejected.
  const dup = await customer.client.rpc("submit_purchase_request", { ...contact, p_product_ids: [product.id] });
  assert.match(dup.error?.message ?? "", /DUPLICATE_REQUEST/);

  // Other customers cannot see it.
  const { data: peek } = await other.client.from("purchase_requests").select("id").eq("id", req.id);
  assert.equal(peek.length, 0);

  // Admin was notified.
  const { data: adminNotes } = await admin.client.from("notifications").select("title").ilike("title", `%${req.reference}%`);
  assert.ok(adminNotes.length >= 1, "admin should get an in-app notification");

  // Payment cannot be confirmed before approval.
  const early = await admin.client.rpc("admin_set_purchase_status", { p_request_id: req.id, p_status: "payment_confirmed", p_customer_message: "", p_admin_note: "" });
  assert.match(early.error?.message ?? "", /INVALID_TRANSITION/);

  // Approve -> guitar reserved; private note stays private.
  let r = await admin.client.rpc("admin_set_purchase_status", { p_request_id: req.id, p_status: "approved", p_customer_message: "Still available!", p_admin_note: "Customer seems keen" });
  assert.ifError(r.error);
  assert.equal(await productStatus(product.id), "reserved");
  const { data: custNotes } = await customer.client.from("admin_notes").select("*").eq("entity_id", req.id);
  assert.equal(custNotes.length, 0, "customers must never see admin notes");

  r = await admin.client.rpc("admin_set_purchase_status", { p_request_id: req.id, p_status: "awaiting_eft", p_customer_message: "EFT details sent on WhatsApp", p_admin_note: "" });
  assert.ifError(r.error);

  // Completing before payment confirmation is blocked.
  const tooSoon = await admin.client.rpc("admin_set_purchase_status", { p_request_id: req.id, p_status: "completed", p_customer_message: "", p_admin_note: "" });
  assert.match(tooSoon.error?.message ?? "", /INVALID_TRANSITION/);

  r = await admin.client.rpc("admin_set_purchase_status", { p_request_id: req.id, p_status: "payment_confirmed", p_customer_message: "Payment received, thank you", p_admin_note: "Checked FNB app" });
  assert.ifError(r.error);
  const { data: paid } = await service.from("purchase_requests").select("payment_confirmed_at, payment_confirmed_by, eft_instructions_sent_at").eq("id", req.id).single();
  assert.ok(paid.payment_confirmed_at);
  assert.equal(paid.payment_confirmed_by, admin.id);
  assert.ok(paid.eft_instructions_sent_at);

  r = await admin.client.rpc("admin_set_purchase_status", { p_request_id: req.id, p_status: "completed", p_customer_message: "", p_admin_note: "" });
  assert.ifError(r.error);
  assert.equal(await productStatus(product.id), "sold");

  // Sold guitars are no longer public or purchasable.
  const { data: pub } = await anon().from("products").select("id").eq("id", product.id);
  assert.equal(pub.length, 0);
  const again = await other.client.rpc("submit_purchase_request", { ...contact, p_product_ids: [product.id] });
  assert.match(again.error?.message ?? "", /PRODUCT_UNAVAILABLE/);

  // Customer sees the history and notifications.
  const { data: history } = await customer.client.from("status_updates").select("status").eq("entity_id", req.id);
  assert.deepEqual(new Set(history.map((h) => h.status)), new Set(["submitted", "approved", "awaiting_eft", "payment_confirmed", "completed"]));
  const { data: notes } = await customer.client.from("notifications").select("id, title, read_at");
  assert.ok(notes.length >= 5);

  // Customers can mark notifications read but not rewrite them.
  const n = notes[0];
  const upd = await customer.client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
  assert.ifError(upd.error);
  const hack = await customer.client.from("notifications").update({ title: "hacked" }).eq("id", n.id);
  assert.ok(hack.error, "notification titles must be read-only");

  // Audit log captured the change.
  const { data: audit } = await admin.client.from("audit_logs").select("action, actor_email, details").eq("entity_type", "purchase_requests").eq("entity_id", req.id);
  assert.ok(audit.some((a) => a.details?.status?.to === "payment_confirmed" && a.actor_email === admin.email));

  // A customer with a completed purchase is genuinely a verified buyer.
  const { data: reviewId, error: reviewError } = await customer.client.rpc("submit_review", {
    p_rating: 5, p_title: "Smooth purchase", p_body: "The guitar was exactly as described and collection was easy.",
  });
  assert.ifError(reviewError);
  const { data: rev } = await service.from("reviews").select("is_verified_buyer").eq("id", reviewId).single();
  assert.equal(rev.is_verified_buyer, true);
});

test("declining an approved request releases the guitar", async () => {
  const customer = await makeUser();
  const admin = await makeUser({ admin: true });
  const product = await makeProduct();
  const { data } = await customer.client.rpc("submit_purchase_request", { ...contact, p_product_ids: [product.id] });
  await admin.client.rpc("admin_set_purchase_status", { p_request_id: data[0].id, p_status: "approved", p_customer_message: "", p_admin_note: "" });
  assert.equal(await productStatus(product.id), "reserved");
  await customer.client.rpc("cancel_purchase_request", { p_request_id: data[0].id });
  assert.equal(await productStatus(product.id), "published");
});

test("reservations require approval and cannot conflict", async () => {
  const a = await makeUser();
  const b = await makeUser();
  const admin = await makeUser({ admin: true });
  const product = await makeProduct();

  const ra = await a.client.rpc("request_reservation", { ...contact, p_product_id: product.id });
  const rb = await b.client.rpc("request_reservation", { ...contact, p_product_id: product.id });
  assert.ifError(ra.error);
  assert.ifError(rb.error);
  assert.equal(await productStatus(product.id), "published", "requests alone don't reserve");

  const ok = await admin.client.rpc("admin_set_reservation_status", { p_reservation_id: ra.data[0].id, p_status: "approved", p_customer_message: "", p_hold_days: 2 });
  assert.ifError(ok.error);
  assert.equal(await productStatus(product.id), "reserved");

  const conflict = await admin.client.rpc("admin_set_reservation_status", { p_reservation_id: rb.data[0].id, p_status: "approved", p_customer_message: "", p_hold_days: 2 });
  assert.ok(conflict.error, "second approval must fail");

  // Customer A may now request to buy their reserved guitar; B may not.
  const buyA = await a.client.rpc("submit_purchase_request", { ...contact, p_product_ids: [product.id] });
  assert.ifError(buyA.error);
  const buyB = await b.client.rpc("submit_purchase_request", { ...contact, p_product_ids: [product.id] });
  assert.match(buyB.error?.message ?? "", /PRODUCT_UNAVAILABLE/);

  // Expiry releases the guitar (simulate an elapsed hold period).
  await a.client.rpc("cancel_purchase_request", { p_request_id: buyA.data[0].id });
  await service.from("reservations").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", ra.data[0].id);
  const { data: expired } = await admin.client.rpc("expire_reservations");
  assert.ok(expired >= 1);
  assert.equal(await productStatus(product.id), "published");
});

test("seller submissions: own photos only, offers and responses", async () => {
  const seller = await makeUser();
  const stranger = await makeUser();
  const admin = await makeUser({ admin: true });
  const { data: cat } = await service.from("categories").select("id").eq("slug", "bass").single();
  const base = {
    p_seller_name: "Seller", p_contact_number: "082 111 2222", p_email: "", p_brand: "Ibanez", p_model: "SR300", p_category_id: cat.id,
    p_condition: "good", p_is_working: "partially", p_fault_description: "Crackly pot", p_asking_price: 2500, p_notes: "",
    p_privacy_acknowledged: true, p_not_loose_parts: true,
  };

  const theft = await seller.client.rpc("submit_seller_submission", { ...base, p_image_paths: [`${stranger.id}/photo.webp`] });
  assert.match(theft.error?.message ?? "", /INVALID_IMAGE_PATH/);
  const parts = await seller.client.rpc("submit_seller_submission", { ...base, p_not_loose_parts: false, p_image_paths: [] });
  assert.match(parts.error?.message ?? "", /LOOSE_PARTS_NOT_ACCEPTED/);

  const { data, error } = await seller.client.rpc("submit_seller_submission", { ...base, p_image_paths: [`${seller.id}/photo.webp`] });
  assert.ifError(error);
  const sub = data[0];

  const { data: seen } = await stranger.client.from("seller_submissions").select("id").eq("id", sub.id);
  assert.equal(seen.length, 0);

  const offer = await admin.client.rpc("admin_make_offer", { p_submission_id: sub.id, p_amount: 1800, p_message: "Happy to collect" });
  assert.ifError(offer.error);
  const { data: offers } = await seller.client.from("seller_offers").select("id, status, amount").eq("submission_id", sub.id);
  assert.equal(offers.length, 1);
  assert.equal(Number(offers[0].amount), 1800);

  const cannot = await stranger.client.rpc("respond_seller_offer", { p_offer_id: offers[0].id, p_accept: true });
  assert.match(cannot.error?.message ?? "", /NOT_FOUND/);
  const accept = await seller.client.rpc("respond_seller_offer", { p_offer_id: offers[0].id, p_accept: true });
  assert.ifError(accept.error);
  const { data: s } = await service.from("seller_submissions").select("status").eq("id", sub.id).single();
  assert.equal(s.status, "offer_accepted");
});

test("repairs: quote, customer response, no work before approval", async () => {
  const customer = await makeUser();
  const admin = await makeUser({ admin: true });
  const { data, error } = await customer.client.rpc("submit_repair_booking", {
    p_contact_name: "Repair Customer", p_contact_phone: "082 333 4444", p_contact_email: "", p_preferred_contact: "whatsapp",
    p_guitar_brand: "Yamaha", p_guitar_model: "F310", p_category_id: null, p_services: ["setup", "strings"],
    p_problem_description: "High action and dead strings", p_preferred_date: null, p_notes: "", p_image_paths: [],
  });
  assert.ifError(error);
  const id = data[0].id;

  const early = await admin.client.rpc("admin_set_repair_status", { p_booking_id: id, p_status: "in_progress", p_customer_message: "" });
  assert.match(early.error?.message ?? "", /INVALID_TRANSITION/);

  assert.ifError((await admin.client.rpc("admin_provide_repair_quote", { p_booking_id: id, p_amount: 450, p_message: "Setup + strings" })).error);
  assert.ifError((await customer.client.rpc("respond_repair_quote", { p_booking_id: id, p_accept: true })).error);
  const { data: b } = await customer.client.from("repair_bookings").select("status, customer_quote_response").eq("id", id).single();
  assert.equal(b.status, "quote_provided", "customer acceptance alone doesn't confirm the booking");
  assert.equal(b.customer_quote_response, "accepted");

  assert.ifError((await admin.client.rpc("admin_set_repair_status", { p_booking_id: id, p_status: "approved", p_customer_message: "See you Tuesday" })).error);
  assert.ifError((await admin.client.rpc("admin_set_repair_status", { p_booking_id: id, p_status: "in_progress", p_customer_message: "" })).error);
});

test("reviews are moderated and verified-buyer is never self-assigned", async () => {
  const reviewer = await makeUser({ name: "Thandi Mokoena" });
  const admin = await makeUser({ admin: true });
  const { data: id, error } = await reviewer.client.rpc("submit_review", { p_rating: 5, p_title: "Great service", p_body: "Friendly, honest and helpful from start to finish." });
  assert.ifError(error);

  const { data: pub1 } = await anon().from("reviews").select("id").eq("id", id);
  assert.equal(pub1.length, 0, "pending reviews are not public");

  const forge = await reviewer.client.from("reviews").update({ is_verified_buyer: true, status: "approved" }).eq("id", id);
  const { data: check } = await service.from("reviews").select("status, is_verified_buyer, reviewer_name").eq("id", id).single();
  assert.ok(forge.error || (check.status === "pending" && !check.is_verified_buyer));
  assert.equal(check.reviewer_name, "Thandi M.");

  assert.ifError((await admin.client.rpc("admin_moderate_review", { p_review_id: id, p_status: "approved" })).error);
  const { data: pub2 } = await anon().from("reviews").select("id, is_verified_buyer").eq("id", id);
  assert.equal(pub2.length, 1);
  assert.equal(pub2[0].is_verified_buyer, false);

  const spam = await reviewer.client.rpc("submit_review", { p_rating: 5, p_title: "Buy now", p_body: "Visit https://spam.example and https://spam2.example now!!" });
  assert.match(spam.error?.message ?? "", /REVIEW_LOOKS_LIKE_SPAM/);

  // Anyone can report a published review.
  assert.ifError((await anon().rpc("report_review", { p_review_id: id, p_reason: "Testing the report feature" })).error);
});

test("storage: private uploads are isolated per customer; product images are admin-only", async () => {
  const a = await makeUser();
  const b = await makeUser();
  const blob = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: "image/webp" });

  const own = await a.client.storage.from("customer-uploads").upload(`${a.id}/t.webp`, blob, { contentType: "image/webp" });
  assert.ifError(own.error);
  const other = await a.client.storage.from("customer-uploads").upload(`${b.id}/t.webp`, blob, { contentType: "image/webp" });
  assert.ok(other.error, "cannot upload into another customer's folder");
  const product = await a.client.storage.from("product-images").upload(`x/t.webp`, blob, { contentType: "image/webp" });
  assert.ok(product.error, "customers cannot upload product images");
  const exe = await a.client.storage.from("customer-uploads").upload(`${a.id}/evil.html`, new Blob(["<script>"], { type: "text/html" }), { contentType: "text/html" });
  assert.ok(exe.error, "non-image uploads are rejected");

  const peek = await b.client.storage.from("customer-uploads").download(`${a.id}/t.webp`);
  assert.ok(peek.error, "other customers cannot read private uploads");
  const anonPeek = await anon().storage.from("customer-uploads").download(`${a.id}/t.webp`);
  assert.ok(anonPeek.error, "anonymous users cannot read private uploads");
  await service.storage.from("customer-uploads").remove([`${a.id}/t.webp`]);
});

test("rate limiting blocks bursts of purchase requests", async () => {
  const c = await makeUser();
  let limited = false;
  for (let i = 0; i < 7; i++) {
    const p = await makeProduct();
    const { error } = await c.client.rpc("submit_purchase_request", { ...contact, p_product_ids: [p.id] });
    if (error?.message === "RATE_LIMITED") {
      limited = true;
      break;
    }
  }
  assert.ok(limited, "expected RATE_LIMITED after 5 requests in an hour");
});

test("guest enquiries are accepted; POPIA anonymisation keeps business records", async () => {
  const guest = anon();
  const { error } = await guest.rpc("submit_enquiry", { p_name: "Guest", p_email: "guest@example.com", p_phone: "", p_subject: "Question", p_message: "Do you buy 12-string guitars?", p_product_id: null });
  assert.ifError(error);

  const c = await makeUser({ name: "Leaving Customer" });
  const admin = await makeUser({ admin: true });
  const product = await makeProduct();
  const { data } = await c.client.rpc("submit_purchase_request", { ...contact, p_product_ids: [product.id] });
  assert.ifError((await c.client.rpc("request_data_action", { p_type: "deletion", p_reason: "test" })).error);
  assert.ifError((await admin.client.rpc("admin_anonymise_user", { p_user_id: c.id })).error);
  const { data: req } = await service.from("purchase_requests").select("contact_name, contact_email, user_id").eq("id", data[0].id).single();
  assert.equal(req.contact_name, "Deleted customer");
  assert.equal(req.user_id, c.id, "business record retained");
  const { data: prof } = await service.from("profiles").select("full_name, email, is_anonymised").eq("id", c.id).single();
  assert.deepEqual(prof, { full_name: null, email: null, is_anonymised: true });
});
