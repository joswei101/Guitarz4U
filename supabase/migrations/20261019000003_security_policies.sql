-- =============================================================================
-- Guitarz4U row level security, column privileges and storage policies
-- Every table has RLS enabled. Anything not explicitly allowed is denied.
-- =============================================================================

-- Helper: does the current user own the workflow entity?
create or replace function public.owns_entity(p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_entity_type
    when 'purchase_request' then exists (select 1 from public.purchase_requests where id = p_entity_id and user_id = (select auth.uid()))
    when 'reservation' then exists (select 1 from public.reservations where id = p_entity_id and user_id = (select auth.uid()))
    when 'seller_submission' then exists (select 1 from public.seller_submissions where id = p_entity_id and user_id = (select auth.uid()))
    when 'repair_booking' then exists (select 1 from public.repair_bookings where id = p_entity_id and user_id = (select auth.uid()))
    else false
  end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_private enable row level security;
alter table public.product_images enable row level security;
alter table public.wishlists enable row level security;
alter table public.availability_alerts enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.purchase_request_items enable row level security;
alter table public.reservations enable row level security;
alter table public.seller_submissions enable row level security;
alter table public.seller_submission_images enable row level security;
alter table public.seller_offers enable row level security;
alter table public.repair_bookings enable row level security;
alter table public.repair_images enable row level security;
alter table public.status_updates enable row level security;
alter table public.admin_notes enable row level security;
alter table public.reviews enable row level security;
alter table public.review_reports enable row level security;
alter table public.enquiries enable row level security;
alter table public.notifications enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.data_requests enable row level security;
alter table public.analytics_events enable row level security;
alter table public.rate_limits enable row level security;

-- Profiles ------------------------------------------------------------------
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- Nobody can change their role (or email/anonymisation flag) through the API.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, preferred_contact) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- Catalogue -----------------------------------------------------------------
create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin write" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "brands: public read" on public.brands for select using (true);
create policy "brands: admin write" on public.brands for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "products: public read of listed items" on public.products
  for select using (status in ('published', 'reserved') or public.is_admin());
create policy "products: admin insert" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "products: admin update" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products: admin delete" on public.products
  for delete to authenticated using (public.is_admin());

create policy "product_private: admin only" on public.product_private for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.product_private from anon;

create policy "product_images: read when product visible" on public.product_images
  for select using (
    public.is_admin() or exists (
      select 1 from public.products p where p.id = product_id and p.status in ('published', 'reserved')
    )
  );
create policy "product_images: admin write" on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Wishlists and alerts ------------------------------------------------------
create policy "wishlists: own" on public.wishlists for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "wishlists: add own" on public.wishlists for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "wishlists: remove own" on public.wishlists for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "alerts: read own" on public.availability_alerts for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "alerts: create own" on public.availability_alerts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "alerts: update own" on public.availability_alerts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "alerts: delete own" on public.availability_alerts for delete to authenticated
  using (user_id = (select auth.uid()));
revoke update on public.availability_alerts from anon, authenticated;
grant update (is_active) on public.availability_alerts to authenticated;

-- Purchase requests (created only through submit_purchase_request) -----------
create policy "purchase_requests: read own or admin" on public.purchase_requests
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "purchase_requests: admin update" on public.purchase_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- Status, payment and completion fields change only via admin functions.
revoke insert, update, delete on public.purchase_requests from anon, authenticated;
grant update (contact_name, contact_email, contact_phone, preferred_contact) on public.purchase_requests to authenticated;

create policy "purchase_request_items: read own or admin" on public.purchase_request_items
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.purchase_requests pr where pr.id = request_id and pr.user_id = (select auth.uid())
    )
  );
revoke insert, update, delete on public.purchase_request_items from anon, authenticated;

-- Reservations --------------------------------------------------------------
create policy "reservations: read own or admin" on public.reservations
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.reservations from anon, authenticated;

-- Seller submissions ----------------------------------------------------------
create policy "seller_submissions: read own or admin" on public.seller_submissions
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.seller_submissions from anon, authenticated;

create policy "seller_submission_images: read own or admin" on public.seller_submission_images
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.seller_submissions s where s.id = submission_id and s.user_id = (select auth.uid())
    )
  );
revoke insert, update, delete on public.seller_submission_images from anon, authenticated;

create policy "seller_offers: read own or admin" on public.seller_offers
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.seller_submissions s where s.id = submission_id and s.user_id = (select auth.uid())
    )
  );
revoke insert, update, delete on public.seller_offers from anon, authenticated;

