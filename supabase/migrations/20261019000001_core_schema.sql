-- =============================================================================
-- Guitarz4U core schema
-- Tables, enums, constraints and indexes.
-- Row level security, functions and triggers are in the following migrations.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('customer', 'admin');

create type public.contact_method as enum ('whatsapp', 'email', 'phone');

create type public.product_status as enum ('draft', 'published', 'reserved', 'sold', 'archived');

create type public.product_condition as enum ('mint', 'excellent', 'very_good', 'good', 'fair', 'project');

create type public.functional_status as enum ('fully_working', 'minor_issues', 'needs_repair', 'not_working');

create type public.purchase_status as enum (
  'submitted',            -- Request submitted
  'under_review',         -- Under review
  'awaiting_customer',    -- Awaiting customer response
  'approved',             -- Purchase approved
  'awaiting_eft',         -- Awaiting private EFT payment
  'payment_confirmed',    -- Payment confirmed by administrator
  'ready_for_collection', -- Ready for collection
  'completed',            -- Completed
  'declined',             -- Declined
  'cancelled'             -- Cancelled
);

create type public.reservation_status as enum ('requested', 'approved', 'declined', 'cancelled', 'expired', 'fulfilled');

create type public.seller_status as enum (
  'submitted', 'under_review', 'more_info_requested', 'offer_made',
  'offer_accepted', 'offer_declined', 'approved', 'rejected', 'completed', 'withdrawn'
);

create type public.offer_status as enum ('pending', 'accepted', 'declined', 'withdrawn');

create type public.working_state as enum ('yes', 'partially', 'no', 'unsure');

create type public.repair_status as enum (
  'submitted', 'awaiting_review', 'awaiting_info', 'quote_provided', 'approved',
  'in_progress', 'awaiting_collection', 'completed', 'cancelled'
);

create type public.review_status as enum ('pending', 'approved', 'rejected', 'removed');

create type public.enquiry_status as enum ('new', 'in_progress', 'closed');

create type public.data_request_type as enum ('export', 'deletion');

create type public.data_request_status as enum ('pending', 'completed', 'rejected');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Human-friendly reference numbers, e.g. G4U-PR-00042
create sequence public.ref_purchase_seq;
create sequence public.ref_reservation_seq;
create sequence public.ref_seller_seq;
create sequence public.ref_repair_seq;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 30),
  preferred_contact public.contact_method not null default 'whatsapp',
  role public.user_role not null default 'customer',
  is_anonymised boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table public.categories (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  sort_order smallint not null default 0
);

create table public.brands (
  id integer generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  created_at timestamptz not null default now()
);
create unique index brands_name_lower_idx on public.brands (lower(name));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$' and char_length(slug) <= 120),
  title text not null check (char_length(title) between 3 and 140),
  brand_id integer references public.brands (id) on delete set null,
  model text check (char_length(model) <= 100),
  category_id smallint not null references public.categories (id),
  price numeric(12, 2) not null check (price >= 0 and price < 10000000),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price > 0),
  condition public.product_condition not null,
  functional_status public.functional_status not null default 'fully_working',
  description text not null default '' check (char_length(description) <= 8000),
  defects text not null default '' check (char_length(defects) <= 4000),
  history text not null default '' check (char_length(history) <= 4000),
  specifications text not null default '' check (char_length(specifications) <= 4000),
  included_items text not null default '' check (char_length(included_items) <= 1000),
  year_made text check (char_length(year_made) <= 20),
  colour text check (char_length(colour) <= 60),
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  is_demo boolean not null default false,
  published_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_status_idx on public.products (status, created_at desc);
create index products_category_idx on public.products (category_id);
create index products_brand_idx on public.products (brand_id);
create index products_featured_idx on public.products (is_featured) where is_featured;
create index products_price_idx on public.products (price);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Restricted product data (serial numbers, internal notes): administrators only.
create table public.product_private (
  product_id uuid primary key references public.products (id) on delete cascade,
  serial_number text check (char_length(serial_number) <= 80),
  acquisition_notes text check (char_length(acquisition_notes) <= 4000),
  internal_notes text check (char_length(internal_notes) <= 4000),
  updated_at timestamptz not null default now()
);
create trigger product_private_updated_at before update on public.product_private
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) <= 400),
  alt_text text check (char_length(alt_text) <= 200),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.wishlists (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index wishlists_product_idx on public.wishlists (product_id);

-- Availability alerts: a specific (currently unavailable) product, or new
-- arrivals matching a category and/or brand.
create table public.availability_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  category_id smallint references public.categories (id) on delete cascade,
  brand_id integer references public.brands (id) on delete cascade,
  is_active boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint alert_has_target check (product_id is not null or category_id is not null or brand_id is not null)
);
create index availability_alerts_user_idx on public.availability_alerts (user_id);
create unique index availability_alerts_product_unique on public.availability_alerts (user_id, product_id)
  where product_id is not null and is_active;

