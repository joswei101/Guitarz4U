-- Guitarz4U: complete database setup (generated — do not edit).
-- Paste into Supabase → SQL Editor → New query → Run, ONCE, on a NEW empty project.

-- ===== 20261030000001_core_schema.sql =====
-- =============================================================================
-- Guitarz4U core schema
-- -----------------------------------------------------------------------------
-- Tables, constraints, indexes and helper functions. Row-level security (RLS)
-- policies live in 20261030000002_security.sql; workflow functions (reservations,
-- quotes, status changes) live in 20261030000003_workflows.sql.
--
-- Money is stored as numeric(10,2) in South African rand (ZAR).
-- No table stores card numbers or online-payment data: payments are recorded
-- manually by the owner after independently verifying an EFT or other agreed
-- payment outside the website.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Human-friendly reference numbers (e.g. REP-00012) shown to customers.
-- ---------------------------------------------------------------------------
create sequence public.product_ref_seq;
create sequence public.reservation_ref_seq;
create sequence public.enquiry_ref_seq;
create sequence public.offer_ref_seq;
create sequence public.seller_ref_seq;
create sequence public.repair_ref_seq;

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user. Role and permissions control admin access.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  whatsapp text check (char_length(whatsapp) <= 30),
  preferred_contact text not null default 'email'
    check (preferred_contact in ('email', 'whatsapp', 'phone')),
  role text not null default 'customer'
    check (role in ('customer', 'staff', 'owner')),
  -- Staff permissions. Owners implicitly have every permission.
  permissions text[] not null default '{}',
  is_blocked boolean not null default false,
  notify_email boolean not null default true,
  notify_stock_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_permissions_valid check (
    permissions <@ array[
      'inventory', 'reservations', 'enquiries', 'sellers', 'repairs',
      'payments', 'customers', 'reviews', 'content', 'reports', 'settings', 'audit'
    ]::text[]
  )
);
create index profiles_role_idx on public.profiles (role) where role <> 'customer';
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create a profile automatically whenever someone registers (email or Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 120)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile email in sync if the user changes their login email.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Permission helpers (used by RLS policies and workflow functions).
-- SECURITY DEFINER so they can read profiles regardless of the caller's RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff', 'owner') and not p.is_blocked
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'owner' and not p.is_blocked
  );
$$;

create or replace function public.has_perm(p_perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and not p.is_blocked
      and (p.role = 'owner' or (p.role = 'staff' and p_perm = any (p.permissions)))
  );
$$;

-- ---------------------------------------------------------------------------
-- Business settings (single row, id = 1). Editable by the owner in the admin.
-- ---------------------------------------------------------------------------
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'Guitarz4U',
  contact_email text not null default 'Joshuaweinfas@gmail.com',
  whatsapp_display text not null default '064 856 7019',
  -- International format without "+" for wa.me links.
  whatsapp_international text not null default '27648567019',
  social_handle text not null default 'Shuaweinfas',
  collection_area text not null default 'Sandringham, Johannesburg',
  owner_notification_email text not null default 'Joshuaweinfas@gmail.com',
  reservation_hours integer not null default 48 check (reservation_hours between 1 and 336),
  max_active_reservations_per_customer integer not null default 2
    check (max_active_reservations_per_customer between 1 and 10),
  -- Repair warranty: deliberately empty until the owner decides.
  repair_warranty_days integer check (repair_warranty_days between 0 and 3650),
  repair_warranty_terms text not null default '',
  shop_notice text not null default '',
  legal_reviewed boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Products (each second-hand guitar is a unique listing, quantity 1).
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique
    default ('G4U-' || to_char(nextval('public.product_ref_seq'), 'FM00000')),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  brand text not null check (char_length(brand) between 1 and 80),
  model text not null check (char_length(model) between 1 and 120),
  category text not null check (category in (
    'electric', 'bass', 'acoustic', 'classical', 'electro-acoustic'
  )),
  condition text not null check (condition in (
    'excellent', 'very-good', 'good', 'fair', 'needs-repair'
  )),
  price numeric(10, 2) not null check (price >= 0 and price < 10000000),
  description text not null default '' check (char_length(description) <= 8000),
  defects text not null default '' check (char_length(defects) <= 4000),
  -- Serial number shown publicly only if the owner chooses to publish it.
  public_serial text check (char_length(public_serial) <= 80),
  provenance text not null default '' check (char_length(provenance) <= 4000),
  accessories text not null default '' check (char_length(accessories) <= 1000),
  year_made text check (char_length(year_made) <= 20),
  status text not null default 'draft' check (status in (
    'draft', 'available', 'reserved', 'sold', 'archived'
  )),
  is_featured boolean not null default false,
  is_new_arrival boolean not null default false,
  description_approved boolean not null default false,
  published_at timestamptz,
  sold_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('english',
      coalesce(brand, '') || ' ' || coalesce(model, '') || ' ' ||
      coalesce(category, '') || ' ' || coalesce(description, ''))
  ) stored
);
create index products_status_idx on public.products (status, published_at desc);
create index products_category_idx on public.products (category) where status in ('available', 'reserved');
create index products_brand_idx on public.products (lower(brand));
create index products_search_idx on public.products using gin (search);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Lifecycle bookkeeping: publication and sold dates.
create or replace function public.products_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('available', 'reserved', 'sold') and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'sold' and (tg_op = 'INSERT' or old.status <> 'sold') then
    new.sold_at := coalesce(new.sold_at, now());
  elsif new.status <> 'sold' then
    new.sold_at := null;
  end if;
  if new.status in ('available', 'reserved') and not new.description_approved then
    raise exception 'The description must be approved by the owner before publishing.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger products_lifecycle before insert or update on public.products
  for each row execute function public.products_lifecycle();