-- Repairs -------------------------------------------------------------------
create policy "repair_bookings: read own or admin" on public.repair_bookings
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.repair_bookings from anon, authenticated;

create policy "repair_images: read own or admin" on public.repair_images
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.repair_bookings b where b.id = booking_id and b.user_id = (select auth.uid())
    )
  );
revoke insert, update, delete on public.repair_images from anon, authenticated;

-- Status history and private notes -------------------------------------------
create policy "status_updates: read own or admin" on public.status_updates
  for select to authenticated using (public.is_admin() or public.owns_entity(entity_type, entity_id));
revoke insert, update, delete on public.status_updates from anon, authenticated;

create policy "admin_notes: admin read" on public.admin_notes
  for select to authenticated using (public.is_admin());
create policy "admin_notes: admin delete" on public.admin_notes
  for delete to authenticated using (public.is_admin());
revoke all on public.admin_notes from anon;
revoke insert, update on public.admin_notes from authenticated;

-- Reviews -------------------------------------------------------------------
create policy "reviews: public read approved" on public.reviews
  for select using (status = 'approved' or user_id = (select auth.uid()) or public.is_admin());
create policy "reviews: admin delete" on public.reviews
  for delete to authenticated using (public.is_admin());
revoke insert, update on public.reviews from anon, authenticated;

create policy "review_reports: admin read" on public.review_reports
  for select to authenticated using (public.is_admin());
create policy "review_reports: admin update" on public.review_reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.review_reports from anon, authenticated;
revoke update on public.review_reports from anon;

-- Enquiries -----------------------------------------------------------------
create policy "enquiries: read own or admin" on public.enquiries
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "enquiries: admin update" on public.enquiries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.enquiries from anon, authenticated;
revoke update on public.enquiries from anon;

-- Notifications -------------------------------------------------------------
create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: mark own read" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: delete own" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Site settings -------------------------------------------------------------
create policy "site_settings: public read" on public.site_settings
  for select using (is_public or public.is_admin());
create policy "site_settings: admin write" on public.site_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Audit log: readable by admins, never editable through the API ---------------
create policy "audit_logs: admin read" on public.audit_logs
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.audit_logs from anon, authenticated;

-- Privacy requests ----------------------------------------------------------
create policy "data_requests: read own or admin" on public.data_requests
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "data_requests: admin update" on public.data_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.data_requests from anon, authenticated;

-- Analytics -----------------------------------------------------------------
create policy "analytics: admin read" on public.analytics_events
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.analytics_events from anon, authenticated;

-- Rate limits: no API access at all ------------------------------------------
revoke all on public.rate_limits from anon, authenticated;

-- =============================================================================
-- Storage
--   product-images  : public read, administrator write
--   customer-uploads: private; customers upload into their own folder
--                     ({user_id}/...), readable by the owner and administrators
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('customer-uploads', 'customer-uploads', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "product-images: public read" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "product-images: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "product-images: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "product-images: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

create policy "customer-uploads: owner insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'customer-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "customer-uploads: owner or admin read" on storage.objects
  for select to authenticated using (
    bucket_id = 'customer-uploads' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );
create policy "customer-uploads: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'customer-uploads' and public.is_admin());

-- =============================================================================
-- Baseline reference data required in every environment
-- =============================================================================
insert into public.categories (slug, name, description, sort_order) values
  ('electric', 'Electric guitars', 'Pre-owned electric guitars, from beginner instruments to classics.', 1),
  ('bass', 'Bass guitars', 'Pre-owned four-, five- and six-string bass guitars.', 2),
  ('acoustic', 'Acoustic guitars', 'Pre-owned steel-string acoustic and electro-acoustic guitars.', 3),
  ('classical', 'Classical guitars', 'Pre-owned nylon-string classical guitars.', 4)
on conflict (slug) do nothing;

insert into public.site_settings (key, value, is_public) values
  ('contact', jsonb_build_object(
    'whatsapp_number', '27648567019',
    'whatsapp_display', '064 856 7019',
    'email', 'Joshuaweinfas@gmail.com',
    'social_handle', 'Shuaweinfas',
    'social_links', jsonb_build_array(),
    'location_label', 'Sandringham, Johannesburg, Gauteng',
    'hours_notice', 'Closed on Saturdays'
  ), true),
  ('reservations', jsonb_build_object('hold_days', 3), true),
  ('announcement', jsonb_build_object('enabled', false, 'text', ''), true),
  ('repair_prices', jsonb_build_object('show', false, 'items', jsonb_build_array()), true)
on conflict (key) do nothing;
