-- Guitarz4U business schema.
-- Money is stored as whole cents (ZAR) in integer columns to avoid rounding errors.
-- Statuses use CHECK constraints so the database rejects invalid values.

create extension if not exists pgcrypto;

alter table "user" add column if not exists "deletedAt" timestamptz;

-- Shared trigger to keep updated_at current.
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────────────────── Customers ─────────────────────────
create table customer_profiles (
  user_id text primary key references "user"(id) on delete cascade,
  phone text check (char_length(phone) <= 30),
  preferred_contact text not null default 'whatsapp' check (preferred_contact in ('whatsapp', 'email', 'phone')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger customer_profiles_updated before update on customer_profiles for each row execute function set_updated_at();

-- ───────────────────────── Catalogue ─────────────────────────
create table categories (
  id serial primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique,
  description text not null default '',
  sort_order integer not null default 0
);

insert into categories (slug, name, description, sort_order) values
  ('electric-guitars', 'Electric guitars', 'Solid-body, semi-hollow and hollow-body electric guitars.', 1),
  ('bass-guitars', 'Bass guitars', 'Four, five and six-string electric and acoustic basses.', 2),
  ('acoustic-guitars', 'Acoustic guitars', 'Steel-string acoustic and electro-acoustic guitars.', 3),
  ('classical-guitars', 'Classical guitars', 'Nylon-string classical and flamenco guitars.', 4);

create table brands (
  id serial primary key,
  name text not null unique check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 3 and 140),
  brand_id integer references brands(id) on delete restrict,
  model text not null default '' check (char_length(model) <= 120),
  category_id integer not null references categories(id) on delete restrict,
  price_cents integer not null check (price_cents >= 0 and price_cents <= 100000000),
  -- Optional "was" price for special offers. Must be higher than the current price.
  compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents > price_cents),
  condition text not null check (condition in ('excellent', 'very_good', 'good', 'fair', 'poor', 'for_repair')),
  description text not null default '' check (char_length(description) <= 8000),
  defects text not null default '' check (char_length(defects) <= 4000),
  history text not null default '' check (char_length(history) <= 4000),
  -- Restricted: only ever shown in the admin dashboard.
  serial_number text check (char_length(serial_number) <= 80),
  status text not null default 'draft' check (status in ('draft', 'published', 'reserved', 'sold', 'archived')),
  featured boolean not null default false,
  is_demo boolean not null default false,
  published_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sold_has_date check (status <> 'sold' or sold_at is not null)
);
create index products_status_idx on products (status);
create index products_category_idx on products (category_id);
create index products_brand_idx on products (brand_id);
create index products_created_idx on products (created_at desc);
create index products_search_idx on products using gin (to_tsvector('english', title || ' ' || model || ' ' || description));
create trigger products_updated before update on products for each row execute function set_updated_at();

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_key text not null,
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on product_images (product_id, sort_order);

