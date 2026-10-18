-- =============================================================================
-- Guitarz4U — core schema
-- Tables, constraints and indexes. Security (RLS), triggers and workflow
-- functions live in the following migrations.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- Internal helpers live in a schema that is NOT exposed through the API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Human-friendly reference numbers (e.g. G4U-PR-1001)
create sequence if not exists public.purchase_request_ref_seq start 1001;
create sequence if not exists public.reservation_ref_seq start 1001;
create sequence if not exists public.seller_submission_ref_seq start 1001;
create sequence if not exists public.repair_booking_ref_seq start 1001;

-- -----------------------------------------------------------------------------
-- Profiles & roles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  phone text check (phone is null or phone ~ '^[0-9 +()-]{9,20}$'),
  preferred_contact text not null default 'whatsapp'
    check (preferred_contact in ('whatsapp', 'email', 'phone')),
  role text not null default 'customer' check (role in ('customer', 'admin')),
  anonymised_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.profiles.role is
  'customer or admin. Can only be changed from the SQL editor (see docs/ADMIN_SETUP.md).';

-- -----------------------------------------------------------------------------
-- Catalogue
-- -----------------------------------------------------------------------------
create table public.categories (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 500),
  kind text not null default 'guitar' check (kind in ('guitar', 'equipment')),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.brands (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 140),
  brand_id bigint references public.brands (id) on delete set null,
  model text check (char_length(model) <= 120),
  category_id bigint not null references public.categories (id) on delete restrict,
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price > price),
  condition text not null check (condition in
    ('mint', 'excellent', 'very_good', 'good', 'fair', 'needs_repair')),
  description text not null default '' check (char_length(description) <= 8000),
  defects text not null default '' check (char_length(defects) <= 4000),
  history text not null default '' check (char_length(history) <= 4000),
  year_made text check (char_length(year_made) <= 20),
  quantity int not null default 1 check (quantity >= 0 and quantity <= 999),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'reserved', 'sold', 'archived')),
  featured boolean not null default false,
  is_demo boolean not null default false,
  published_at timestamptz,
  reserved_until timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_status_idx on public.products (status, created_at desc);
create index products_category_idx on public.products (category_id);
create index products_brand_idx on public.products (brand_id);
create index products_featured_idx on public.products (featured) where featured;