-- ---------------------------------------------------------------------------
-- Purchase requests (NOT orders or payments: the owner arranges EFT privately)
-- ---------------------------------------------------------------------------
create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('G4U-PR-' || lpad(nextval('public.ref_purchase_seq')::text, 5, '0')),
  user_id uuid references public.profiles (id) on delete set null,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text check (char_length(contact_email) <= 200),
  contact_phone text check (char_length(contact_phone) <= 30),
  preferred_contact public.contact_method not null default 'whatsapp',
  customer_message text not null default '' check (char_length(customer_message) <= 2000),
  status public.purchase_status not null default 'submitted',
  estimated_total numeric(12, 2) not null default 0,
  eft_instructions_sent_at timestamptz,
  payment_confirmed_at timestamptz,
  payment_confirmed_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pr_contact_present check (contact_email is not null or contact_phone is not null)
);
create index purchase_requests_user_idx on public.purchase_requests (user_id, created_at desc);
create index purchase_requests_status_idx on public.purchase_requests (status, created_at desc);
create trigger purchase_requests_updated_at before update on public.purchase_requests
  for each row execute function public.set_updated_at();

create table public.purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  title_snapshot text not null,
  price_snapshot numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  unique (request_id, product_id)
);
create index purchase_request_items_product_idx on public.purchase_request_items (product_id);

-- ---------------------------------------------------------------------------
-- Reservations (require owner approval)
-- ---------------------------------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('G4U-RS-' || lpad(nextval('public.ref_reservation_seq')::text, 5, '0')),
  user_id uuid references public.profiles (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  product_title_snapshot text not null,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text check (char_length(contact_email) <= 200),
  contact_phone text check (char_length(contact_phone) <= 30),
  preferred_contact public.contact_method not null default 'whatsapp',
  customer_message text not null default '' check (char_length(customer_message) <= 2000),
  status public.reservation_status not null default 'requested',
  approved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reservations_user_idx on public.reservations (user_id, created_at desc);
create index reservations_status_idx on public.reservations (status, created_at desc);
-- Only one approved (active) reservation per product.
create unique index reservations_one_active_per_product on public.reservations (product_id)
  where status = 'approved';
-- A customer cannot have two open requests for the same product.
create unique index reservations_one_open_per_user_product on public.reservations (user_id, product_id)
  where status in ('requested', 'approved');
create trigger reservations_updated_at before update on public.reservations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seller submissions ("Sell your guitar to Guitarz4U")
-- ---------------------------------------------------------------------------
create table public.seller_submissions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('G4U-SL-' || lpad(nextval('public.ref_seller_seq')::text, 5, '0')),
  user_id uuid references public.profiles (id) on delete set null,
  seller_name text not null check (char_length(seller_name) between 2 and 120),
  contact_number text not null check (char_length(contact_number) between 6 and 30),
  email text check (char_length(email) <= 200),
  brand text not null check (char_length(brand) between 1 and 60),
  model text not null check (char_length(model) between 1 and 100),
  category_id smallint not null references public.categories (id),
  condition public.product_condition not null,
  is_working public.working_state not null,
  fault_description text not null default '' check (char_length(fault_description) <= 3000),
  asking_price numeric(12, 2) check (asking_price is null or asking_price >= 0),
  notes text not null default '' check (char_length(notes) <= 3000),
  privacy_acknowledged boolean not null check (privacy_acknowledged),
  not_loose_parts_confirmed boolean not null check (not_loose_parts_confirmed),
  status public.seller_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index seller_submissions_user_idx on public.seller_submissions (user_id, created_at desc);
create index seller_submissions_status_idx on public.seller_submissions (status, created_at desc);
create trigger seller_submissions_updated_at before update on public.seller_submissions
  for each row execute function public.set_updated_at();

create table public.seller_submission_images (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.seller_submissions (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) <= 400),
  created_at timestamptz not null default now()
);
create index seller_submission_images_sub_idx on public.seller_submission_images (submission_id);