-- Private product data: never readable by the public.
create table public.product_private (
  product_id uuid primary key references public.products (id) on delete cascade,
  serial_number text check (char_length(serial_number) <= 80),
  acquired_from text check (char_length(acquired_from) <= 200),
  acquisition_cost numeric(10, 2) check (acquisition_cost >= 0),
  sold_price numeric(10, 2) check (sold_price >= 0),
  internal_notes text not null default '' check (char_length(internal_notes) <= 4000),
  updated_at timestamptz not null default now()
);
create trigger product_private_touch before update on public.product_private
  for each row execute function public.touch_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null,           -- full-size image in the product-images bucket
  thumb_path text,              -- smaller version for cards
  alt text not null default '' check (char_length(alt) <= 200),
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Reservations (48 hours by default; see reserve_product()).
-- ---------------------------------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique
    default ('RES-' || to_char(nextval('public.reservation_ref_seq'), 'FM00000')),
  product_id uuid not null references public.products (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  contact_name text not null check (char_length(contact_name) between 1 and 120),
  contact_email text check (char_length(contact_email) <= 254),
  contact_phone text check (char_length(contact_phone) <= 30),
  message text not null default '' check (char_length(message) <= 2000),
  source text not null default 'website' check (source in ('website', 'owner')),
  status text not null default 'active' check (status in (
    'active', 'expired', 'cancelled', 'released', 'converted'
  )),
  price_at_reservation numeric(10, 2) not null,
  expires_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- The key safeguard: at most ONE active reservation per guitar, enforced by
-- the database itself, so two simultaneous requests can never both succeed.
create unique index reservations_one_active_per_product
  on public.reservations (product_id) where status = 'active';
create index reservations_user_idx on public.reservations (user_id, created_at desc);
create index reservations_active_expiry_idx on public.reservations (expires_at) where status = 'active';
create trigger reservations_touch before update on public.reservations
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Purchase enquiries (submitted from the enquiry cart; NOT a payment).
-- ---------------------------------------------------------------------------
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique
    default ('ENQ-' || to_char(nextval('public.enquiry_ref_seq'), 'FM00000')),
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 30),
  preferred_contact text not null default 'email'
    check (preferred_contact in ('email', 'whatsapp', 'phone')),
  message text not null default '' check (char_length(message) <= 4000),
  status text not null default 'new' check (status in (
    'new', 'contacted', 'agreed', 'completed', 'cancelled'
  )),
  admin_notes text not null default '' check (char_length(admin_notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index enquiries_user_idx on public.enquiries (user_id, created_at desc);
create index enquiries_status_idx on public.enquiries (status, created_at desc);
create trigger enquiries_touch before update on public.enquiries
  for each row execute function public.touch_updated_at();

create table public.enquiry_items (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_label text not null,
  price_at_enquiry numeric(10, 2) not null,
  status_at_enquiry text not null
);
create index enquiry_items_enquiry_idx on public.enquiry_items (enquiry_id);

-- ---------------------------------------------------------------------------
-- Offers on listed guitars (never automatically accepted).
-- ---------------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique
    default ('OFF-' || to_char(nextval('public.offer_ref_seq'), 'FM00000')),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 30),
  amount numeric(10, 2) not null check (amount > 0 and amount < 10000000),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'new' check (status in (
    'new', 'under-review', 'countered', 'accepted', 'declined', 'withdrawn', 'expired'
  )),
  counter_amount numeric(10, 2) check (counter_amount > 0),
  admin_notes text not null default '' check (char_length(admin_notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index offers_product_idx on public.offers (product_id, created_at desc);
create index offers_user_idx on public.offers (user_id, created_at desc);
create trigger offers_touch before update on public.offers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- General contact messages and product questions.
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'contact' check (kind in ('contact', 'product-question')),
  product_id uuid references public.products (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 30),
  subject text not null default '' check (char_length(subject) <= 200),
  body text not null check (char_length(body) between 1 and 4000),
  status text not null default 'new' check (status in ('new', 'answered', 'closed')),
  admin_notes text not null default '' check (char_length(admin_notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index messages_status_idx on public.messages (status, created_at desc);
create trigger messages_touch before update on public.messages
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- "Notify me" stock alerts.
-- ---------------------------------------------------------------------------
create table public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  category text check (category in ('electric', 'bass', 'acoustic', 'classical', 'electro-acoustic')),
  brand text check (char_length(brand) <= 80),
  max_price numeric(10, 2) check (max_price > 0),
  keywords text check (char_length(keywords) <= 200),
  is_active boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);
create index stock_alerts_active_idx on public.stock_alerts (is_active, category);

-- ---------------------------------------------------------------------------
-- Wishlist.
-- ---------------------------------------------------------------------------
create table public.wishlist_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Sell or give away a guitar.
-- ---------------------------------------------------------------------------
create table public.seller_enquiries (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique
    default ('SELL-' || to_char(nextval('public.seller_ref_seq'), 'FM00000')),
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 254),
  whatsapp text not null check (char_length(whatsapp) between 6 and 30),
  preferred_contact text not null default 'whatsapp'
    check (preferred_contact in ('email', 'whatsapp', 'phone')),
  brand text not null check (char_length(brand) between 1 and 80),
  model text not null check (char_length(model) between 1 and 120),
  category text check (category in ('electric', 'bass', 'acoustic', 'classical', 'electro-acoustic', 'other')),
  condition text not null check (condition in ('working', 'needs-repair', 'broken', 'incomplete')),
  faults text not null default '' check (char_length(faults) <= 4000),
  is_giveaway boolean not null default false,
  asking_price numeric(10, 2) check (asking_price >= 0 and asking_price < 10000000),
  suburb text not null check (char_length(suburb) between 1 and 120),
  accessories text not null default '' check (char_length(accessories) <= 1000),
  notes text not null default '' check (char_length(notes) <= 4000),
  status text not null default 'received' check (status in (
    'received', 'under-review', 'awaiting-inspection', 'offer-sent', 'negotiating',
    'offer-accepted', 'offer-declined', 'handover-arranged', 'completed', 'cancelled'
  )),
  inspection_date date,
  inspection_notes text not null default '' check (char_length(inspection_notes) <= 4000),
  handover_notes text not null default '' check (char_length(handover_notes) <= 2000),
  admin_notes text not null default '' check (char_length(admin_notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_giveaway_has_no_price check (not is_giveaway or asking_price is null)
);
create index seller_enquiries_user_idx on public.seller_enquiries (user_id, created_at desc);
create index seller_enquiries_status_idx on public.seller_enquiries (status, created_at desc);
create trigger seller_enquiries_touch before update on public.seller_enquiries
  for each row execute function public.touch_updated_at();

-- Owner offers / seller counter-offers (negotiation history).
create table public.seller_offers (
  id uuid primary key default gen_random_uuid(),
  seller_enquiry_id uuid not null references public.seller_enquiries (id) on delete cascade,
  direction text not null check (direction in ('owner-offer', 'seller-counter')),
  amount numeric(10, 2) not null check (amount >= 0),
  note text not null default '' check (char_length(note) <= 2000),
  status text not null default 'open' check (status in ('open', 'accepted', 'declined', 'superseded')),
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index seller_offers_enquiry_idx on public.seller_offers (seller_enquiry_id, created_at);

-- ---------------------------------------------------------------------------
-- Repairs.
-- ---------------------------------------------------------------------------
create table public.repairs (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique
    default ('REP-' || to_char(nextval('public.repair_ref_seq'), 'FM00000')),
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 254),
  whatsapp text check (char_length(whatsapp) <= 30),
  preferred_contact text not null default 'whatsapp'
    check (preferred_contact in ('email', 'whatsapp', 'phone')),
  brand text not null check (char_length(brand) between 1 and 80),
  model text not null check (char_length(model) between 1 and 120),
  problem text not null check (char_length(problem) between 5 and 4000),
  services text[] not null default '{}' check (services <@ array[
    'strings', 'setup', 'fretwork', 'diagnosis', 'body', 'cleaning',
    'pickups', 'broken', 'nut-saddle', 'intonation'
  ]::text[]),
  preferred_date date,
  status text not null default 'request-received' check (status in (
    'request-received', 'under-review', 'awaiting-quote-approval', 'approved',
    'repair-in-progress', 'awaiting-parts', 'repair-completed',
    'ready-for-collection', 'collected', 'cancelled'
  )),
  dropoff_notes text not null default '' check (char_length(dropoff_notes) <= 2000),
  admin_notes text not null default '' check (char_length(admin_notes) <= 4000),
  warranty_days integer,           -- copied from settings when completed
  completed_at timestamptz,
  collected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index repairs_user_idx on public.repairs (user_id, created_at desc);
create index repairs_status_idx on public.repairs (status, created_at desc);
create trigger repairs_touch before update on public.repairs
  for each row execute function public.touch_updated_at();

-- Quotes: labour and parts shown separately. "initial" quotes must be approved
-- before work starts; "additional" quotes cover extra costs found later.
create table public.repair_quotes (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references public.repairs (id) on delete cascade,
  kind text not null default 'initial' check (kind in ('initial', 'additional')),
  version integer not null,
  labour_amount numeric(10, 2) not null check (labour_amount >= 0),
  parts_amount numeric(10, 2) not null check (parts_amount >= 0),
  total_amount numeric(10, 2) generated always as (labour_amount + parts_amount) stored,
  parts_detail text not null default '' check (char_length(parts_detail) <= 2000),
  notes text not null default '' check (char_length(notes) <= 2000),
  status text not null default 'sent' check (status in ('sent', 'approved', 'declined', 'superseded', 'withdrawn')),
  decision_method text check (decision_method in ('website', 'whatsapp', 'email', 'in-person', 'phone')),
  decision_note text not null default '' check (char_length(decision_note) <= 1000),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (repair_id, version)
);
create index repair_quotes_repair_idx on public.repair_quotes (repair_id, version);

-- Work log (parts used, labour, progress notes).
create table public.repair_work_log (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references public.repairs (id) on delete cascade,
  entry text not null check (char_length(entry) between 1 and 4000),
  parts_used text not null default '' check (char_length(parts_used) <= 1000),
  labour_minutes integer check (labour_minutes >= 0),
  visible_to_customer boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index repair_work_log_repair_idx on public.repair_work_log (repair_id, created_at);

-- ---------------------------------------------------------------------------
-- Uploaded files for seller enquiries and repairs (private bucket).
-- ---------------------------------------------------------------------------
create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  seller_enquiry_id uuid references public.seller_enquiries (id) on delete cascade,
  repair_id uuid references public.repairs (id) on delete cascade,
  path text not null unique,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  constraint submission_files_one_parent check (num_nonnulls(seller_enquiry_id, repair_id) = 1)
);
create index submission_files_seller_idx on public.submission_files (seller_enquiry_id);
create index submission_files_repair_idx on public.submission_files (repair_id);

-- ---------------------------------------------------------------------------
-- Manually recorded payments. Only the owner/authorised staff can record a
-- payment, and only after verifying it independently (e.g. on the bank app).
-- Rows are never deleted: mistakes are voided with a reason.
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('enquiry', 'reservation', 'repair', 'product')),
  entity_id uuid not null,
  customer_id uuid references auth.users (id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0),
  method text not null check (method in ('eft', 'cash', 'other')),
  reference_note text not null default '' check (char_length(reference_note) <= 500),
  received_on date not null,
  verified_confirmation boolean not null check (verified_confirmation),
  voided boolean not null default false,
  void_reason text check (char_length(void_reason) <= 500),
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index payments_entity_idx on public.payments (entity_type, entity_id);
create index payments_customer_idx on public.payments (customer_id);

-- ---------------------------------------------------------------------------
-- Reviews (moderated before publication).
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  rating smallint not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 120),
  body text not null check (char_length(body) between 10 and 2000),
  related_to text not null default 'general'
    check (related_to in ('purchase', 'repair', 'selling', 'general')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'removed')),
  moderation_note text not null default '' check (char_length(moderation_note) <= 500),
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);
create index reviews_status_idx on public.reviews (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Editable website content and FAQs.
-- ---------------------------------------------------------------------------
create table public.site_content (
  key text primary key check (key ~ '^[a-z0-9-]+$'),
  title text not null,
  body text not null default '',
  is_legal boolean not null default false,
  -- Legal documents start as drafts that the owner must review.
  is_draft boolean not null default true,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 3 and 300),
  answer text not null check (char_length(answer) between 1 and 4000),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger faqs_touch before update on public.faqs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Status history: one timeline for reservations, enquiries, offers, seller
-- enquiries and repairs. Filled automatically by a trigger.
-- ---------------------------------------------------------------------------
create table public.status_history (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  customer_id uuid references auth.users (id) on delete set null,
  from_status text,
  to_status text not null,
  note text not null default '',
  visible_to_customer boolean not null default true,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index status_history_entity_idx on public.status_history (entity_type, entity_id, created_at);
create index status_history_customer_idx on public.status_history (customer_id);

-- ---------------------------------------------------------------------------
-- In-app notifications (customer dashboard and admin dashboard).
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- For customer notifications: the customer. For staff notifications: null.
  user_id uuid references auth.users (id) on delete cascade,
  audience text not null check (audience in ('customer', 'staff')),
  -- Which staff permission may see a staff notification.
  staff_perm text,
  title text not null check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 2000),
  link text check (link like '/%'),
  read_at timestamptz,
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  constraint notifications_audience_target check (
    (audience = 'customer' and user_id is not null) or (audience = 'staff' and user_id is null)
  )
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_staff_idx on public.notifications (audience, created_at desc) where audience = 'staff';

-- Email outbox: every email the system tries to send, with its real status.
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body_text text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  error text,
  attempts integer not null default 0,
  dedupe_key text unique,
  related_type text,
  related_id uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index email_outbox_status_idx on public.email_outbox (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Audit log (append-only).
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  table_name text not null,
  record_id text,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);

-- ---------------------------------------------------------------------------
-- Privacy-friendly analytics: daily counters only, no cookies, no IPs.
-- ---------------------------------------------------------------------------
create table public.page_views (
  day date not null,
  path text not null check (char_length(path) <= 200),
  views integer not null default 0,
  primary key (day, path)
);

create table public.product_views (
  day date not null,
  product_id uuid not null references public.products (id) on delete cascade,
  views integer not null default 0,
  primary key (day, product_id)
);

-- Rate limiting for public forms (keys are salted hashes, never raw IPs).
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_idx on public.rate_limits (window_start);


-- ===== 20261030000002_security.sql =====
-- =============================================================================
-- Guitarz4U security: row-level security (RLS), column privileges, audit log,
-- status history and storage buckets.
--
-- Principle: the browser only ever holds the public "publishable/anon" key.
-- Everything a visitor or customer can do is limited by these policies, so
-- hiding a button in the website is never the only protection.
--
-- Public form submissions (enquiries, offers, seller and repair requests,
-- reviews, contact messages) are inserted by the website server after
-- validation, spam checks and rate limiting, using the server-only secret key.
-- There are therefore deliberately NO insert policies for those tables.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.product_private enable row level security;
alter table public.product_images enable row level security;
alter table public.reservations enable row level security;
alter table public.enquiries enable row level security;
alter table public.enquiry_items enable row level security;
alter table public.offers enable row level security;
alter table public.messages enable row level security;
alter table public.stock_alerts enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.seller_enquiries enable row level security;
alter table public.seller_offers enable row level security;
alter table public.repairs enable row level security;
alter table public.repair_quotes enable row level security;
alter table public.repair_work_log enable row level security;
alter table public.submission_files enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.site_content enable row level security;
alter table public.faqs enable row level security;
alter table public.status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;
alter table public.audit_log enable row level security;
alter table public.page_views enable row level security;
alter table public.product_views enable row level security;
alter table public.rate_limits enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.has_perm('customers'));

create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Customers may only change these columns. role, permissions and is_blocked
-- can only be changed by the owner through owner_set_access().
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, whatsapp, preferred_contact, notify_email, notify_stock_alerts)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Settings (public information only — no secrets are stored here)
-- ---------------------------------------------------------------------------
create policy settings_select on public.settings for select to anon, authenticated using (true);
create policy settings_update on public.settings for update to authenticated
  using (public.has_perm('settings')) with check (public.has_perm('settings'));
revoke insert, delete on public.settings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create policy products_select on public.products for select to anon, authenticated
  using (status in ('available', 'reserved', 'sold') or public.has_perm('inventory'));
create policy products_insert on public.products for insert to authenticated
  with check (public.has_perm('inventory'));
-- Status changes that involve reservations go through staff_set_product_status().
create policy products_update on public.products for update to authenticated
  using (public.has_perm('inventory')) with check (public.has_perm('inventory'));
create policy products_delete on public.products for delete to authenticated
  using (public.has_perm('inventory') and status = 'draft');

create policy product_private_all on public.product_private for all to authenticated
  using (public.has_perm('inventory')) with check (public.has_perm('inventory'));

create policy product_images_select on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy product_images_write on public.product_images for all to authenticated
  using (public.has_perm('inventory')) with check (public.has_perm('inventory'));

-- ---------------------------------------------------------------------------
-- Reservations: read-only through the API; changes go through functions.
-- ---------------------------------------------------------------------------
create policy reservations_select on public.reservations for select to authenticated
  using (user_id = (select auth.uid()) or public.has_perm('reservations'));
revoke insert, update, delete on public.reservations from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Purchase enquiries, offers and messages
-- ---------------------------------------------------------------------------
create policy enquiries_select on public.enquiries for select to authenticated
  using (user_id = (select auth.uid()) or public.has_perm('enquiries'));
create policy enquiries_update on public.enquiries for update to authenticated
  using (public.has_perm('enquiries')) with check (public.has_perm('enquiries'));
revoke insert, delete on public.enquiries from anon, authenticated;
revoke update on public.enquiries from anon, authenticated;
grant update (admin_notes) on public.enquiries to authenticated;

create policy enquiry_items_select on public.enquiry_items for select to authenticated
  using (exists (select 1 from public.enquiries e where e.id = enquiry_id));
revoke insert, update, delete on public.enquiry_items from anon, authenticated;

create policy offers_select on public.offers for select to authenticated
  using (user_id = (select auth.uid()) or public.has_perm('enquiries'));
create policy offers_update on public.offers for update to authenticated
  using (public.has_perm('enquiries')) with check (public.has_perm('enquiries'));
revoke insert, delete, update on public.offers from anon, authenticated;
grant update (admin_notes, counter_amount) on public.offers to authenticated;

create policy messages_select on public.messages for select to authenticated
  using (user_id = (select auth.uid()) or public.has_perm('enquiries'));
create policy messages_update on public.messages for update to authenticated
  using (public.has_perm('enquiries')) with check (public.has_perm('enquiries'));
revoke insert, delete, update on public.messages from anon, authenticated;
grant update (status, admin_notes) on public.messages to authenticated;

-- ---------------------------------------------------------------------------
-- Stock alerts and wishlist (customer-owned)
-- ---------------------------------------------------------------------------
create policy stock_alerts_select on public.stock_alerts for select to authenticated
  using (user_id = (select auth.uid()) or public.has_perm('inventory'));
create policy stock_alerts_update_own on public.stock_alerts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy stock_alerts_delete_own on public.stock_alerts for delete to authenticated
  using (user_id = (select auth.uid()));
revoke insert on public.stock_alerts from anon, authenticated;
revoke update on public.stock_alerts from anon, authenticated;
grant update (is_active) on public.stock_alerts to authenticated;

create policy wishlist_select on public.wishlist_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy wishlist_insert on public.wishlist_items for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.products p
                where p.id = product_id and p.status in ('available', 'reserved', 'sold'))
  );
