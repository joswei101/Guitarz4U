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