-- Admin-only product details (never exposed publicly)
create table public.product_private (
  product_id uuid primary key references public.products (id) on delete cascade,
  serial_number text check (char_length(serial_number) <= 120),
  acquisition_cost numeric(10, 2) check (acquisition_cost is null or acquisition_cost >= 0),
  acquired_from text check (char_length(acquired_from) <= 500),
  internal_notes text check (char_length(internal_notes) <= 4000),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  thumb_path text,
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  sort_order int not null default 0,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.wishlists (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.availability_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- -----------------------------------------------------------------------------
-- Purchase requests (enquiries — NOT payments)
-- -----------------------------------------------------------------------------
create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('G4U-PR-' || nextval('public.purchase_request_ref_seq')),
  user_id uuid references auth.users (id) on delete set null,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text check (char_length(contact_email) <= 200),
  contact_phone text check (contact_phone is null or contact_phone ~ '^[0-9 +()-]{9,20}$'),
  preferred_contact text not null default 'whatsapp'
    check (preferred_contact in ('whatsapp', 'email', 'phone')),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'submitted' check (status in
    ('submitted', 'reviewing', 'accepted', 'awaiting_payment', 'completed', 'declined', 'cancelled')),
  customer_message text check (char_length(customer_message) <= 2000),
  total_estimate numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchase_requests_user_idx on public.purchase_requests (user_id, created_at desc);
create index purchase_requests_status_idx on public.purchase_requests (status, created_at desc);

create table public.purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  title_snapshot text not null,
  price_snapshot numeric(10, 2) not null,
  quantity int not null default 1 check (quantity between 1 and 99)
);
create index purchase_request_items_request_idx on public.purchase_request_items (request_id);
create index purchase_request_items_product_idx on public.purchase_request_items (product_id);

-- -----------------------------------------------------------------------------
-- Reservations (require manual approval)
-- -----------------------------------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('G4U-RS-' || nextval('public.reservation_ref_seq')),
  user_id uuid references auth.users (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  product_title_snapshot text not null,
  price_snapshot numeric(10, 2) not null,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text check (char_length(contact_email) <= 200),
  contact_phone text check (contact_phone is null or contact_phone ~ '^[0-9 +()-]{9,20}$'),
  preferred_contact text not null default 'whatsapp'
    check (preferred_contact in ('whatsapp', 'email', 'phone')),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'requested' check (status in
    ('requested', 'approved', 'declined', 'cancelled', 'expired', 'converted')),
  expires_at timestamptz,
  decided_at timestamptz,
  customer_message text check (char_length(customer_message) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Only ONE approved reservation per product at any time.
create unique index reservations_one_approved_per_product
  on public.reservations (product_id) where status = 'approved';
-- A customer can only have one open request per product.
create unique index reservations_one_open_request_per_user
  on public.reservations (user_id, product_id) where status = 'requested';
create index reservations_status_idx on public.reservations (status, created_at desc);

-- -----------------------------------------------------------------------------
-- Seller submissions & offers
-- -----------------------------------------------------------------------------
create table public.seller_submissions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('G4U-SL-' || nextval('public.seller_submission_ref_seq')),
  user_id uuid references auth.users (id) on delete set null,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text check (char_length(contact_email) <= 200),
  contact_phone text check (contact_phone is null or contact_phone ~ '^[0-9 +()-]{9,20}$'),
  preferred_contact text not null default 'whatsapp'
    check (preferred_contact in ('whatsapp', 'email', 'phone')),
  location text check (char_length(location) <= 120),
  brand text not null check (char_length(brand) between 1 and 80),
  model text not null check (char_length(model) between 1 and 120),
  category_id bigint references public.categories (id) on delete set null,
  condition text not null check (condition in
    ('mint', 'excellent', 'very_good', 'good', 'fair', 'needs_repair')),
  is_working boolean not null,
  defects text not null default '' check (char_length(defects) <= 4000),
  asking_price numeric(10, 2) check (asking_price is null or asking_price >= 0),
  notes text not null default '' check (char_length(notes) <= 4000),
  privacy_consent boolean not null check (privacy_consent),
  consent_at timestamptz not null default now(),
  status text not null default 'submitted' check (status in
    ('submitted', 'under_review', 'more_info_requested', 'approved', 'offer_made',
     'offer_accepted', 'offer_declined', 'rejected', 'purchased', 'withdrawn')),
  customer_message text check (char_length(customer_message) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index seller_submissions_user_idx on public.seller_submissions (user_id, created_at desc);
create index seller_submissions_status_idx on public.seller_submissions (status, created_at desc);

create table public.seller_submission_images (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.seller_submissions (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index seller_submission_images_idx on public.seller_submission_images (submission_id);

create table public.seller_offers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.seller_submissions (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn', 'expired')),
  valid_until timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index seller_offers_submission_idx on public.seller_offers (submission_id, created_at desc);
create unique index seller_offers_one_pending
  on public.seller_offers (submission_id) where status = 'pending';

-- -----------------------------------------------------------------------------
-- Repairs
-- -----------------------------------------------------------------------------
create table public.repair_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('G4U-RP-' || nextval('public.repair_booking_ref_seq')),
  user_id uuid references auth.users (id) on delete set null,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text check (char_length(contact_email) <= 200),
  contact_phone text check (contact_phone is null or contact_phone ~ '^[0-9 +()-]{9,20}$'),
  preferred_contact text not null default 'whatsapp'
    check (preferred_contact in ('whatsapp', 'email', 'phone')),
  guitar_type text not null check (guitar_type in ('electric', 'bass', 'acoustic', 'classical', 'other')),
  brand text not null default '' check (char_length(brand) <= 80),
  model text not null default '' check (char_length(model) <= 120),
  problem_description text not null check (char_length(problem_description) between 10 and 4000),
  requested_services text[] not null default '{}',
  preferred_date date,
  notes text not null default '' check (char_length(notes) <= 4000),
  status text not null default 'submitted' check (status in
    ('submitted', 'awaiting_review', 'awaiting_customer', 'quote_provided', 'approved',
     'in_progress', 'awaiting_collection', 'completed', 'cancelled', 'declined')),
  quote_amount numeric(10, 2) check (quote_amount is null or quote_amount >= 0),
  quote_message text check (char_length(quote_message) <= 2000),
  quote_status text not null default 'none'
    check (quote_status in ('none', 'pending', 'accepted', 'declined')),
  appointment_at timestamptz,
  customer_message text check (char_length(customer_message) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repair_services_valid check (requested_services <@ array[
    'strings', 'setup', 'electronics', 'body', 'hardware', 'fretwork', 'other']::text[])
);
create index repair_bookings_user_idx on public.repair_bookings (user_id, created_at desc);
create index repair_bookings_status_idx on public.repair_bookings (status, created_at desc);

create table public.repair_images (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references public.repair_bookings (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index repair_images_idx on public.repair_images (repair_id);

-- -----------------------------------------------------------------------------
-- Status history (timeline shown to customers and admin)
-- -----------------------------------------------------------------------------
create table public.status_events (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in
    ('purchase_request', 'reservation', 'seller_submission', 'repair_booking')),
  entity_id uuid not null,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index status_events_entity_idx on public.status_events (entity_type, entity_id, created_at);

-- -----------------------------------------------------------------------------
-- Reviews
-- -----------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null check (char_length(display_name) between 2 and 60),
  rating int not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 120),
  body text not null check (char_length(body) between 20 and 2000),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'removed')),
  verified_purchase boolean not null default false,
  rejection_reason text check (char_length(rejection_reason) <= 500),
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_status_idx on public.reviews (status, created_at desc);
create index reviews_user_idx on public.reviews (user_id);

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 5 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);

-- -----------------------------------------------------------------------------
-- Notifications (in-app; email status tracked honestly)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('user', 'admin')),
  user_id uuid references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  email_status text not null default 'not_applicable'
    check (email_status in ('not_applicable', 'pending', 'sent', 'failed', 'not_configured')),
  email_error text,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_target check (
    (audience = 'user' and user_id is not null) or (audience = 'admin' and user_id is null))
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_admin_idx on public.notifications (audience, created_at desc);
create index notifications_email_pending_idx on public.notifications (email_status)
  where email_status = 'pending';

-- -----------------------------------------------------------------------------
-- Contact messages, data requests, admin notes
-- -----------------------------------------------------------------------------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text check (char_length(email) <= 200),
  phone text check (phone is null or phone ~ '^[0-9 +()-]{9,20}$'),
  subject text not null default '' check (char_length(subject) <= 150),
  message text not null check (char_length(message) between 10 and 4000),
  status text not null default 'new' check (status in ('new', 'replied', 'closed')),
  created_at timestamptz not null default now()
);

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  request_type text not null check (request_type in ('export', 'deletion')),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'rejected')),
  reason text check (char_length(reason) <= 1000),
  admin_response text check (char_length(admin_response) <= 2000),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  note text not null check (char_length(note) between 1 and 4000),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index admin_notes_entity_idx on public.admin_notes (entity_type, entity_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Settings, audit log, analytics
-- -----------------------------------------------------------------------------
create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  table_name text not null,
  record_id text,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_table_idx on public.audit_logs (table_name, record_id);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in
    ('page_view', 'product_view', 'purchase_request', 'reservation_request',
     'seller_submission', 'repair_booking', 'wishlist_add', 'whatsapp_click', 'share')),
  product_id uuid references public.products (id) on delete set null,
  path text check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);
create index analytics_events_type_idx on public.analytics_events (event_type, created_at desc);
create index analytics_events_product_idx on public.analytics_events (product_id) where product_id is not null;