create policy wishlist_delete on public.wishlist_items for delete to authenticated
  using (user_id = (select auth.uid()));
revoke update on public.wishlist_items from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seller enquiries
-- ---------------------------------------------------------------------------
create policy seller_enquiries_select on public.seller_enquiries for select to authenticated
  using (user_id = (select auth.uid()) or public.has_perm('sellers'));
create policy seller_enquiries_update on public.seller_enquiries for update to authenticated
  using (public.has_perm('sellers')) with check (public.has_perm('sellers'));
revoke insert, delete, update on public.seller_enquiries from anon, authenticated;
grant update (inspection_date, inspection_notes, handover_notes, admin_notes)
  on public.seller_enquiries to authenticated;

create policy seller_offers_select on public.seller_offers for select to authenticated
  using (
    public.has_perm('sellers')
    or exists (select 1 from public.seller_enquiries s
               where s.id = seller_enquiry_id and s.user_id = (select auth.uid()))
  );
revoke insert, update, delete on public.seller_offers from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Repairs
-- ---------------------------------------------------------------------------
create policy repairs_select on public.repairs for select to authenticated
  using (user_id = (select auth.uid()) or public.has_perm('repairs'));
create policy repairs_update on public.repairs for update to authenticated
  using (public.has_perm('repairs')) with check (public.has_perm('repairs'));
revoke insert, delete, update on public.repairs from anon, authenticated;
grant update (dropoff_notes, admin_notes) on public.repairs to authenticated;

create policy repair_quotes_select on public.repair_quotes for select to authenticated
  using (
    public.has_perm('repairs')
    or exists (select 1 from public.repairs r
               where r.id = repair_id and r.user_id = (select auth.uid()))
  );
revoke insert, update, delete on public.repair_quotes from anon, authenticated;

create policy repair_work_log_select on public.repair_work_log for select to authenticated
  using (
    public.has_perm('repairs')
    or (visible_to_customer and exists (
          select 1 from public.repairs r
          where r.id = repair_id and r.user_id = (select auth.uid())))
  );
create policy repair_work_log_insert on public.repair_work_log for insert to authenticated
  with check (public.has_perm('repairs') and created_by = (select auth.uid()));
create policy repair_work_log_update on public.repair_work_log for update to authenticated
  using (public.has_perm('repairs')) with check (public.has_perm('repairs'));
revoke delete on public.repair_work_log from anon, authenticated;

create policy submission_files_select on public.submission_files for select to authenticated
  using (
    (seller_enquiry_id is not null and (public.has_perm('sellers') or exists (
       select 1 from public.seller_enquiries s
       where s.id = seller_enquiry_id and s.user_id = (select auth.uid()))))
    or
    (repair_id is not null and (public.has_perm('repairs') or exists (
       select 1 from public.repairs r
       where r.id = repair_id and r.user_id = (select auth.uid()))))
  );
revoke insert, update, delete on public.submission_files from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Payments (manual records only)
-- ---------------------------------------------------------------------------
create policy payments_select on public.payments for select to authenticated
  using (public.has_perm('payments') or (customer_id = (select auth.uid()) and not voided));
create policy payments_insert on public.payments for insert to authenticated
  with check (public.has_perm('payments') and recorded_by = (select auth.uid()) and not voided);
create policy payments_void on public.payments for update to authenticated
  using (public.has_perm('payments') and not voided)
  with check (public.has_perm('payments') and voided and void_reason is not null);
revoke delete, update on public.payments from anon, authenticated;
grant update (voided, void_reason) on public.payments to authenticated;

-- Fill customer_id automatically from the related record.
create or replace function public.payments_fill_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.customer_id := case new.entity_type
    when 'repair' then (select user_id from public.repairs where id = new.entity_id)
    when 'enquiry' then (select user_id from public.enquiries where id = new.entity_id)
    when 'reservation' then (select user_id from public.reservations where id = new.entity_id)
    else null
  end;
  return new;
end;
$$;
create trigger payments_fill_customer before insert on public.payments
  for each row execute function public.payments_fill_customer();

-- ---------------------------------------------------------------------------
-- Reviews: the public sees only approved reviews and never the user id.
-- ---------------------------------------------------------------------------
create policy reviews_select on public.reviews for select to anon, authenticated
  using (status = 'approved' or user_id = (select auth.uid()) or public.has_perm('reviews'));
create policy reviews_update on public.reviews for update to authenticated
  using (public.has_perm('reviews')) with check (public.has_perm('reviews'));
create policy reviews_delete_own on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update on public.reviews from anon, authenticated;
revoke select on public.reviews from anon;
grant select (id, display_name, rating, title, body, related_to, status, created_at)
  on public.reviews to anon;
grant update (status, moderation_note, moderated_by, moderated_at) on public.reviews to authenticated;

-- ---------------------------------------------------------------------------
-- Website content and FAQs
-- ---------------------------------------------------------------------------
create policy site_content_select on public.site_content for select to anon, authenticated
  using (true);
create policy site_content_write on public.site_content for update to authenticated
  using (public.has_perm('content')) with check (public.has_perm('content'));
revoke insert, delete on public.site_content from anon, authenticated;

create policy faqs_select on public.faqs for select to anon, authenticated
  using (is_published or public.has_perm('content'));
create policy faqs_write on public.faqs for all to authenticated
  using (public.has_perm('content')) with check (public.has_perm('content'));

-- ---------------------------------------------------------------------------
-- Status history, notifications, outbox, audit, analytics
-- ---------------------------------------------------------------------------
create policy status_history_select on public.status_history for select to authenticated
  using (
    (customer_id = (select auth.uid()) and visible_to_customer)
    or public.has_perm(case entity_type
         when 'reservations' then 'reservations'
         when 'enquiries' then 'enquiries'
         when 'offers' then 'enquiries'
         when 'seller_enquiries' then 'sellers'
         when 'repairs' then 'repairs'
         else 'audit' end)
  );
revoke insert, update, delete on public.status_history from anon, authenticated;