create table wishlists (
  user_id text not null references "user"(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table availability_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id text references "user"(id) on delete set null,
  email text not null check (char_length(email) <= 200),
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (product_id, email)
);

-- ───────────────────────── Purchase requests ─────────────────────────
-- A purchase request is NOT a sale and NOT a payment. Payment is arranged
-- privately by EFT; only an administrator can record that funds were received.
create table purchase_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id text references "user"(id) on delete set null,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text not null check (char_length(contact_email) <= 200),
  contact_phone text not null default '' check (char_length(contact_phone) <= 30),
  preferred_contact text not null check (preferred_contact in ('whatsapp', 'email', 'phone')),
  message text not null default '' check (char_length(message) <= 2000),
  estimated_total_cents integer not null check (estimated_total_cents >= 0),
  agreed_total_cents integer check (agreed_total_cents >= 0),
  status text not null default 'submitted' check (status in (
    'submitted', 'under_review', 'awaiting_customer', 'approved', 'awaiting_eft',
    'payment_confirmed', 'ready_for_collection', 'completed', 'declined', 'cancelled')),
  customer_update text not null default '' check (char_length(customer_update) <= 2000),
  admin_notes text not null default '' check (char_length(admin_notes) <= 8000),
  eft_instructions_sent_at timestamptz,
  eft_instructions_sent_by text references "user"(id) on delete set null,
  payment_confirmed_at timestamptz,
  payment_confirmed_by text references "user"(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Database-level guarantee: these statuses can only exist after an admin
  -- has manually recorded that the EFT was received.
  constraint purchase_requests_payment_guard check (
    status not in ('payment_confirmed', 'ready_for_collection', 'completed')
    or (payment_confirmed_at is not null and payment_confirmed_by is not null))
);
create index purchase_requests_user_idx on purchase_requests (user_id, created_at desc);
create index purchase_requests_status_idx on purchase_requests (status, created_at desc);
create trigger purchase_requests_updated before update on purchase_requests for each row execute function set_updated_at();

create table purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references purchase_requests(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  title_snapshot text not null,
  price_cents_snapshot integer not null check (price_cents_snapshot >= 0),
  unique (purchase_request_id, product_id)
);
create index purchase_request_items_product_idx on purchase_request_items (product_id);

-- ───────────────────────── Reservations ─────────────────────────
create table reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  product_id uuid not null references products(id) on delete restrict,
  user_id text references "user"(id) on delete set null,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text not null check (char_length(contact_email) <= 200),
  contact_phone text not null default '' check (char_length(contact_phone) <= 30),
  preferred_contact text not null check (preferred_contact in ('whatsapp', 'email', 'phone')),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'requested' check (status in ('requested', 'approved', 'declined', 'cancelled', 'expired', 'converted')),
  expires_at timestamptz,
  customer_update text not null default '' check (char_length(customer_update) <= 2000),
  admin_notes text not null default '' check (char_length(admin_notes) <= 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_approved_has_expiry check (status <> 'approved' or expires_at is not null)
);
-- Only one approved reservation per product at any time.
create unique index reservations_one_approved_per_product on reservations (product_id) where status = 'approved';
create index reservations_user_idx on reservations (user_id, created_at desc);
create index reservations_status_idx on reservations (status, created_at desc);
create trigger reservations_updated before update on reservations for each row execute function set_updated_at();

-- ───────────────────────── Seller submissions ─────────────────────────
create table seller_submissions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id text references "user"(id) on delete set null,
  seller_name text not null check (char_length(seller_name) between 2 and 120),
  contact_phone text not null check (char_length(contact_phone) between 6 and 30),
  email text not null default '' check (char_length(email) <= 200),
  brand text not null check (char_length(brand) between 1 and 80),
  model text not null default '' check (char_length(model) <= 120),
  category_id integer not null references categories(id),
  condition text not null check (condition in ('excellent', 'very_good', 'good', 'fair', 'poor', 'for_repair')),
  works text not null check (works in ('yes', 'partly', 'no', 'unsure')),
  faults text not null default '' check (char_length(faults) <= 4000),
  asking_price_cents integer check (asking_price_cents is null or asking_price_cents >= 0),
  notes text not null default '' check (char_length(notes) <= 4000),
  privacy_ack boolean not null check (privacy_ack = true),
  status text not null default 'submitted' check (status in (
    'submitted', 'under_review', 'more_info_requested', 'approved', 'offer_made',
    'offer_accepted', 'offer_declined', 'purchased', 'rejected', 'withdrawn')),
  customer_update text not null default '' check (char_length(customer_update) <= 2000),
  admin_notes text not null default '' check (char_length(admin_notes) <= 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index seller_submissions_user_idx on seller_submissions (user_id, created_at desc);
create index seller_submissions_status_idx on seller_submissions (status, created_at desc);
create trigger seller_submissions_updated before update on seller_submissions for each row execute function set_updated_at();

create table seller_submission_images (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references seller_submissions(id) on delete cascade,
  storage_key text not null,
  created_at timestamptz not null default now()
);
create index seller_submission_images_sub_idx on seller_submission_images (submission_id);

create table seller_offers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references seller_submissions(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_by text references "user"(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index seller_offers_sub_idx on seller_offers (submission_id, created_at desc);
create unique index seller_offers_one_pending on seller_offers (submission_id) where status = 'pending';

-- ───────────────────────── Repairs ─────────────────────────
create table repair_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id text references "user"(id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  contact_phone text not null check (char_length(contact_phone) between 6 and 30),
  email text not null default '' check (char_length(email) <= 200),
  preferred_contact text not null check (preferred_contact in ('whatsapp', 'email', 'phone')),
  guitar_brand text not null check (char_length(guitar_brand) between 1 and 80),
  guitar_model text not null default '' check (char_length(guitar_model) <= 120),
  category_id integer not null references categories(id),
  problem text not null check (char_length(problem) between 10 and 4000),
  services text[] not null default '{}' check (services <@ array['strings', 'setup', 'electronics', 'body', 'hardware', 'fretwork', 'other']::text[]),
  preferred_date date,
  notes text not null default '' check (char_length(notes) <= 4000),
  status text not null default 'submitted' check (status in (
    'submitted', 'awaiting_review', 'awaiting_info', 'quote_provided', 'approved',
    'in_progress', 'awaiting_collection', 'completed', 'cancelled')),
  quote_amount_cents integer check (quote_amount_cents is null or quote_amount_cents >= 0),
  quote_message text not null default '' check (char_length(quote_message) <= 2000),
  quote_provided_at timestamptz,
  quote_response text check (quote_response in ('accepted', 'declined')),
  quote_responded_at timestamptz,
  confirmed_date date,
  customer_update text not null default '' check (char_length(customer_update) <= 2000),
  admin_notes text not null default '' check (char_length(admin_notes) <= 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Work may only be approved or started once a quote exists.
  constraint repair_quote_before_work check (
    status not in ('approved', 'in_progress', 'awaiting_collection', 'completed') or quote_provided_at is not null)
);
create index repair_bookings_user_idx on repair_bookings (user_id, created_at desc);
create index repair_bookings_status_idx on repair_bookings (status, created_at desc);
create trigger repair_bookings_updated before update on repair_bookings for each row execute function set_updated_at();

create table repair_images (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references repair_bookings(id) on delete cascade,
  storage_key text not null,
  created_at timestamptz not null default now()
);
create index repair_images_repair_idx on repair_images (repair_id);

-- ───────────────────────── Status history (customer timeline) ─────────────────────────
create table status_history (
  id bigserial primary key,
  entity_type text not null check (entity_type in ('purchase_request', 'reservation', 'seller_submission', 'repair_booking')),
  entity_id uuid not null,
  status text not null,
  public_note text not null default '',
  actor_id text references "user"(id) on delete set null,
  created_at timestamptz not null default now()
);
create index status_history_entity_idx on status_history (entity_type, entity_id, created_at);

-- ───────────────────────── Reviews ─────────────────────────
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id text references "user"(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 60),
  rating integer not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 120),
  body text not null check (char_length(body) between 10 and 2000),
  -- Set by the server only when the reviewer has a completed purchase on record.
  verified_purchase boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  moderation_note text not null default '',
  moderated_by text references "user"(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);
create index reviews_status_idx on reviews (status, created_at desc);

create table review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  reporter_user_id text references "user"(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 1000),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Contact & enquiries ─────────────────────────
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'contact' check (kind in ('contact', 'product_question')),
  product_id uuid references products(id) on delete set null,
  user_id text references "user"(id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text not null default '' check (char_length(email) <= 200),
  phone text not null default '' check (char_length(phone) <= 30),
  preferred_contact text not null default 'email' check (preferred_contact in ('whatsapp', 'email', 'phone')),
  subject text not null default '' check (char_length(subject) <= 160),
  message text not null check (char_length(message) between 5 and 4000),
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  admin_notes text not null default '',
  created_at timestamptz not null default now()
);
create index contact_messages_status_idx on contact_messages (status, created_at desc);

-- ───────────────────────── Notifications ─────────────────────────
create table notifications (
  id bigserial primary key,
  audience text not null check (audience in ('user', 'admin')),
  user_id text references "user"(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text not null default '',
  read_at timestamptz,
  -- Honest record of email delivery: never "sent" unless SMTP accepted it.
  email_status text not null default 'not_attempted' check (email_status in ('not_attempted', 'not_configured', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  constraint notifications_user_audience check (audience = 'admin' or user_id is not null)
);
create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_admin_idx on notifications (audience, created_at desc);

-- ───────────────────────── Privacy requests (POPIA) ─────────────────────────
create table data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text references "user"(id) on delete set null,
  kind text not null check (kind in ('export', 'deletion')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  details text not null default '' check (char_length(details) <= 2000),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ───────────────────────── Site content & settings ─────────────────────────
create table site_settings (
  key text primary key,
  value jsonb not null,
  updated_by text references "user"(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Audit log (append-only) ─────────────────────────
create table audit_logs (
  id bigserial primary key,
  actor_id text,
  actor_email text,
  action text not null,
  entity_type text not null default '',
  entity_id text not null default '',
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on audit_logs (created_at desc);

create or replace function audit_logs_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'audit_logs is append-only';
end $$;
create trigger audit_logs_no_update before update or delete on audit_logs for each row execute function audit_logs_append_only();

-- ───────────────────────── Analytics (no personal data) ─────────────────────────
create table analytics_events (
  id bigserial primary key,
  event text not null check (event in ('page_view', 'product_view', 'purchase_request', 'reservation_request', 'seller_submission', 'repair_booking', 'whatsapp_click')),
  product_id uuid references products(id) on delete set null,
  path text not null default '' check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);
create index analytics_events_created_idx on analytics_events (created_at desc, event);

-- ───────────────────────── App rate limiting ─────────────────────────
create table app_rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);