create table public.seller_offers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.seller_submissions (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  message text not null default '' check (char_length(message) <= 2000),
  status public.offer_status not null default 'pending',
  created_by uuid references public.profiles (id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index seller_offers_sub_idx on public.seller_offers (submission_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Repair bookings
-- ---------------------------------------------------------------------------
create table public.repair_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('G4U-RP-' || lpad(nextval('public.ref_repair_seq')::text, 5, '0')),
  user_id uuid references public.profiles (id) on delete set null,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_phone text not null check (char_length(contact_phone) between 6 and 30),
  contact_email text check (char_length(contact_email) <= 200),
  preferred_contact public.contact_method not null default 'whatsapp',
  guitar_brand text not null check (char_length(guitar_brand) between 1 and 60),
  guitar_model text not null default '' check (char_length(guitar_model) <= 100),
  category_id smallint references public.categories (id),
  services text[] not null default '{}' check (
    services <@ array['strings','setup','electronics','body','hardware','fretwork','other']::text[]
    and cardinality(services) between 1 and 7
  ),
  problem_description text not null check (char_length(problem_description) between 10 and 3000),
  preferred_date date,
  notes text not null default '' check (char_length(notes) <= 2000),
  status public.repair_status not null default 'submitted',
  quote_amount numeric(12, 2) check (quote_amount is null or quote_amount >= 0),
  quote_message text check (char_length(quote_message) <= 2000),
  quote_provided_at timestamptz,
  customer_quote_response text check (customer_quote_response in ('accepted', 'declined')),
  customer_quote_response_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index repair_bookings_user_idx on public.repair_bookings (user_id, created_at desc);
create index repair_bookings_status_idx on public.repair_bookings (status, created_at desc);
create trigger repair_bookings_updated_at before update on public.repair_bookings
  for each row execute function public.set_updated_at();

create table public.repair_images (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.repair_bookings (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) <= 400),
  created_at timestamptz not null default now()
);
create index repair_images_booking_idx on public.repair_images (booking_id);

-- ---------------------------------------------------------------------------
-- Customer-visible status history (one table for every workflow)
-- ---------------------------------------------------------------------------
create table public.status_updates (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('purchase_request', 'reservation', 'seller_submission', 'repair_booking')),
  entity_id uuid not null,
  status text not null,
  message text check (char_length(message) <= 2000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index status_updates_entity_idx on public.status_updates (entity_type, entity_id, created_at);

-- Private administrator notes (never visible to customers)
create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('purchase_request', 'reservation', 'seller_submission', 'repair_booking', 'enquiry', 'customer', 'product')),
  entity_id uuid not null,
  note text not null check (char_length(note) between 1 and 4000),
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index admin_notes_entity_idx on public.admin_notes (entity_type, entity_id, created_at);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 80),
  rating smallint not null check (rating between 1 and 5),
  title text not null check (char_length(title) between 3 and 100),
  body text not null check (char_length(body) between 20 and 2000),
  status public.review_status not null default 'pending',
  is_verified_buyer boolean not null default false,
  moderated_at timestamptz,
  moderated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_status_idx on public.reviews (status, created_at desc);
create index reviews_user_idx on public.reviews (user_id);
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(reason) between 5 and 1000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index review_reports_open_idx on public.review_reports (resolved, created_at desc);

-- ---------------------------------------------------------------------------
-- Enquiries (contact form + product questions)
-- ---------------------------------------------------------------------------
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text check (char_length(email) <= 200),
  phone text check (char_length(phone) <= 30),
  subject text not null check (char_length(subject) between 2 and 150),
  message text not null check (char_length(message) between 5 and 3000),
  status public.enquiry_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enquiry_contact_present check (email is not null or phone is not null)
);
create index enquiries_status_idx on public.enquiries (status, created_at desc);
create trigger enquiries_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Notifications (in-app)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 1000),
  link text check (char_length(link) <= 300),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Site settings / editable content
-- ---------------------------------------------------------------------------
create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_:.-]+$'),
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Privacy requests (POPIA)
-- ---------------------------------------------------------------------------
create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  user_email text,
  request_type public.data_request_type not null,
  status public.data_request_status not null default 'pending',
  reason text check (char_length(reason) <= 1000),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index data_requests_status_idx on public.data_requests (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Privacy-friendly first-party analytics (no IP addresses, no user IDs)
-- ---------------------------------------------------------------------------
create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  product_id uuid references public.products (id) on delete set null,
  path text check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);
create index analytics_events_name_idx on public.analytics_events (event_name, created_at desc);

-- ---------------------------------------------------------------------------
-- Rate limiting buckets
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