create policy notifications_select on public.notifications for select to authenticated
  using (
    (audience = 'customer' and user_id = (select auth.uid()))
    or (audience = 'staff' and public.has_perm(coalesce(staff_perm, 'reports')))
  );
create policy notifications_mark_read on public.notifications for update to authenticated
  using (
    (audience = 'customer' and user_id = (select auth.uid()))
    or (audience = 'staff' and public.has_perm(coalesce(staff_perm, 'reports')))
  )
  with check (true);
revoke insert, delete, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy email_outbox_select on public.email_outbox for select to authenticated
  using (public.has_perm('settings'));
revoke insert, update, delete on public.email_outbox from anon, authenticated;

create policy audit_log_select on public.audit_log for select to authenticated
  using (public.has_perm('audit'));
revoke insert, update, delete on public.audit_log from anon, authenticated;

create policy page_views_select on public.page_views for select to authenticated
  using (public.has_perm('reports'));
create policy product_views_select on public.product_views for select to authenticated
  using (public.has_perm('reports'));
revoke insert, update, delete on public.page_views, public.product_views from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Audit trigger: records who changed what, and when.
-- ---------------------------------------------------------------------------
create or replace function public.audit_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_changes jsonb;
  v_key text;
begin
  if tg_op = 'UPDATE' then
    v_changes := '{}'::jsonb;
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key not in ('updated_at', 'search')
         and (v_old -> v_key) is distinct from (v_new -> v_key) then
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return new;
    end if;
  elsif tg_op = 'INSERT' then
    v_changes := v_new - 'search';
  else
    v_changes := v_old - 'search';
  end if;

  insert into public.audit_log (actor_id, action, table_name, record_id, changes)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'key', v_old ->> 'key',
             v_new ->> 'product_id', v_old ->> 'product_id'),
    v_changes
  );
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'settings', 'products', 'product_private', 'product_images',
    'reservations', 'enquiries', 'offers', 'seller_enquiries', 'seller_offers',
    'repairs', 'repair_quotes', 'repair_work_log', 'payments', 'reviews',
    'site_content', 'faqs'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_changes()',
      t || '_audit', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Status history trigger. A note for the timeline can be passed through the
-- transaction-local setting "app.status_note" (see set_status()).
-- ---------------------------------------------------------------------------
create or replace function public.record_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.status_history
      (entity_type, entity_id, customer_id, from_status, to_status, note, visible_to_customer, actor_id)
    values (
      tg_table_name,
      new.id,
      new.user_id,
      case when tg_op = 'UPDATE' then old.status end,
      new.status,
      coalesce(nullif(current_setting('app.status_note', true), ''), ''),
      coalesce(nullif(current_setting('app.status_note_visible', true), ''), 'true')::boolean,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['reservations', 'enquiries', 'offers', 'seller_enquiries', 'repairs'] loop
    execute format(
      'create trigger %I after insert or update of status on public.%I
         for each row execute function public.record_status_change()',
      t || '_status_history', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage buckets
--   product-images : public, owner-managed photos of guitars for sale.
--   submissions    : PRIVATE photos/videos from sellers and repair customers.
-- File type and size limits are enforced by Supabase Storage itself.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('submissions', 'submissions', false, 26214400,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
         'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "product images: staff upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.has_perm('inventory'));
create policy "product images: staff update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.has_perm('inventory'));
create policy "product images: staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.has_perm('inventory'));

-- Private submissions: staff with the right permission can read them.
-- Customers and sellers upload via short-lived signed upload URLs created by
-- the website server, and view their own files via signed download URLs.
create policy "submissions: staff read" on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions' and (
      (split_part(name, '/', 1) = 'seller' and public.has_perm('sellers'))
      or (split_part(name, '/', 1) = 'repair' and public.has_perm('repairs'))
    )
  );
create policy "submissions: staff delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'submissions' and (
      (split_part(name, '/', 1) = 'seller' and public.has_perm('sellers'))
      or (split_part(name, '/', 1) = 'repair' and public.has_perm('repairs'))
    )
  );


-- ===== 20261030000003_workflows.sql =====
-- =============================================================================
-- Guitarz4U workflow functions.
--
-- These functions hold the business rules that must be atomic or must not be
-- bypassable from the browser: reservations, purchase enquiries, product
-- status changes, repair quotes/approvals, seller negotiations and admin
-- access. Each checks permissions itself.
-- =============================================================================

-- Product status may only change through the functions below, so that a
-- guitar's status always agrees with its reservations.
revoke update on public.products from authenticated;
grant update (
  slug, brand, model, category, condition, price, description, defects,
  public_serial, provenance, accessories, year_made, is_featured,
  is_new_arrival, description_approved
) on public.products to authenticated;

