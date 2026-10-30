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