-- Helper: raise a friendly error.
create or replace function public.fail(p_message text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', p_message using errcode = 'P0001';
end;
$$;

-- ---------------------------------------------------------------------------
-- Reservation expiry. Safe to call often: it only touches expired rows.
-- Runs every 10 minutes via pg_cron (if available) AND on relevant page loads,
-- so expiry still happens even if scheduled jobs are unavailable.
-- ---------------------------------------------------------------------------
create or replace function public.expire_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select id, product_id from public.reservations
    where status = 'active' and expires_at <= now()
    for update skip locked
  loop
    perform set_config('app.status_note', 'Reservation period ended automatically.', true);
    update public.reservations set status = 'expired', closed_at = now() where id = r.id;
    -- Only restore availability if the owner has not changed the status.
    update public.products set status = 'available'
      where id = r.product_id and status = 'reserved';
    v_count := v_count + 1;
  end loop;
  perform set_config('app.status_note', '', true);
  return v_count;
end;
$$;
revoke all on function public.expire_reservations() from public;
grant execute on function public.expire_reservations() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Customer reservation. Called only by the website server (secret key) with
-- the verified user id. Locks the product row so concurrent requests queue up;
-- the unique index on active reservations is a second safeguard.
-- ---------------------------------------------------------------------------
create or replace function public.reserve_product(
  p_product_id uuid,
  p_user_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_message text
)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_settings public.settings;
  v_active integer;
  v_res public.reservations;
begin
  if p_user_id is null then
    perform public.fail('You need to be signed in to reserve a guitar.');
  end if;

  perform public.expire_reservations();

  select * into v_settings from public.settings where id = 1;
  select * into v_product from public.products where id = p_product_id for update;

  if not found or v_product.status not in ('available', 'reserved', 'sold') then
    perform public.fail('This guitar could not be found.');
  end if;
  if v_product.status = 'sold' then
    perform public.fail('Sorry, this guitar has already been sold.');
  end if;
  if v_product.status = 'reserved' then
    perform public.fail('Sorry, this guitar is already reserved by someone else.');
  end if;

  select count(*) into v_active from public.reservations
    where user_id = p_user_id and status = 'active';
  if v_active >= v_settings.max_active_reservations_per_customer then
    perform public.fail(format(
      'You can hold up to %s reservations at a time. Please cancel one or contact us.',
      v_settings.max_active_reservations_per_customer));
  end if;

  perform set_config('app.status_note', 'Reservation requested on the website.', true);
  insert into public.reservations (
    product_id, user_id, contact_name, contact_email, contact_phone, message,
    source, status, price_at_reservation, expires_at
  ) values (
    p_product_id, p_user_id, left(p_name, 120), left(p_email, 254), left(p_phone, 30),
    left(coalesce(p_message, ''), 2000), 'website', 'active', v_product.price,
    now() + make_interval(hours => v_settings.reservation_hours)
  )
  returning * into v_res;

  update public.products set status = 'reserved' where id = p_product_id;
  perform set_config('app.status_note', '', true);
  return v_res;
exception
  when unique_violation then
    perform public.fail('Sorry, this guitar is already reserved by someone else.');
end;
$$;
revoke all on function public.reserve_product(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_product(uuid, uuid, text, text, text, text) to service_role;

-- Customer cancels their own active reservation.
create or replace function public.customer_cancel_reservation(p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.reservations;
begin
  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found or v_res.user_id is distinct from auth.uid() then
    perform public.fail('Reservation not found.');
  end if;
  if v_res.status <> 'active' then
    perform public.fail('This reservation is no longer active.');
  end if;
  perform set_config('app.status_note', 'Cancelled by the customer.', true);
  update public.reservations set status = 'cancelled', closed_at = now()
    where id = p_reservation_id returning * into v_res;
  update public.products set status = 'available'
    where id = v_res.product_id and status = 'reserved';
  perform set_config('app.status_note', '', true);
  return v_res;
end;
$$;
revoke all on function public.customer_cancel_reservation(uuid) from public, anon;
grant execute on function public.customer_cancel_reservation(uuid) to authenticated;

-- Owner/staff create a reservation manually (e.g. agreed over WhatsApp).
create or replace function public.staff_reserve_product(
  p_product_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_hours integer,
  p_note text
)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_res public.reservations;
begin
  if not public.has_perm('reservations') then
    perform public.fail('You do not have permission to manage reservations.');
  end if;
  if p_hours is null or p_hours < 1 or p_hours > 336 then
    perform public.fail('Reservation length must be between 1 and 336 hours.');
  end if;
  perform public.expire_reservations();
  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    perform public.fail('Product not found.');
  end if;
  if v_product.status <> 'available' then
    perform public.fail('Only an available guitar can be reserved.');
  end if;
  perform set_config('app.status_note', coalesce(nullif(p_note, ''), 'Reserved by the owner.'), true);
  insert into public.reservations (
    product_id, user_id, contact_name, contact_email, contact_phone, message,
    source, status, price_at_reservation, expires_at
  ) values (
    p_product_id, null, left(p_name, 120), left(p_email, 254), left(p_phone, 30),
    left(coalesce(p_note, ''), 2000), 'owner', 'active', v_product.price,
    now() + make_interval(hours => p_hours)
  ) returning * into v_res;
  update public.products set status = 'reserved' where id = p_product_id;
  perform set_config('app.status_note', '', true);
  return v_res;
end;
$$;
revoke all on function public.staff_reserve_product(uuid, text, text, text, integer, text) from public, anon;
grant execute on function public.staff_reserve_product(uuid, text, text, text, integer, text) to authenticated;

-- Owner/staff: cancel, extend or convert (= sold) a reservation.
create or replace function public.staff_reservation_action(
  p_reservation_id uuid,
  p_action text,
  p_hours integer default null,
  p_note text default ''
)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.reservations;
begin
  if not public.has_perm('reservations') then
    perform public.fail('You do not have permission to manage reservations.');
  end if;
  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then
    perform public.fail('Reservation not found.');
  end if;
  if v_res.status <> 'active' then
    perform public.fail('Only an active reservation can be changed.');
  end if;
  perform set_config('app.status_note', coalesce(p_note, ''), true);

  if p_action = 'extend' then
    if p_hours is null or p_hours < 1 or p_hours > 336 then
      perform public.fail('Extension must be between 1 and 336 hours.');
    end if;
    update public.reservations
      set expires_at = greatest(expires_at, now()) + make_interval(hours => p_hours)
      where id = p_reservation_id returning * into v_res;
    insert into public.status_history
      (entity_type, entity_id, customer_id, from_status, to_status, note, actor_id)
    values ('reservations', v_res.id, v_res.user_id, 'active', 'active',
            format('Extended by %s hours until %s. %s', p_hours,
                   to_char(v_res.expires_at at time zone 'Africa/Johannesburg', 'DD Mon YYYY HH24:MI'),
                   coalesce(p_note, '')),
            auth.uid());
  elsif p_action = 'cancel' then
    update public.reservations set status = 'cancelled', closed_at = now()
      where id = p_reservation_id returning * into v_res;
    update public.products set status = 'available'
      where id = v_res.product_id and status = 'reserved';
  elsif p_action = 'convert' then
    update public.reservations set status = 'converted', closed_at = now()
      where id = p_reservation_id returning * into v_res;
    update public.products set status = 'sold'
      where id = v_res.product_id and status = 'reserved';
  else
    perform public.fail('Unknown reservation action.');
  end if;

  perform set_config('app.status_note', '', true);
  return v_res;
end;
$$;
revoke all on function public.staff_reservation_action(uuid, text, integer, text) from public, anon;
grant execute on function public.staff_reservation_action(uuid, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Product status changes (publish, unpublish, archive, sold, restore).
-- ---------------------------------------------------------------------------
create or replace function public.staff_set_product_status(
  p_product_id uuid,
  p_status text,
  p_note text default ''
)
returns public.products
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_res public.reservations;
begin
  if not public.has_perm('inventory') then
    perform public.fail('You do not have permission to manage inventory.');
  end if;
  if p_status not in ('draft', 'available', 'sold', 'archived') then
    perform public.fail('Use the reservation tools to reserve a guitar.');
  end if;

  perform public.expire_reservations();
  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    perform public.fail('Product not found.');
  end if;
  if v_product.status = p_status then
    return v_product;
  end if;
  if p_status = 'sold' and v_product.status = 'sold' then
    perform public.fail('This guitar is already marked as sold.');
  end if;

  select * into v_res from public.reservations
    where product_id = p_product_id and status = 'active' for update;
  if found then
    perform set_config('app.status_note', coalesce(nullif(p_note, ''),
      case when p_status = 'sold' then 'Sale completed.' else 'Reservation released by the owner.' end), true);
    update public.reservations
      set status = case when p_status = 'sold' then 'converted' else 'released' end,
          closed_at = now()
      where id = v_res.id;
    perform set_config('app.status_note', '', true);
  end if;

  update public.products set status = p_status where id = p_product_id
    returning * into v_product;
  return v_product;
end;
$$;
revoke all on function public.staff_set_product_status(uuid, text, text) from public, anon;
grant execute on function public.staff_set_product_status(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Purchase enquiry from the enquiry cart. Re-checks availability on the
-- server; refuses the whole enquiry if any guitar is no longer available.
-- A guitar reserved by the same customer is allowed.
-- ---------------------------------------------------------------------------
create or replace function public.submit_enquiry(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_preferred_contact text,
  p_message text,
  p_product_ids uuid[]
)
returns public.enquiries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enq public.enquiries;
  v_product public.products;
  v_unavailable text[] := '{}';
  v_id uuid;
begin
  if p_product_ids is null or cardinality(p_product_ids) = 0 then
    perform public.fail('Your enquiry cart is empty.');
  end if;
  if cardinality(p_product_ids) > 10 then
    perform public.fail('Please enquire about at most 10 guitars at a time.');
  end if;

  perform public.expire_reservations();

  foreach v_id in array p_product_ids loop
    select * into v_product from public.products where id = v_id for share;
    if not found or v_product.status not in ('available', 'reserved') then
      v_unavailable := v_unavailable || coalesce(v_product.brand || ' ' || v_product.model, 'Unknown item');
    elsif v_product.status = 'reserved' and not exists (
      select 1 from public.reservations r
      where r.product_id = v_id and r.status = 'active'
        and p_user_id is not null and r.user_id = p_user_id
    ) then
      v_unavailable := v_unavailable || (v_product.brand || ' ' || v_product.model);
    end if;
  end loop;

  if cardinality(v_unavailable) > 0 then
    perform public.fail('No longer available: ' || array_to_string(v_unavailable, ', ')
      || '. Please remove it from your enquiry cart.');
  end if;

  perform set_config('app.status_note', 'Enquiry received.', true);
  insert into public.enquiries (user_id, name, email, phone, preferred_contact, message)
  values (p_user_id, left(p_name, 120), left(p_email, 254), left(p_phone, 30),
          coalesce(p_preferred_contact, 'email'), left(coalesce(p_message, ''), 4000))
  returning * into v_enq;

  insert into public.enquiry_items (enquiry_id, product_id, product_label, price_at_enquiry, status_at_enquiry)
  select v_enq.id, p.id, p.brand || ' ' || p.model || ' (' || p.ref || ')', p.price, p.status
  from public.products p where p.id = any (p_product_ids);

  perform set_config('app.status_note', '', true);
  return v_enq;
end;
$$;
revoke all on function public.submit_enquiry(uuid, text, text, text, text, text, uuid[]) from public, anon, authenticated;
grant execute on function public.submit_enquiry(uuid, text, text, text, text, text, uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Generic status change with an optional timeline note.
-- ---------------------------------------------------------------------------
create or replace function public.set_status(
  p_entity text,
  p_id uuid,
  p_status text,
  p_note text default '',
  p_visible boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perm text;
  v_rows integer;
begin
  v_perm := case p_entity
    when 'enquiries' then 'enquiries'
    when 'offers' then 'enquiries'
    when 'seller_enquiries' then 'sellers'
    when 'repairs' then 'repairs'
    else null end;
  if v_perm is null then
    perform public.fail('Unknown record type.');
  end if;
  if not public.has_perm(v_perm) then
    perform public.fail('You do not have permission to update this record.');
  end if;

  perform set_config('app.status_note', left(coalesce(p_note, ''), 1000), true);
  perform set_config('app.status_note_visible', coalesce(p_visible, true)::text, true);
  execute format('update public.%I set status = $1 where id = $2', p_entity)
    using p_status, p_id;
  get diagnostics v_rows = row_count;
  perform set_config('app.status_note', '', true);
  perform set_config('app.status_note_visible', '', true);
  if v_rows = 0 then
    perform public.fail('Record not found.');
  end if;
end;
$$;
revoke all on function public.set_status(text, uuid, text, text, boolean) from public, anon;
grant execute on function public.set_status(text, uuid, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Repair rules, enforced by the database:
--  * Work cannot start until an initial quote has been APPROVED.
--  * A repair cannot be completed/collected while a quote (including an
--    additional-cost quote) is still awaiting the customer's decision.
-- ---------------------------------------------------------------------------
create or replace function public.repairs_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status in ('approved', 'repair-in-progress', 'awaiting-parts',
                    'repair-completed', 'ready-for-collection', 'collected')
     and not exists (
       select 1 from public.repair_quotes q
       where q.repair_id = new.id and q.kind = 'initial' and q.status = 'approved')
  then
    raise exception 'The customer must approve the quote before work can start.'
      using errcode = 'P0001';
  end if;

  if new.status in ('repair-in-progress', 'repair-completed', 'ready-for-collection', 'collected')
     and exists (select 1 from public.repair_quotes q
                 where q.repair_id = new.id and q.status = 'sent')
  then
    raise exception 'A quote is still awaiting the customer''s approval. Record their decision first.'
      using errcode = 'P0001';
  end if;

  if new.status = 'repair-completed' and new.completed_at is null then
    new.completed_at := now();
    new.warranty_days := (select repair_warranty_days from public.settings where id = 1);
  end if;
  if new.status = 'collected' then
    new.collected_at := coalesce(new.collected_at, now());
  end if;
  return new;
end;
$$;
create trigger repairs_guard before update of status on public.repairs
  for each row execute function public.repairs_guard();

-- Send a quote (initial or additional cost). Labour and parts are separate.
create or replace function public.staff_send_quote(
  p_repair_id uuid,
  p_kind text,
  p_labour numeric,
  p_parts numeric,
  p_parts_detail text,
  p_notes text
)
returns public.repair_quotes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_repair public.repairs;
  v_quote public.repair_quotes;
  v_version integer;
begin
  if not public.has_perm('repairs') then
    perform public.fail('You do not have permission to manage repairs.');
  end if;
  if p_kind not in ('initial', 'additional') then
    perform public.fail('Unknown quote type.');
  end if;
  if p_labour is null or p_parts is null or p_labour < 0 or p_parts < 0 then
    perform public.fail('Labour and parts amounts must be zero or more.');
  end if;

  select * into v_repair from public.repairs where id = p_repair_id for update;
  if not found then
    perform public.fail('Repair not found.');
  end if;
  if v_repair.status in ('collected', 'cancelled') then
    perform public.fail('This repair is closed.');
  end if;
  if p_kind = 'additional' and not exists (
    select 1 from public.repair_quotes where repair_id = p_repair_id
      and kind = 'initial' and status = 'approved') then
    perform public.fail('An additional-cost quote needs an approved initial quote first.');
  end if;
  if p_kind = 'initial' and exists (
    select 1 from public.repair_quotes where repair_id = p_repair_id
      and kind = 'initial' and status = 'approved') then
    perform public.fail('The initial quote is already approved. Send an additional-cost quote instead.');
  end if;

  -- Any older pending quote of the same kind is replaced by this one.
  update public.repair_quotes set status = 'superseded'
    where repair_id = p_repair_id and kind = p_kind and status = 'sent';

  select coalesce(max(version), 0) + 1 into v_version
    from public.repair_quotes where repair_id = p_repair_id;

  insert into public.repair_quotes
    (repair_id, kind, version, labour_amount, parts_amount, parts_detail, notes, status, created_by)
  values (p_repair_id, p_kind, v_version, p_labour, p_parts,
          left(coalesce(p_parts_detail, ''), 2000), left(coalesce(p_notes, ''), 2000), 'sent', auth.uid())
  returning * into v_quote;

  if p_kind = 'initial' then
    perform set_config('app.status_note', format('Quote v%s sent: R%s (labour R%s, parts R%s).',
      v_version, v_quote.total_amount, p_labour, p_parts), true);
    update public.repairs set status = 'awaiting-quote-approval' where id = p_repair_id;
  else
    insert into public.status_history
      (entity_type, entity_id, customer_id, from_status, to_status, note, actor_id)
    values ('repairs', p_repair_id, v_repair.user_id, v_repair.status, v_repair.status,
            format('Additional cost quote v%s sent for approval: R%s. Work affected by this cost is on hold until you approve.',
                   v_version, v_quote.total_amount), auth.uid());
  end if;
  perform set_config('app.status_note', '', true);
  return v_quote;
end;
$$;
revoke all on function public.staff_send_quote(uuid, text, numeric, numeric, text, text) from public, anon;
grant execute on function public.staff_send_quote(uuid, text, numeric, numeric, text, text) to authenticated;

-- Internal: apply a quote decision (shared by customer and staff paths).
create or replace function public.apply_quote_decision(
  p_quote_id uuid,
  p_decision text,
  p_method text,
  p_note text,
  p_actor uuid
)
returns public.repair_quotes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.repair_quotes;
  v_repair public.repairs;
begin
  if p_decision not in ('approved', 'declined') then
    perform public.fail('Decision must be approved or declined.');
  end if;
  select * into v_quote from public.repair_quotes where id = p_quote_id for update;
  if not found then
    perform public.fail('Quote not found.');
  end if;
  if v_quote.status <> 'sent' then
    perform public.fail('This quote is no longer awaiting a decision.');
  end if;
  select * into v_repair from public.repairs where id = v_quote.repair_id for update;

  update public.repair_quotes
    set status = p_decision, decision_method = p_method,
        decision_note = left(coalesce(p_note, ''), 1000),
        decided_by = p_actor, decided_at = now()
    where id = p_quote_id returning * into v_quote;

  if v_quote.kind = 'initial' and p_decision = 'approved'
     and v_repair.status in ('awaiting-quote-approval', 'under-review', 'request-received') then
    perform set_config('app.status_note', format('Quote v%s approved (%s).', v_quote.version, p_method), true);
    update public.repairs set status = 'approved' where id = v_repair.id;
  else
    insert into public.status_history
      (entity_type, entity_id, customer_id, from_status, to_status, note, actor_id)
    values ('repairs', v_repair.id, v_repair.user_id, v_repair.status, v_repair.status,
            format('%s quote v%s %s (%s).', initcap(v_quote.kind), v_quote.version, p_decision, p_method),
            p_actor);
  end if;
  perform set_config('app.status_note', '', true);
  return v_quote;
end;
$$;
revoke all on function public.apply_quote_decision(uuid, text, text, text, uuid) from public, anon, authenticated;

-- Customer approves/declines a quote on the website (their own repair only).
create or replace function public.customer_decide_quote(
  p_quote_id uuid,
  p_decision text,
  p_note text default ''
)
returns public.repair_quotes
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.repair_quotes q join public.repairs r on r.id = q.repair_id
    where q.id = p_quote_id and r.user_id = auth.uid()) then
    perform public.fail('Quote not found.');
  end if;
  return public.apply_quote_decision(p_quote_id, p_decision, 'website', p_note, auth.uid());
end;
$$;
revoke all on function public.customer_decide_quote(uuid, text, text) from public, anon;
grant execute on function public.customer_decide_quote(uuid, text, text) to authenticated;

-- Owner records a decision the customer gave by WhatsApp, email, phone or in person.
create or replace function public.staff_record_quote_decision(
  p_quote_id uuid,
  p_decision text,
  p_method text,
  p_note text
)
returns public.repair_quotes
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_perm('repairs') then
    perform public.fail('You do not have permission to manage repairs.');
  end if;
  if p_method not in ('whatsapp', 'email', 'in-person', 'phone') then
    perform public.fail('Choose how the customer gave their decision.');
  end if;
  if coalesce(trim(p_note), '') = '' then
    perform public.fail('Add a short note describing the customer''s decision (e.g. message date/time).');
  end if;
  return public.apply_quote_decision(p_quote_id, p_decision, p_method, p_note, auth.uid());
end;
$$;
revoke all on function public.staff_record_quote_decision(uuid, text, text, text) from public, anon;
grant execute on function public.staff_record_quote_decision(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Seller negotiations.
-- ---------------------------------------------------------------------------
create or replace function public.staff_seller_offer(
  p_enquiry_id uuid,
  p_direction text,
  p_amount numeric,
  p_note text
)
returns public.seller_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer public.seller_offers;
  v_enq public.seller_enquiries;
begin
  if not public.has_perm('sellers') then
    perform public.fail('You do not have permission to manage seller enquiries.');
  end if;
  if p_direction not in ('owner-offer', 'seller-counter') then
    perform public.fail('Unknown offer type.');
  end if;
  if p_amount is null or p_amount < 0 then
    perform public.fail('Enter a valid amount (R0 for a free giveaway).');
  end if;
  select * into v_enq from public.seller_enquiries where id = p_enquiry_id for update;
  if not found then
    perform public.fail('Seller enquiry not found.');
  end if;
  if v_enq.status in ('completed', 'cancelled') then
    perform public.fail('This enquiry is closed.');
  end if;

  update public.seller_offers set status = 'superseded'
    where seller_enquiry_id = p_enquiry_id and status = 'open';
  insert into public.seller_offers (seller_enquiry_id, direction, amount, note, recorded_by)
  values (p_enquiry_id, p_direction, p_amount, left(coalesce(p_note, ''), 2000), auth.uid())
  returning * into v_offer;

  perform set_config('app.status_note',
    case when p_direction = 'owner-offer'
      then format('Offer of R%s sent after inspection.', p_amount)
      else format('Seller counter-offer of R%s recorded.', p_amount) end, true);
  update public.seller_enquiries
    set status = case when p_direction = 'owner-offer' and status <> 'negotiating' then 'offer-sent' else 'negotiating' end
    where id = p_enquiry_id;
  perform set_config('app.status_note', '', true);
  return v_offer;
end;
$$;
revoke all on function public.staff_seller_offer(uuid, text, numeric, text) from public, anon;
grant execute on function public.staff_seller_offer(uuid, text, numeric, text) to authenticated;

create or replace function public.staff_seller_offer_decision(
  p_offer_id uuid,
  p_decision text,
  p_note text default ''
)
returns public.seller_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer public.seller_offers;
begin
  if not public.has_perm('sellers') then
    perform public.fail('You do not have permission to manage seller enquiries.');
  end if;
  if p_decision not in ('accepted', 'declined') then
    perform public.fail('Decision must be accepted or declined.');
  end if;
  select * into v_offer from public.seller_offers where id = p_offer_id for update;
  if not found or v_offer.status <> 'open' then
    perform public.fail('This offer is no longer open.');
  end if;
  update public.seller_offers set status = p_decision where id = p_offer_id returning * into v_offer;
  perform set_config('app.status_note', coalesce(nullif(p_note, ''),
    format('Offer of R%s %s.', v_offer.amount, p_decision)), true);
  update public.seller_enquiries
    set status = case when p_decision = 'accepted' then 'offer-accepted' else 'offer-declined' end
    where id = v_offer.seller_enquiry_id;
  perform set_config('app.status_note', '', true);
  return v_offer;
end;
$$;
revoke all on function public.staff_seller_offer_decision(uuid, text, text) from public, anon;
grant execute on function public.staff_seller_offer_decision(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin access management (owner only).
-- ---------------------------------------------------------------------------
create or replace function public.owner_set_access(
  p_user_id uuid,
  p_role text,
  p_permissions text[],
  p_blocked boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_owner() then
    perform public.fail('Only the owner can change account access.');
  end if;
  if p_role not in ('customer', 'staff', 'owner') then
    perform public.fail('Unknown role.');
  end if;
  if p_user_id = auth.uid() and (p_role <> 'owner' or p_blocked) then
    perform public.fail('You cannot remove your own owner access or block yourself.');
  end if;
  update public.profiles
    set role = p_role,
        permissions = case when p_role = 'staff' then coalesce(p_permissions, '{}') else '{}' end,
        is_blocked = coalesce(p_blocked, false)
    where id = p_user_id returning * into v_profile;
  if not found then
    perform public.fail('Account not found.');
  end if;
  return v_profile;
end;
$$;
revoke all on function public.owner_set_access(uuid, text, text[], boolean) from public, anon;
grant execute on function public.owner_set_access(uuid, text, text[], boolean) to authenticated;

-- First owner set-up. NOT callable from the website or API: run it once in the
-- Supabase SQL Editor after registering your own account:
--   select public.bootstrap_owner('your-email@example.com');
create or replace function public.bootstrap_owner(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if exists (select 1 from public.profiles where role = 'owner') then
    return 'An owner already exists. Use the admin dashboard (Customers) to manage access.';
  end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    return 'No account found with that email. Register on the website first, then run this again.';
  end if;
  update public.profiles set role = 'owner', permissions = '{}', is_blocked = false where id = v_id;
  return 'Success: ' || p_email || ' is now the owner.';
end;
$$;
revoke all on function public.bootstrap_owner(text) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Analytics counters and rate limiting (website server only).
-- ---------------------------------------------------------------------------
create or replace function public.track_page_view(p_path text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.page_views (day, path, views)
  values ((now() at time zone 'Africa/Johannesburg')::date, left(p_path, 200), 1)
  on conflict (day, path) do update set views = public.page_views.views + 1;
$$;
revoke all on function public.track_page_view(text) from public, anon, authenticated;
grant execute on function public.track_page_view(text) to service_role;

create or replace function public.track_product_view(p_product_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.product_views (day, product_id, views)
  select (now() at time zone 'Africa/Johannesburg')::date, p.id, 1
  from public.products p where p.id = p_product_id and p.status in ('available', 'reserved', 'sold')
  on conflict (day, product_id) do update set views = public.product_views.views + 1;
$$;
revoke all on function public.track_product_view(uuid) from public, anon, authenticated;
grant execute on function public.track_product_view(uuid) to service_role;

-- Returns true if the action is allowed; false if the limit is exceeded.
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  -- Occasional clean-up of old windows.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_max;
end;
$$;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Scheduled expiry with pg_cron (available on Supabase, including Free).
-- If pg_cron is unavailable, expiry still happens on page loads.
-- ---------------------------------------------------------------------------
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('guitarz4u-expire-reservations', '*/10 * * * *',
                        'select public.expire_reservations();');
exception when others then
  raise notice 'pg_cron not available (%). Reservation expiry will run on page loads instead.', sqlerrm;
end;
$$;


-- ===== 20261030000004_seed_content.sql =====
-- Generated by scripts/build-content-migration.mjs — edit content/ and re-run.
-- Seeds editable website text, legal drafts and FAQs. Existing rows are kept.

insert into public.site_content (key, title, body, is_legal, is_draft) values
  ($c$about$c$, $c$About Guitarz4U$c$, $c$Guitarz4U buys, sells and repairs second-hand guitars from Sandringham, Johannesburg.

## What we do

- **Sell second-hand guitars** — electric, bass, acoustic, classical and electro-acoustic. Each listing shows the condition, known defects and what is included.
- **Buy and accept guitars** — working, broken, incomplete or in need of repair. Every guitar is inspected in person before we make an offer. You can also give a guitar away if you would like it to find a new home.
- **Repair guitars** — from string changes and setups to fretwork, electronics and broken-guitar repairs, always with a clear quote that you approve before any work starts.

## How we work

- **Honest listings.** We describe what we see, including the flaws.
- **No online payments.** You arrange payment directly with the owner, and nothing is final until it has been agreed and confirmed.
- **Collection only.** Guitars are collected in the Sandringham area. Exact details are shared privately once a purchase is approved.
- **Your approval first.** Repairs never start, and extra costs are never added, without your approval.

*Owner: add your own story here — how you got into guitars, your experience with repairs, and what you love about the instruments you sell.*
$c$, false, false),
  ($c$contact-intro$c$, $c$Contact introduction$c$, $c$The quickest way to reach us is WhatsApp. You can also email or use the form below. We are based in Sandringham, Johannesburg — exact collection and drop-off details are shared privately once arrangements are agreed.
$c$, false, false),
  ($c$home-intro$c$, $c$Home introduction$c$, $c$Guitarz4U is a small, owner-run second-hand guitar shop and repair service in Sandringham, Johannesburg. Every guitar is personally checked, honestly described and priced in rand — with any defects shown up front.
$c$, false, false),
  ($c$process$c$, $c$How buying, selling and repairs work$c$, $c$## Buying a guitar

1. **Browse** the shop and read the full listing, including defects.
2. **Ask a question, make an offer or reserve.** Signed-in customers can reserve an available guitar for {{reservation_hours}} hours.
3. **Send an enquiry** from your enquiry cart. This tells us which guitars you want — it is not a payment.
4. **We contact you** by WhatsApp or email to agree the sale and payment method (usually EFT).
5. **Payment is confirmed** by the owner once the funds have been received.
6. **Collect** your guitar in the {{collection_area}} area. Exact details are shared privately.

## Selling or giving away a guitar

1. **Submit your guitar** with photos on the Sell page, or send details by WhatsApp.
2. **We review** your submission and arrange an inspection.
3. **The owner inspects the guitar in person** before making any offer.
4. **You accept, decline or negotiate.** Giving a guitar away? No payment is involved.
5. **Handover** is arranged privately, and the enquiry is marked complete.

## Repairs

1. **Request a repair** online or by WhatsApp. This does not book or start work.
2. **Drop-off** is arranged privately.
3. **Inspection and quote** — labour and parts shown separately.
4. **You approve the quote.** No work starts without your approval.
5. **Repair in progress** — you can follow updates in your account. Any extra cost needs your approval first.
6. **Ready for collection** — we arrange collection privately and you pay directly (usually by EFT).
$c$, false, false),
  ($c$repairs-intro$c$, $c$Repairs introduction$c$, $c$From a fresh set of strings to fretwork and broken-guitar repairs, every job starts with an inspection and a clear quote that shows labour and parts separately. No work starts until you approve the quote, and extra costs always need your approval.
$c$, false, false),
  ($c$sell-intro$c$, $c$Sell or give away introduction$c$, $c$Have a guitar you no longer play? We accept working, broken and incomplete guitars, and guitars needing repair — and you are welcome to give one away free. The owner inspects every guitar in person before making an offer.
$c$, false, false),
  ($c$account-data$c$, $c$Account deletion and data export$c$, $c$**Draft for owner review.**

## Download your data

Signed-in customers can download a copy of their personal information at any time from **My account → Privacy & data → Download my data**. The file (JSON format) includes your profile, wishlist, reservations, enquiries, offers, seller submissions, repairs, quotes, reviews, notifications and payment records linked to your account.

## Delete your account

You can delete your account from **My account → Privacy & data**. You will be asked to confirm.

When you delete your account:

- Your login, profile, wishlist, notifications, stock alerts and reviews are **deleted**.
- Enquiries, offers, reservations and submissions that did **not** lead to a completed transaction have your contact details **removed** (anonymised).
- Records of **completed sales, purchases, repairs and recorded payments** are **kept** because we are required to keep business and tax records. They are unlinked from your account but retain the name and contact details needed for the record. We keep them only as long as the law requires.

## When deletion has to wait

To protect you and your property, you cannot delete your account online while:

- A repair is in progress or your guitar is with us, or
- You have an active reservation.

Please contact us on {{whatsapp}} or {{contact_email}} in these cases.
$c$, true, true),
  ($c$collection-reservation$c$, $c$Collection and reservation policy$c$, $c$**Draft for owner review.**

## Collection only

- All purchases are **collected** in the {{collection_area}} area. We do not deliver or ship.
- We never publish a private street address. Once your purchase or reservation is approved, the owner will share the exact collection arrangements with you privately by WhatsApp or email.
- Please bring the reference number shown in your account or confirmation email.

## How reservations work

1. Reservations are available to signed-in customers, from the guitar's page.
2. When our system accepts your request, the guitar is held for you for **{{reservation_hours}} hours**. The exact expiry date and time is shown on screen, in your account and in your confirmation email.
3. Only one person can reserve a guitar at a time. If someone else reserved it first, you will be told immediately.
4. A reservation is **not a payment** and **not a completed sale**. Please contact the owner to arrange payment and collection within the reservation period.
5. If the reservation period ends without the sale being completed, the reservation expires automatically and the guitar becomes available to others again.
6. The owner may extend, cancel or end a reservation, for example if arrangements have been agreed or if contact cannot be made.
7. You can cancel your own reservation at any time in **My account → Reservations**.
8. Each customer may hold a limited number of active reservations at one time.

## Payment

Payment is arranged privately with the owner (usually by EFT). The guitar is only treated as paid once the owner has confirmed that the funds have been received. Collection takes place after payment is confirmed, unless the owner agrees otherwise.
$c$, true, true),
  ($c$cookies$c$, $c$Cookie notice$c$, $c$**Draft for owner review.**

Cookies are small files stored by your browser. We keep their use to a minimum.

## Essential cookies (always on)

These are needed for the website to work and cannot be switched off:

| Cookie | Purpose | Duration |
| --- | --- | --- |
| `sb-…-auth-token` | Keeps you signed in to your account. | Until you sign out or the session expires |
| `g4u_cart` | Remembers the guitars in your enquiry cart. | 30 days |
| `g4u_consent` | Remembers your cookie choice. | 12 months |

## Optional analytics

If you choose **Allow analytics**, we count anonymous page visits to understand which pages are popular. We do not use advertising cookies or sell data. If the owner has enabled Cloudflare Web Analytics, it is only loaded after you allow analytics; Cloudflare's analytics does not use cookies.

If you choose **Essential only**, no analytics are recorded for your visits.

## Your browser storage

The "recently viewed" list is stored only in your own browser (local storage) and is never sent to us as personal data.

## Changing your choice

Use the **Cookie preferences** link in the footer at any time.
$c$, true, true),
  ($c$privacy$c$, $c$Privacy policy$c$, $c$**Draft for owner review.** This policy was prepared to reflect how this website actually works. It is not legal advice. Please have it checked against the Protection of Personal Information Act, 2013 (POPIA) by a suitably qualified professional before launch.

## 1. Who we are

{{business_name}} is a second-hand guitar shop and guitar repair service based in {{collection_area}}, South Africa. We are the "responsible party" for the personal information described in this policy.

Contact for privacy matters: {{contact_email}} or WhatsApp {{whatsapp}}.

## 2. What personal information we collect

We only collect what we need for each task:

- **Account details:** name, email address, optional WhatsApp number, contact preference and notification settings. If you sign in with Google, we receive your name and email address from Google.
- **Purchase enquiries, reservations and offers:** your name, contact details, the guitars you are interested in, the amount you offer and any message.
- **Selling or giving away a guitar:** your name, email address, WhatsApp number, suburb, details and photos of the guitar, and your asking price.
- **Repairs:** your name, contact details, details, photos or videos of your guitar and the problem, preferred dates, quotes, your quote decisions and repair progress notes.
- **Reviews:** the display name, rating and text you submit.
- **Payment records:** when you pay us directly (for example by EFT), we record the amount, date, method and a reference note. **We never collect card or bank login details through this website, and the website does not process payments.**
- **Technical information:** a salted, one-way scrambled version of your IP address is used briefly for spam and abuse protection. Page-visit counts are stored as daily totals without identifying you.

## 3. Why we use it

- To answer your enquiries and arrange viewings, reservations, purchases, repairs and collections.
- To inspect and make offers on guitars you want to sell.
- To keep you updated about your reservations, repairs and submissions.
- To send stock alerts you have asked for (you can switch these off at any time).
- To keep proper business, tax and accounting records.
- To protect the website against spam and misuse.

We rely on your consent, on the need to carry out steps you have asked for (such as a repair or a purchase), on our legitimate interests in running the business safely, and on legal obligations such as record keeping.

## 4. Who we share it with

We do not sell your personal information. We use these service providers to run the website, and they process information on our behalf:

- **Supabase** (database, accounts and file storage).
- **Netlify** (website hosting).
- **Our email provider** (to send notification emails).
- **Google** (only if you choose "Continue with Google").

Some of these providers store data outside South Africa. We choose reputable providers with appropriate safeguards. We may also disclose information where the law requires it.

## 5. Your private address is never published

We only publish our general collection area ({{collection_area}}). Exact collection or drop-off arrangements are shared privately once a transaction or repair has been approved.

## 6. How long we keep information

- Account information: until you delete your account.
- Enquiries, offers and reservations that did not lead to a sale: up to 24 months, then deleted or anonymised.
- Records linked to completed sales, purchases from sellers, repairs or recorded payments: kept for as long as required for tax and accounting purposes (generally at least five years), even if you delete your account. Your account link is removed, but the business record remains.

*Owner: confirm these periods with your accountant.*

## 7. Your rights

Under POPIA you may ask to access, correct or delete your personal information, object to certain processing, and withdraw consent. Signed-in customers can:

- Download a copy of their data from **My account → Privacy & data**.
- Edit their profile and notification settings.
- Delete their account (see "Account deletion and data export").

You may also contact us using the details above. If you are unhappy with how we handle your information, you may complain to the Information Regulator of South Africa (www.inforegulator.org.za).

## 8. Security

Accounts are protected by our authentication provider (passwords are never stored in readable form). Access to private records is restricted at database level so that customers can only see their own information and staff only see what their role requires. Uploaded seller and repair photos are stored privately.

## 9. Cookies

See our cookie notice for details. We use only essential cookies unless you agree to optional analytics.

## 10. Changes

We may update this policy. The latest version will always be on this page.
$c$, true, true),
  ($c$repair-terms$c$, $c$Repair quote, approval and warranty terms$c$, $c$**Draft for owner review. The warranty period and terms below must be confirmed by the owner before launch.**

## 1. Requests and drop-off

Submitting a repair request does **not** book or start any work. We review your request, then contact you privately to arrange drop-off in the {{collection_area}} area.

## 2. Quotes

- After inspecting your guitar, the owner prepares a personal quote showing **labour** and **parts** separately.
- **No repair work starts until you have approved the quote.** You can approve or decline on the website (in My account → Repairs) or by WhatsApp/email; the owner records your decision.
- Quotes are based on what can be seen at inspection. Some problems only become visible once work begins.

## 3. Extra costs

If additional work or parts are needed beyond the approved quote, we will send you an **additional-cost quote**. Work affected by the extra cost does not go ahead until you approve it. If you decline, we will discuss the options with you, which may include returning the guitar with only the approved work done.

## 4. Payment

Payment is arranged privately after the repair is completed (usually by EFT). The website does not take payments. Any deposit must be agreed directly with the owner. Payment is only recorded once the owner has confirmed it.

## 5. Collection

When the repair is complete we will contact you to arrange collection. Please collect your guitar within a reasonable time. *Owner: decide and add a storage/uncollected-items policy here.*

## 6. Warranty

{{warranty}}

The warranty covers the specific workmanship carried out. It does not cover normal wear (such as string wear or fret wear from playing), accidental damage, changes caused by climate or humidity, or later work by anyone else.

{{warranty_terms}}

## 7. Your rights

Nothing in these terms limits your rights under the Consumer Protection Act, including the implied warranty on repairs and parts where it applies.
$c$, true, true),
  ($c$returns$c$, $c$Returns, refunds and cancellation policy$c$, $c$**Draft for owner review.** Please confirm this policy against the Consumer Protection Act and the Electronic Communications and Transactions Act with a suitably qualified professional.

## Second-hand guitars

- Each guitar is described with its condition and known defects. Please read the listing carefully, ask questions and inspect the guitar when you collect it.
- Because every purchase is concluded and collected in person after private arrangements, please raise any concerns at collection, before completing the purchase.
- If a guitar has a defect that was not disclosed and that you could not reasonably have noticed, contact us within the period required by law. Under the Consumer Protection Act you may be entitled to a repair, replacement or refund for goods that are not of good quality, taking into account that the goods are second-hand and the defects disclosed to you.

*Owner: decide whether you offer any voluntary return period (for example, change of mind within a set number of days), and add it here.*

## Cancelling before payment

- You may cancel a reservation or enquiry at any time before payment. Cancelled reservations release the guitar to other customers.

## Refunds

- Approved refunds are paid by EFT to the account that made the payment, once the guitar has been returned in the same condition.
- Refunds are recorded manually by the owner.

## Repairs

- You may cancel a repair before approving the quote at no charge.
- After approving a quote, you may cancel; you may be asked to pay for work already done and parts already ordered.
- Problems with repair workmanship are handled under our repair warranty terms.

## Selling your guitar to us

- You may withdraw your guitar at any time before the handover is completed.
$c$, true, true),
  ($c$seller-terms$c$, $c$Seller submission and inspection terms$c$, $c$**Draft for owner review.**

## What we accept

We accept **complete or incomplete guitars** in any condition, including working guitars, broken guitars, guitars needing repair and guitars offered free of charge. We **do not accept loose parts** (such as necks, pickups or hardware) as standalone submissions.

## How it works

1. You submit details and photos of your guitar on the "Sell or give away" page, by WhatsApp ({{whatsapp}}) or by email ({{contact_email}}).
2. Submitting the form is an enquiry only. It does not create any obligation for you or for us.
3. We review your submission and may ask for more information or photos.
4. **The owner personally inspects every guitar before making an offer.** Any figure discussed before inspection is only an indication.
5. After inspection we may make an offer, which you can accept, decline or negotiate.
6. If you accept, handover and payment are arranged privately. If you are giving the guitar away, no payment is made.
7. You can track the status of your submission in your account if you submitted it while signed in.

## Your confirmation

By submitting a guitar you confirm that:

- You own the guitar or are authorised to sell or give it away.
- To your knowledge, the guitar is not stolen and is not subject to any finance agreement or claim.
- The information and photos you provide are accurate.

We may ask for proof of identity or ownership and may decline any guitar at our discretion. We may report suspected stolen goods to the authorities, as required by law.

*Owner: confirm with a professional whether the Second-Hand Goods Act, 2009 applies to your business and what records you must keep.*

## Your information

Your contact details and photos are private and only visible to the owner and authorised staff. See our privacy policy.
$c$, true, true),
  ($c$terms$c$, $c$Terms and conditions$c$, $c$**Draft for owner review.** These terms reflect how the website and business work, but they are not legal advice. Please have them reviewed against South African law, including the Consumer Protection Act, 2008 and the Electronic Communications and Transactions Act, 2002, before launch.

## 1. About these terms

These terms apply to your use of the {{business_name}} website and to purchases, reservations, offers, seller submissions and repairs arranged through it. {{business_name}} operates from {{collection_area}}, South Africa. Contact: {{contact_email}} / WhatsApp {{whatsapp}}.

## 2. No online payments

- The website **does not take payments**. There is no card processing, payment gateway or online checkout.
- Submitting an enquiry, reservation or offer **does not mean you have paid** and **does not mean a sale is final**.
- Payment is arranged directly with the owner, usually by EFT/bank transfer or another method the owner approves.
- A payment is only treated as received once the owner has independently confirmed it (for example, the funds have cleared in the bank account). Proof-of-payment screenshots alone are not confirmation.
- Never send payment to any account details that did not come directly from the owner. If in doubt, confirm by WhatsApp on {{whatsapp}}.

## 3. Second-hand goods

All guitars are second-hand. Each listing describes the condition and any known defects as honestly and accurately as we can. Please read the full listing, ask questions and, where possible, inspect the guitar on collection. Prices are in South African rand (ZAR).

## 4. Collection only

We do not offer delivery or shipping. All purchases are collected in the {{collection_area}} area. Exact collection details are shared privately once a purchase or reservation has been approved.

## 5. Reservations, offers and enquiries

- Reservations are explained in our Collection and reservation policy.
- Offers are not binding on us until the owner accepts them in writing (WhatsApp or email).
- We may decline any enquiry, offer or reservation, for example if a guitar has already been sold.

## 6. Accounts

You are responsible for keeping your login details safe. We may suspend accounts used for abuse, spam or fraud.

## 7. Reviews

Reviews are moderated before publication. We publish honest reviews, positive or negative, but may decline reviews that are abusive, unlawful, contain personal information or are unrelated to our business.

## 8. Liability

Nothing in these terms limits rights you have under the Consumer Protection Act or other law that cannot be excluded. Otherwise, our liability is limited to the amount you paid for the relevant guitar or service.

## 9. Changes and governing law

We may update these terms. South African law applies.
$c$, true, true)
on conflict (key) do nothing;

insert into public.faqs (question, answer, sort_order)
select v.question, v.answer, v.sort_order from (values
  ($c$Can I pay on the website?$c$, $c$No. The website does not take payments. You arrange payment directly with the owner, usually by EFT. Nothing is treated as paid until the owner has confirmed the funds have been received.$c$, 10),
  ($c$Do you deliver or ship guitars?$c$, $c$No — all purchases are collected in the Sandringham, Johannesburg area. Exact collection details are shared privately once your purchase or reservation is approved.$c$, 20),
  ($c$How long does a reservation last?$c$, $c$A reservation holds a guitar for {{reservation_hours}} hours. The exact expiry time is shown on screen and in your account. A reservation is not a payment or a completed sale.$c$, 30),
  ($c$Can I make an offer on a guitar?$c$, $c$Yes. Use the "Make an offer" button on the guitar's page. Offers are reviewed by the owner and are never accepted automatically; we'll reply by WhatsApp or email.$c$, 40),
  ($c$Do you buy broken or incomplete guitars?$c$, $c$Yes. We accept working, broken and incomplete guitars, and guitars that need repair. We do not accept loose parts on their own. Every guitar is inspected in person before we make an offer.$c$, 50),
  ($c$Can I give a guitar away?$c$, $c$Yes. Tick the "I'd like to give this guitar away free" option on the Sell page.$c$, 60),
  ($c$Will repair work start as soon as I submit the form?$c$, $c$No. We first arrange drop-off, inspect the guitar and send you a quote with labour and parts shown separately. Work only starts once you approve the quote, and any extra cost also needs your approval.$c$, 70),
  ($c$How do I track my repair or submission?$c$, $c$Create an account (or sign in) before submitting, and you'll see live status updates under My account. You can also ask for an update on WhatsApp.$c$, 80),
  ($c$Is there a repair warranty?$c$, $c$Yes — the warranty period and terms are set out in our Repair quote, approval and warranty terms.$c$, 90),
  ($c$Where are you based?$c$, $c$Sandringham, Johannesburg. For privacy and safety, we don't publish a street address; arrangements are shared privately.$c$, 100)
) as v (question, answer, sort_order)
where not exists (select 1 from public.faqs);


-- ===== migration history (for the Supabase CLI) =====
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations (version, name) values ('20261030000001', 'core_schema') on conflict do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20261030000002', 'security') on conflict do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20261030000003', 'workflows') on conflict do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20261030000004', 'seed_content') on conflict do nothing;
