-- =============================================================================
-- Guitarz4U functions, workflows and triggers
--
-- Customer actions that must be validated (purchase requests, reservations,
-- submissions, bookings, reviews, enquiries) go through SECURITY DEFINER
-- functions that check auth.uid(), rate limits and current inventory state.
-- Administrator workflow changes also go through functions so that every
-- status change records a customer-visible update, a notification and an
-- audit entry in a single transaction.
--
-- IMPORTANT: none of these functions take, store or verify payments. Payment
-- is arranged privately by EFT; only an administrator can record that funds
-- were received after checking their own bank account.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'LOGIN_REQUIRED' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile creation and email sync from auth.users
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 120), ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 30), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
-- Rate limiting (fixed window). Raises RATE_LIMITED when exceeded.
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as rl (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.hits + 1 end,
        window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning hits into v_hits;

  if v_hits > p_max then
    raise exception 'RATE_LIMITED' using errcode = 'P0001', hint = 'Please wait a while before trying again.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Status labels (used in notifications)
-- ---------------------------------------------------------------------------
create or replace function public.status_label(p_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'submitted' then 'Request submitted'
    when 'under_review' then 'Under review'
    when 'awaiting_customer' then 'Awaiting your response'
    when 'approved' then 'Approved'
    when 'awaiting_eft' then 'Awaiting private EFT payment'
    when 'payment_confirmed' then 'Payment confirmed by Guitarz4U'
    when 'ready_for_collection' then 'Ready for collection'
    when 'completed' then 'Completed'
    when 'declined' then 'Declined'
    when 'cancelled' then 'Cancelled'
    when 'requested' then 'Reservation requested'
    when 'expired' then 'Expired'
    when 'fulfilled' then 'Fulfilled'
    when 'more_info_requested' then 'More information requested'
    when 'offer_made' then 'Offer made'
    when 'offer_accepted' then 'Offer accepted'
    when 'offer_declined' then 'Offer declined'
    when 'rejected' then 'Not accepted'
    when 'withdrawn' then 'Withdrawn'
    when 'awaiting_review' then 'Awaiting review'
    when 'awaiting_info' then 'Awaiting more information'
    when 'quote_provided' then 'Quote provided'
    when 'in_progress' then 'In progress'
    when 'awaiting_collection' then 'Awaiting collection'
    else initcap(replace(p_status, '_', ' '))
  end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications and audit helpers (internal; not callable by clients)
-- ---------------------------------------------------------------------------
create or replace function public.notify_user(p_user_id uuid, p_title text, p_body text, p_link text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, title, body, link)
  values (p_user_id, left(p_title, 200), left(coalesce(p_body, ''), 1000), p_link);
end;
$$;

create or replace function public.notify_admins(p_title text, p_body text, p_link text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, title, body, link)
  select p.id, left(p_title, 200), left(coalesce(p_body, ''), 1000), p_link
  from public.profiles p
  where p.role = 'admin';
end;
$$;

create or replace function public.write_audit(p_action text, p_entity_type text, p_entity_id text, p_details jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  values (
    v_uid,
    (select email from public.profiles where id = v_uid),
    p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

-- Generic row audit trigger: records which columns changed (old -> new).
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_key text;
  v_id text;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_id := v_new ->> coalesce(tg_argv[0], 'id');
    perform public.write_audit('insert', tg_table_name, v_id, jsonb_build_object('row', v_new - 'description' - 'body'));
    return new;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key <> 'updated_at' and (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key));
      end if;
    end loop;
    if v_changes <> '{}'::jsonb then
      v_id := v_new ->> coalesce(tg_argv[0], 'id');
      perform public.write_audit('update', tg_table_name, v_id, v_changes);
    end if;
    return new;
  else
    v_old := to_jsonb(old);
    v_id := v_old ->> coalesce(tg_argv[0], 'id');
    perform public.write_audit('delete', tg_table_name, v_id, jsonb_build_object('row', v_old - 'description' - 'body'));
    return old;
  end if;
end;
$$;

create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_row_change();
create trigger audit_product_private after insert or update or delete on public.product_private
  for each row execute function public.audit_row_change('product_id');
create trigger audit_purchase_requests after update or delete on public.purchase_requests
  for each row execute function public.audit_row_change();
create trigger audit_reservations after update or delete on public.reservations
  for each row execute function public.audit_row_change();
create trigger audit_seller_submissions after update or delete on public.seller_submissions
  for each row execute function public.audit_row_change();
create trigger audit_seller_offers after insert or update or delete on public.seller_offers
  for each row execute function public.audit_row_change();
create trigger audit_repair_bookings after update or delete on public.repair_bookings
  for each row execute function public.audit_row_change();
create trigger audit_reviews after update or delete on public.reviews
  for each row execute function public.audit_row_change();
create trigger audit_site_settings after insert or update or delete on public.site_settings
  for each row execute function public.audit_row_change('key');
create trigger audit_brands after insert or update or delete on public.brands
  for each row execute function public.audit_row_change();

-- Role changes are always audited.
create or replace function public.audit_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    perform public.write_audit('role_change', 'profiles', new.id::text,
      jsonb_build_object('from', old.role, 'to', new.role, 'email', new.email));
  end if;
  return new;
end;
$$;
create trigger audit_profile_role after update of role on public.profiles
  for each row execute function public.audit_role_change();

-- ---------------------------------------------------------------------------
-- Product status bookkeeping + availability alerts
-- ---------------------------------------------------------------------------
create or replace function public.product_status_stamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'sold' and (tg_op = 'INSERT' or old.status is distinct from 'sold') then
    new.sold_at := coalesce(new.sold_at, now());
    new.is_featured := false;
  end if;
  if new.status <> 'sold' then
    new.sold_at := null;
  end if;
  return new;
end;
$$;
create trigger products_status_stamps before insert or update of status on public.products
  for each row execute function public.product_status_stamps();

create or replace function public.notify_availability_alerts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link text := '/shop/' || new.slug;
  r record;
begin
  if new.status <> 'published' or (tg_op = 'UPDATE' and old.status = 'published') then
    return new;
  end if;

  -- Product-specific alerts (e.g. a reserved guitar became available again)
  for r in
    select a.id, a.user_id from public.availability_alerts a
    where a.is_active and a.product_id = new.id
  loop
    perform public.notify_user(r.user_id, 'Now available: ' || new.title,
      'A guitar you asked to be notified about is available again. Availability is not guaranteed until Guitarz4U confirms your request.', v_link);
    update public.availability_alerts set is_active = false, last_notified_at = now() where id = r.id;
  end loop;

  -- New-arrival alerts by category and/or brand (only on first publication)
  if tg_op = 'INSERT' or old.published_at is null then
    for r in
      select a.id, a.user_id from public.availability_alerts a
      where a.is_active and a.product_id is null
        and (a.category_id is null or a.category_id = new.category_id)
        and (a.brand_id is null or a.brand_id = new.brand_id)
    loop
      perform public.notify_user(r.user_id, 'New arrival: ' || new.title,
        'A new listing matches one of your alerts.', v_link);
      update public.availability_alerts set last_notified_at = now() where id = r.id;
    end loop;
  end if;
  return new;
end;
$$;
create trigger products_availability_alerts after insert or update of status on public.products
  for each row execute function public.notify_availability_alerts();

-- Returns a product to 'published' if it is reserved but no longer held by
-- an approved reservation or an active purchase request.
create or replace function public.release_product_if_free(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_product_id is null then
    return;
  end if;
  if exists (select 1 from public.reservations r where r.product_id = p_product_id and r.status = 'approved') then
    return;
  end if;
  if exists (
    select 1 from public.purchase_request_items i
    join public.purchase_requests pr on pr.id = i.request_id
    where i.product_id = p_product_id
      and pr.status in ('approved', 'awaiting_eft', 'payment_confirmed', 'ready_for_collection')
  ) then
    return;
  end if;
  update public.products set status = 'published' where id = p_product_id and status = 'reserved';
end;
$$;

-- ---------------------------------------------------------------------------
-- Internal: record a customer-visible status update + notification
-- ---------------------------------------------------------------------------
create or replace function public.record_status_update(
  p_entity_type text, p_entity_id uuid, p_status text, p_message text,
  p_user_id uuid, p_title text, p_link text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.status_updates (entity_type, entity_id, status, message, created_by)
  values (p_entity_type, p_entity_id, p_status, nullif(trim(p_message), ''), (select auth.uid()));

  perform public.notify_user(
    p_user_id,
    p_title,
    'Status: ' || public.status_label(p_status) || coalesce(' — ' || nullif(trim(p_message), ''), ''),
    p_link
  );
end;
$$;

-- =============================================================================
-- CUSTOMER WORKFLOWS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Purchase requests
-- ---------------------------------------------------------------------------
create or replace function public.submit_purchase_request(
  p_product_ids uuid[],
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_preferred_contact public.contact_method,
  p_message text
)
returns table (id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_request public.purchase_requests;
  v_product record;
  v_total numeric(12, 2) := 0;
  v_count integer;
begin
  perform public.check_rate_limit('purchase_request:' || v_uid, 5, 3600);

  p_product_ids := array(select distinct unnest(p_product_ids));
  v_count := coalesce(cardinality(p_product_ids), 0);
  if v_count = 0 then
    raise exception 'EMPTY_REQUEST';
  end if;
  if v_count > 10 then
    raise exception 'TOO_MANY_ITEMS';
  end if;
  if coalesce(trim(p_contact_email), '') = '' and coalesce(trim(p_contact_phone), '') = '' then
    raise exception 'CONTACT_REQUIRED';
  end if;

  -- Lock the products so two simultaneous requests see consistent state.
  for v_product in
    select p.id, p.title, p.price, p.status from public.products p
    where p.id = any (p_product_ids)
    for update
  loop
    if v_product.status = 'published' then
      null;
    elsif v_product.status = 'reserved' and exists (
      select 1 from public.reservations r
      where r.product_id = v_product.id and r.user_id = v_uid and r.status = 'approved'
    ) then
      null; -- reserved for this customer
    else
      raise exception 'PRODUCT_UNAVAILABLE' using detail = v_product.title;
    end if;

    if exists (
      select 1 from public.purchase_request_items i
      join public.purchase_requests pr on pr.id = i.request_id
      where i.product_id = v_product.id and pr.user_id = v_uid
        and pr.status not in ('completed', 'declined', 'cancelled')
    ) then
      raise exception 'DUPLICATE_REQUEST' using detail = v_product.title;
    end if;
    v_total := v_total + v_product.price;
  end loop;

  if (select count(*) from public.products p where p.id = any (p_product_ids)) <> v_count then
    raise exception 'PRODUCT_UNAVAILABLE' using detail = 'One or more items no longer exist';
  end if;

  insert into public.purchase_requests (user_id, contact_name, contact_email, contact_phone, preferred_contact, customer_message, estimated_total)
  values (
    v_uid, trim(p_contact_name), nullif(trim(lower(p_contact_email)), ''), nullif(trim(p_contact_phone), ''),
    coalesce(p_preferred_contact, 'whatsapp'), left(coalesce(trim(p_message), ''), 2000), v_total
  )
  returning * into v_request;

  insert into public.purchase_request_items (request_id, product_id, title_snapshot, price_snapshot)
  select v_request.id, p.id, p.title, p.price from public.products p where p.id = any (p_product_ids);

  insert into public.status_updates (entity_type, entity_id, status, message, created_by)
  values ('purchase_request', v_request.id, 'submitted', 'Purchase request received. No payment has been taken.', v_uid);

  perform public.notify_user(v_uid, 'Purchase request ' || v_request.reference || ' submitted',
    'We will review your request and contact you to confirm availability. No payment has been taken and your purchase is not confirmed yet.',
    '/account/requests/' || v_request.id);
  perform public.notify_admins('New purchase request ' || v_request.reference,
    v_request.contact_name || ' requested ' || v_count || ' item(s), estimated R' || to_char(v_total, 'FM999G999G990D00'),
    '/admin/requests/' || v_request.id);

  return query select v_request.id, v_request.reference;
end;
$$;

create or replace function public.cancel_purchase_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_request public.purchase_requests;
  v_item record;
begin
  select * into v_request from public.purchase_requests where id = p_request_id and user_id = v_uid for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_request.status not in ('submitted', 'under_review', 'awaiting_customer', 'approved', 'awaiting_eft') then
    raise exception 'CANNOT_CANCEL' using detail = 'Please contact Guitarz4U directly to cancel at this stage.';
  end if;

  update public.purchase_requests set status = 'cancelled' where id = p_request_id;
  for v_item in select product_id from public.purchase_request_items where request_id = p_request_id loop
    perform public.release_product_if_free(v_item.product_id);
  end loop;

  insert into public.status_updates (entity_type, entity_id, status, message, created_by)
  values ('purchase_request', p_request_id, 'cancelled', 'Cancelled by customer.', v_uid);
  perform public.notify_admins('Purchase request ' || v_request.reference || ' cancelled by customer', '', '/admin/requests/' || p_request_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reservations
-- ---------------------------------------------------------------------------
create or replace function public.request_reservation(
  p_product_id uuid,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_preferred_contact public.contact_method,
  p_message text
)
returns table (id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_product record;
  v_res public.reservations;
begin
  perform public.check_rate_limit('reservation:' || v_uid, 5, 3600);

  if coalesce(trim(p_contact_email), '') = '' and coalesce(trim(p_contact_phone), '') = '' then
    raise exception 'CONTACT_REQUIRED';
  end if;

  select p.id, p.title, p.status into v_product from public.products p where p.id = p_product_id for update;
  if not found or v_product.status <> 'published' then
    raise exception 'PRODUCT_UNAVAILABLE' using detail = coalesce(v_product.title, 'This item');
  end if;
  if exists (select 1 from public.reservations r where r.product_id = p_product_id and r.user_id = v_uid and r.status in ('requested', 'approved')) then
    raise exception 'DUPLICATE_REQUEST' using detail = v_product.title;
  end if;

  insert into public.reservations (user_id, product_id, product_title_snapshot, contact_name, contact_email, contact_phone, preferred_contact, customer_message)
  values (v_uid, p_product_id, v_product.title, trim(p_contact_name), nullif(trim(lower(p_contact_email)), ''),
          nullif(trim(p_contact_phone), ''), coalesce(p_preferred_contact, 'whatsapp'), left(coalesce(trim(p_message), ''), 2000))
  returning * into v_res;

  insert into public.status_updates (entity_type, entity_id, status, message, created_by)
  values ('reservation', v_res.id, 'requested', 'Reservation requested. It is not confirmed until Guitarz4U approves it.', v_uid);

  perform public.notify_user(v_uid, 'Reservation request ' || v_res.reference || ' received',
    'Your reservation is not confirmed until Guitarz4U approves it.', '/account/reservations');
  perform public.notify_admins('New reservation request ' || v_res.reference,
    v_res.contact_name || ' would like to reserve ' || v_product.title, '/admin/reservations');

  return query select v_res.id, v_res.reference;
end;
$$;

create or replace function public.cancel_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_res public.reservations;
begin
  select * into v_res from public.reservations where id = p_reservation_id and user_id = v_uid for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_res.status not in ('requested', 'approved') then
    raise exception 'CANNOT_CANCEL';
  end if;
  update public.reservations set status = 'cancelled' where id = p_reservation_id;
  perform public.release_product_if_free(v_res.product_id);
  insert into public.status_updates (entity_type, entity_id, status, message, created_by)
  values ('reservation', p_reservation_id, 'cancelled', 'Cancelled by customer.', v_uid);
  perform public.notify_admins('Reservation ' || v_res.reference || ' cancelled by customer', v_res.product_title_snapshot, '/admin/reservations');
end;
$$;

-- Expires approved reservations whose hold period has passed.
create or replace function public.expire_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select * from public.reservations
    where status = 'approved' and expires_at is not null and expires_at < now()
    for update
  loop
    update public.reservations set status = 'expired' where id = r.id;
    perform public.release_product_if_free(r.product_id);
    insert into public.status_updates (entity_type, entity_id, status, message)
    values ('reservation', r.id, 'expired', 'The reservation hold period ended.');
    perform public.notify_user(r.user_id, 'Reservation ' || r.reference || ' expired',
      'The hold period for ' || r.product_title_snapshot || ' has ended.', '/account/reservations');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seller submissions
-- ---------------------------------------------------------------------------
create or replace function public.submit_seller_submission(
  p_seller_name text,
  p_contact_number text,
  p_email text,
  p_brand text,
  p_model text,
  p_category_id smallint,
  p_condition public.product_condition,
  p_is_working public.working_state,
  p_fault_description text,
  p_asking_price numeric,
  p_notes text,
  p_privacy_acknowledged boolean,
  p_not_loose_parts boolean,
  p_image_paths text[]
)
returns table (id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_sub public.seller_submissions;
  v_path text;
begin
  perform public.check_rate_limit('seller_submission:' || v_uid, 5, 86400);

  if not coalesce(p_privacy_acknowledged, false) then
    raise exception 'PRIVACY_ACK_REQUIRED';
  end if;
  if not coalesce(p_not_loose_parts, false) then
    raise exception 'LOOSE_PARTS_NOT_ACCEPTED';
  end if;
  if coalesce(cardinality(p_image_paths), 0) > 8 then
    raise exception 'TOO_MANY_IMAGES';
  end if;
  foreach v_path in array coalesce(p_image_paths, '{}') loop
    if split_part(v_path, '/', 1) <> v_uid::text or v_path like '%..%' then
      raise exception 'INVALID_IMAGE_PATH';
    end if;
  end loop;

  insert into public.seller_submissions (
    user_id, seller_name, contact_number, email, brand, model, category_id, condition, is_working,
    fault_description, asking_price, notes, privacy_acknowledged, not_loose_parts_confirmed
  ) values (
    v_uid, trim(p_seller_name), trim(p_contact_number), nullif(trim(lower(p_email)), ''), trim(p_brand), trim(p_model),
    p_category_id, p_condition, p_is_working, left(coalesce(trim(p_fault_description), ''), 3000),
    p_asking_price, left(coalesce(trim(p_notes), ''), 3000), true, true
  ) returning * into v_sub;

  insert into public.seller_submission_images (submission_id, storage_path)
  select v_sub.id, x from unnest(coalesce(p_image_paths, '{}')) as x;

  insert into public.status_updates (entity_type, entity_id, status, message, created_by)
  values ('seller_submission', v_sub.id, 'submitted', 'Submission received. Guitarz4U has not yet agreed to buy this guitar.', v_uid);

  perform public.notify_user(v_uid, 'Seller submission ' || v_sub.reference || ' received',
    'Thank you. Guitarz4U will review your guitar personally. Receiving your submission is not an agreement to buy.',
    '/account/selling/' || v_sub.id);
  perform public.notify_admins('New seller submission ' || v_sub.reference,
    v_sub.seller_name || ': ' || v_sub.brand || ' ' || v_sub.model, '/admin/submissions/' || v_sub.id);

  return query select v_sub.id, v_sub.reference;
end;
$$;

create or replace function public.withdraw_seller_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_sub public.seller_submissions;
begin
  select * into v_sub from public.seller_submissions where id = p_submission_id and user_id = v_uid for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_sub.status in ('completed', 'withdrawn', 'rejected') then
    raise exception 'CANNOT_CANCEL';
  end if;
  update public.seller_submissions set status = 'withdrawn' where id = p_submission_id;
  update public.seller_offers set status = 'withdrawn' where submission_id = p_submission_id and status = 'pending';
  insert into public.status_updates (entity_type, entity_id, status, message, created_by)
  values ('seller_submission', p_submission_id, 'withdrawn', 'Withdrawn by seller.', v_uid);
  perform public.notify_admins('Seller submission ' || v_sub.reference || ' withdrawn', '', '/admin/submissions/' || p_submission_id);
end;
$$;

create or replace function public.respond_seller_offer(p_offer_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_offer public.seller_offers;
  v_sub public.seller_submissions;
  v_new_status public.seller_status;
begin
  select o.* into v_offer from public.seller_offers o
  join public.seller_submissions s on s.id = o.submission_id
  where o.id = p_offer_id and s.user_id = v_uid
  for update of o;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'OFFER_NOT_PENDING';
  end if;
  select * into v_sub from public.seller_submissions where id = v_offer.submission_id for update;

  update public.seller_offers
    set status = case when p_accept then 'accepted'::public.offer_status else 'declined'::public.offer_status end,
        responded_at = now()
  where id = p_offer_id;

  v_new_status := case when p_accept then 'offer_accepted'::public.seller_status else 'offer_declined'::public.seller_status end;
  update public.seller_submissions set status = v_new_status where id = v_sub.id;

  insert into public.status_updates (entity_type, entity_id, status, message, created_by)
  values ('seller_submission', v_sub.id, v_new_status::text,
    case when p_accept then 'Seller accepted the offer of R' || to_char(v_offer.amount, 'FM999G999G990D00') || '. Guitarz4U will contact you to arrange the next steps.'
         else 'Seller declined the offer.' end, v_uid);
  perform public.notify_admins('Offer ' || case when p_accept then 'accepted' else 'declined' end || ' for ' || v_sub.reference,
    v_sub.brand || ' ' || v_sub.model || ' — R' || to_char(v_offer.amount, 'FM999G999G990D00'), '/admin/submissions/' || v_sub.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Repair bookings
-- ---------------------------------------------------------------------------
create or replace function public.submit_repair_booking(
  p_contact_name text,
  p_contact_phone text,
  p_contact_email text,
  p_preferred_contact public.contact_method,
  p_guitar_brand text,
  p_guitar_model text,
  p_category_id smallint,
  p_services text[],
  p_problem_description text,
  p_preferred_date date,
  p_notes text,
  p_image_paths text[]
)
returns table (id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_booking public.repair_bookings;
  v_path text;
begin
  perform public.check_rate_limit('repair_booking:' || v_uid, 5, 86400);

  if p_preferred_date is not null and p_preferred_date < current_date then
    raise exception 'DATE_IN_PAST';
  end if;
  if coalesce(cardinality(p_image_paths), 0) > 6 then
    raise exception 'TOO_MANY_IMAGES';
  end if;
  foreach v_path in array coalesce(p_image_paths, '{}') loop
    if split_part(v_path, '/', 1) <> v_uid::text or v_path like '%..%' then
      raise exception 'INVALID_IMAGE_PATH';
    end if;
  end loop;

  insert into public.repair_bookings (
    user_id, contact_name, contact_phone, contact_email, preferred_contact, guitar_brand, guitar_model,
    category_id, services, problem_description, preferred_date, notes
  ) values (
    v_uid, trim(p_contact_name), trim(p_contact_phone), nullif(trim(lower(p_contact_email)), ''),
    coalesce(p_preferred_contact, 'whatsapp'), trim(p_guitar_brand), coalesce(trim(p_guitar_model), ''),
    p_category_id, p_services, trim(p_problem_description), p_preferred_date, left(coalesce(trim(p_notes), ''), 2000)
  ) returning * into v_booking;

  insert into public.repair_images (booking_id, storage_path)
  select v_booking.id, x from unnest(coalesce(p_image_paths, '{}')) as x;

  insert into public.status_updates (entity_type, entity_id, status, message, created_by)
  values ('repair_booking', v_booking.id, 'submitted', 'Booking request received. Your appointment is not confirmed yet.', v_uid);

  perform public.notify_user(v_uid, 'Repair booking ' || v_booking.reference || ' received',
    'Guitarz4U will assess your request and provide a quote. Your appointment is not confirmed yet.', '/account/repairs/' || v_booking.id);
  perform public.notify_admins('New repair booking ' || v_booking.reference,
    v_booking.contact_name || ': ' || v_booking.guitar_brand || ' ' || v_booking.guitar_model, '/admin/repairs/' || v_booking.id);

  return query select v_booking.id, v_booking.reference;
end;
$$;

create or replace function public.respond_repair_quote(p_booking_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_booking public.repair_bookings;
begin
  select * into v_booking from public.repair_bookings where id = p_booking_id and user_id = v_uid for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_booking.status <> 'quote_provided' or v_booking.customer_quote_response is not null then
    raise exception 'QUOTE_NOT_PENDING';
  end if;
  update public.repair_bookings
    set customer_quote_response = case when p_accept then 'accepted' else 'declined' end,
        customer_quote_response_at = now()
  where id = p_booking_id;
  insert into public.status_updates (entity_type, entity_id, status, message, created_by)
  values ('repair_booking', p_booking_id, 'quote_provided',
    case when p_accept then 'Customer accepted the quote. Guitarz4U will confirm the booking.' else 'Customer declined the quote.' end, v_uid);
  perform public.notify_admins('Repair quote ' || case when p_accept then 'accepted' else 'declined' end || ' (' || v_booking.reference || ')',
    v_booking.guitar_brand || ' ' || v_booking.guitar_model, '/admin/repairs/' || p_booking_id);
end;
$$;

create or replace function public.cancel_repair_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_booking public.repair_bookings;
begin
  select * into v_booking from public.repair_bookings where id = p_booking_id and user_id = v_uid for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_booking.status not in ('submitted', 'awaiting_review', 'awaiting_info', 'quote_provided', 'approved') then
    raise exception 'CANNOT_CANCEL' using detail = 'Please contact Guitarz4U directly to cancel at this stage.';
  end if;
  update public.repair_bookings set status = 'cancelled' where id = p_booking_id;
  insert into public.status_updates (entity_type, entity_id, status, message, created_by)
  values ('repair_booking', p_booking_id, 'cancelled', 'Cancelled by customer.', v_uid);
  perform public.notify_admins('Repair booking ' || v_booking.reference || ' cancelled by customer', '', '/admin/repairs/' || p_booking_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create or replace function public.submit_review(p_rating smallint, p_title text, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_profile public.profiles;
  v_name text;
  v_id uuid;
  v_links integer;
begin
  perform public.check_rate_limit('review:' || v_uid, 3, 86400);

  if exists (select 1 from public.reviews where user_id = v_uid and status = 'pending') then
    raise exception 'REVIEW_PENDING';
  end if;

  -- Basic spam heuristics: limit links and repeated characters.
  v_links := (select count(*) from regexp_matches(coalesce(p_body, '') || ' ' || coalesce(p_title, ''), '(https?://|www\.)', 'gi'));
  if v_links > 1 or p_body ~ '(.)\1{9,}' then
    raise exception 'REVIEW_LOOKS_LIKE_SPAM';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  v_name := coalesce(nullif(split_part(trim(coalesce(v_profile.full_name, '')), ' ', 1), ''), 'Customer');
  if position(' ' in trim(coalesce(v_profile.full_name, ''))) > 0 then
    v_name := v_name || ' ' || left(split_part(trim(v_profile.full_name), ' ', array_length(regexp_split_to_array(trim(v_profile.full_name), '\s+'), 1)), 1) || '.';
  end if;

  insert into public.reviews (user_id, reviewer_name, rating, title, body, is_verified_buyer)
  values (
    v_uid, left(v_name, 80), p_rating, trim(p_title), trim(p_body),
    -- Only true when this account has a purchase request that the owner marked completed.
    exists (select 1 from public.purchase_requests pr where pr.user_id = v_uid and pr.status = 'completed')
  ) returning id into v_id;

  perform public.notify_admins('New review awaiting moderation', left(trim(p_title), 100), '/admin/reviews');
  return v_id;
end;
$$;

create or replace function public.report_review(p_review_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  perform public.check_rate_limit('review_report:' || coalesce(v_uid::text, 'anon'), case when v_uid is null then 30 else 5 end, 3600);
  if not exists (select 1 from public.reviews where id = p_review_id and status = 'approved') then
    raise exception 'NOT_FOUND';
  end if;
  insert into public.review_reports (review_id, reporter_id, reason) values (p_review_id, v_uid, trim(p_reason));
  perform public.notify_admins('A review was reported', left(trim(p_reason), 200), '/admin/reviews');
end;
$$;

-- ---------------------------------------------------------------------------
-- Enquiries (contact form, product questions) — guests allowed
-- ---------------------------------------------------------------------------
create or replace function public.submit_enquiry(
  p_name text, p_email text, p_phone text, p_subject text, p_message text, p_product_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_links integer;
begin
  perform public.check_rate_limit('enquiry:global', 60, 3600);
  perform public.check_rate_limit('enquiry:' || coalesce(v_uid::text, lower(coalesce(nullif(trim(p_email), ''), trim(p_phone), 'unknown'))), 5, 3600);

  v_links := (select count(*) from regexp_matches(coalesce(p_message, ''), '(https?://|www\.)', 'gi'));
  if v_links > 2 then
    raise exception 'ENQUIRY_LOOKS_LIKE_SPAM';
  end if;
  if coalesce(trim(p_email), '') = '' and coalesce(trim(p_phone), '') = '' then
    raise exception 'CONTACT_REQUIRED';
  end if;
  if p_product_id is not null and not exists (select 1 from public.products where id = p_product_id and status in ('published', 'reserved')) then
    p_product_id := null;
  end if;

  insert into public.enquiries (user_id, product_id, name, email, phone, subject, message)
  values (v_uid, p_product_id, trim(p_name), nullif(trim(lower(p_email)), ''), nullif(trim(p_phone), ''), trim(p_subject), trim(p_message))
  returning id into v_id;

  perform public.notify_admins('New enquiry: ' || left(trim(p_subject), 120), trim(p_name), '/admin/enquiries');
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Analytics (privacy-friendly; allow-listed event names only)
-- ---------------------------------------------------------------------------
create or replace function public.track_event(p_event_name text, p_product_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_name not in (
    'product_view', 'cart_add', 'wishlist_add', 'purchase_request', 'reservation_request',
    'seller_submission', 'repair_booking', 'enquiry', 'whatsapp_click', 'share'
  ) then
    return;
  end if;
  perform public.check_rate_limit('analytics:global', 20000, 3600);
  insert into public.analytics_events (event_name, product_id, path)
  values (p_event_name, case when exists (select 1 from public.products where id = p_product_id) then p_product_id end, left(p_path, 300));
exception when others then
  -- Analytics must never break the user experience.
  return;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privacy (POPIA) requests
-- ---------------------------------------------------------------------------
create or replace function public.request_data_action(p_type public.data_request_type, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_id uuid;
begin
  perform public.check_rate_limit('data_request:' || v_uid, 3, 86400);
  if exists (select 1 from public.data_requests where user_id = v_uid and request_type = p_type and status = 'pending') then
    raise exception 'DUPLICATE_REQUEST';
  end if;
  insert into public.data_requests (user_id, user_email, request_type, reason)
  values (v_uid, (select email from public.profiles where id = v_uid), p_type, left(trim(coalesce(p_reason, '')), 1000))
  returning id into v_id;
  perform public.notify_admins('New privacy request: ' || p_type::text, '', '/admin/customers');
  return v_id;
end;
$$;

-- =============================================================================
-- ADMINISTRATOR WORKFLOWS
-- =============================================================================

create or replace function public.admin_add_note(p_entity_type text, p_entity_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  insert into public.admin_notes (entity_type, entity_id, note, author_id)
  values (p_entity_type, p_entity_id, trim(p_note), (select auth.uid()));
end;
$$;

-- Purchase request status changes, including the manual EFT confirmation.
create or replace function public.admin_set_purchase_status(
  p_request_id uuid,
  p_status public.purchase_status,
  p_customer_message text,
  p_admin_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.purchase_requests;
  v_item record;
begin
  perform public.require_admin();
  select * into v_req from public.purchase_requests where id = p_request_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_req.status in ('completed', 'declined', 'cancelled') and p_status <> v_req.status then
    raise exception 'REQUEST_CLOSED' using detail = 'This request is closed. Create a new request if needed.';
  end if;
  if p_status = 'submitted' then
    raise exception 'INVALID_TRANSITION';
  end if;
  -- Payment can only be confirmed after the purchase was approved.
  if p_status = 'payment_confirmed' and v_req.status not in ('approved', 'awaiting_eft') then
    raise exception 'INVALID_TRANSITION' using detail = 'Approve the purchase and arrange EFT before confirming payment.';
  end if;
  if p_status in ('ready_for_collection', 'completed') and v_req.payment_confirmed_at is null and p_status <> v_req.status then
    raise exception 'INVALID_TRANSITION' using detail = 'Confirm receipt of the EFT payment first.';
  end if;

  -- Items must still be available when approving.
  if p_status in ('approved', 'awaiting_eft') and v_req.status not in ('approved', 'awaiting_eft', 'payment_confirmed', 'ready_for_collection') then
    for v_item in
      select p.id, p.title, p.status from public.purchase_request_items i
      join public.products p on p.id = i.product_id
      where i.request_id = p_request_id
      for update of p
    loop
      if v_item.status not in ('published', 'reserved') then
        raise exception 'PRODUCT_UNAVAILABLE' using detail = v_item.title;
      end if;
      if v_item.status = 'reserved' and (
        exists (select 1 from public.reservations r where r.product_id = v_item.id and r.status = 'approved' and r.user_id is distinct from v_req.user_id)
        or exists (
          select 1 from public.purchase_request_items i2 join public.purchase_requests pr2 on pr2.id = i2.request_id
          where i2.product_id = v_item.id and pr2.id <> p_request_id
            and pr2.status in ('approved', 'awaiting_eft', 'payment_confirmed', 'ready_for_collection'))
      ) then
        raise exception 'PRODUCT_UNAVAILABLE' using detail = v_item.title || ' is held for another customer';
      end if;
    end loop;
  end if;

  update public.purchase_requests
    set status = p_status,
        payment_confirmed_at = case when p_status = 'payment_confirmed' then now() else payment_confirmed_at end,
        payment_confirmed_by = case when p_status = 'payment_confirmed' then (select auth.uid()) else payment_confirmed_by end,
        eft_instructions_sent_at = case when p_status = 'awaiting_eft' then coalesce(eft_instructions_sent_at, now()) else eft_instructions_sent_at end,
        completed_at = case when p_status = 'completed' then now() else completed_at end
  where id = p_request_id;

  -- Inventory side effects.
  if p_status in ('approved', 'awaiting_eft', 'payment_confirmed', 'ready_for_collection') then
    update public.products set status = 'reserved'
    where id in (select product_id from public.purchase_request_items where request_id = p_request_id) and status = 'published';
  elsif p_status = 'completed' then
    update public.products set status = 'sold'
    where id in (select product_id from public.purchase_request_items where request_id = p_request_id);
    update public.reservations set status = 'fulfilled'
    where user_id = v_req.user_id and status = 'approved'
      and product_id in (select product_id from public.purchase_request_items where request_id = p_request_id);
  elsif p_status in ('declined', 'cancelled') then
    for v_item in select product_id from public.purchase_request_items where request_id = p_request_id loop
      perform public.release_product_if_free(v_item.product_id);
    end loop;
  end if;

  if coalesce(trim(p_admin_note), '') <> '' then
    insert into public.admin_notes (entity_type, entity_id, note, author_id)
    values ('purchase_request', p_request_id, trim(p_admin_note), (select auth.uid()));
  end if;

  if p_status is distinct from v_req.status or coalesce(trim(p_customer_message), '') <> '' then
    perform public.record_status_update('purchase_request', p_request_id, p_status::text, p_customer_message,
      v_req.user_id, 'Update on purchase request ' || v_req.reference, '/account/requests/' || p_request_id);
  end if;
end;
$$;

create or replace function public.admin_set_reservation_status(
  p_reservation_id uuid,
  p_status public.reservation_status,
  p_customer_message text,
  p_hold_days integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.reservations;
  v_product_status public.product_status;
begin
  perform public.require_admin();
  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if p_status = 'approved' then
    if v_res.status <> 'requested' then
      raise exception 'INVALID_TRANSITION';
    end if;
    select status into v_product_status from public.products where id = v_res.product_id for update;
    if v_product_status is null or v_product_status <> 'published' then
      raise exception 'PRODUCT_UNAVAILABLE' using detail = v_res.product_title_snapshot;
    end if;
    if exists (select 1 from public.reservations where product_id = v_res.product_id and status = 'approved') then
      raise exception 'RESERVATION_CONFLICT' using detail = 'Another reservation for this product is already approved.';
    end if;
    update public.reservations
      set status = 'approved', approved_at = now(),
          expires_at = now() + make_interval(days => greatest(1, least(coalesce(p_hold_days, 3), 30)))
    where id = p_reservation_id;
    update public.products set status = 'reserved' where id = v_res.product_id;
  else
    update public.reservations set status = p_status where id = p_reservation_id;
    if v_res.status = 'approved' and p_status in ('declined', 'cancelled', 'expired') then
      perform public.release_product_if_free(v_res.product_id);
    end if;
  end if;

  perform public.record_status_update('reservation', p_reservation_id, p_status::text, p_customer_message,
    v_res.user_id, 'Update on reservation ' || v_res.reference, '/account/reservations');
end;
$$;

create or replace function public.admin_set_seller_status(
  p_submission_id uuid,
  p_status public.seller_status,
  p_customer_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.seller_submissions;
begin
  perform public.require_admin();
  select * into v_sub from public.seller_submissions where id = p_submission_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if p_status in ('offer_made', 'offer_accepted', 'offer_declined', 'submitted') then
    raise exception 'INVALID_TRANSITION' using detail = 'Use the offer tools for offer statuses.';
  end if;
  update public.seller_submissions set status = p_status where id = p_submission_id;
  if p_status in ('rejected', 'withdrawn') then
    update public.seller_offers set status = 'withdrawn' where submission_id = p_submission_id and status = 'pending';
  end if;
  perform public.record_status_update('seller_submission', p_submission_id, p_status::text, p_customer_message,
    v_sub.user_id, 'Update on seller submission ' || v_sub.reference, '/account/selling/' || p_submission_id);
end;
$$;

create or replace function public.admin_make_offer(p_submission_id uuid, p_amount numeric, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.seller_submissions;
  v_offer_id uuid;
begin
  perform public.require_admin();
  select * into v_sub from public.seller_submissions where id = p_submission_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_sub.status in ('withdrawn', 'completed', 'rejected') then
    raise exception 'INVALID_TRANSITION';
  end if;
  update public.seller_offers set status = 'withdrawn' where submission_id = p_submission_id and status = 'pending';
  insert into public.seller_offers (submission_id, amount, message, created_by)
  values (p_submission_id, p_amount, left(coalesce(trim(p_message), ''), 2000), (select auth.uid()))
  returning id into v_offer_id;
  update public.seller_submissions set status = 'offer_made' where id = p_submission_id;
  perform public.record_status_update('seller_submission', p_submission_id, 'offer_made',
    'Offer: R' || to_char(p_amount, 'FM999G999G990D00') || coalesce('. ' || nullif(trim(p_message), ''), ''),
    v_sub.user_id, 'You have an offer for ' || v_sub.brand || ' ' || v_sub.model, '/account/selling/' || p_submission_id);
  return v_offer_id;
end;
$$;

create or replace function public.admin_set_repair_status(
  p_booking_id uuid,
  p_status public.repair_status,
  p_customer_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.repair_bookings;
begin
  perform public.require_admin();
  select * into v_booking from public.repair_bookings where id = p_booking_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if p_status = 'quote_provided' then
    raise exception 'INVALID_TRANSITION' using detail = 'Use the quote form to provide a quote.';
  end if;
  if p_status = 'in_progress' and v_booking.status not in ('approved', 'in_progress') then
    raise exception 'INVALID_TRANSITION' using detail = 'Mark the booking as approved before starting work.';
  end if;
  update public.repair_bookings set status = p_status where id = p_booking_id;
  perform public.record_status_update('repair_booking', p_booking_id, p_status::text, p_customer_message,
    v_booking.user_id, 'Update on repair ' || v_booking.reference, '/account/repairs/' || p_booking_id);
end;
$$;

create or replace function public.admin_provide_repair_quote(p_booking_id uuid, p_amount numeric, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.repair_bookings;
begin
  perform public.require_admin();
  if p_amount is null or p_amount < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  select * into v_booking from public.repair_bookings where id = p_booking_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_booking.status in ('completed', 'cancelled') then
    raise exception 'INVALID_TRANSITION';
  end if;
  update public.repair_bookings
    set status = 'quote_provided', quote_amount = p_amount, quote_message = left(coalesce(trim(p_message), ''), 2000),
        quote_provided_at = now(), customer_quote_response = null, customer_quote_response_at = null
  where id = p_booking_id;
  perform public.record_status_update('repair_booking', p_booking_id, 'quote_provided',
    'Quote: R' || to_char(p_amount, 'FM999G999G990D00') || coalesce('. ' || nullif(trim(p_message), ''), ''),
    v_booking.user_id, 'Repair quote for ' || v_booking.reference, '/account/repairs/' || p_booking_id);
end;
$$;

create or replace function public.admin_moderate_review(p_review_id uuid, p_status public.review_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.reviews;
begin
  perform public.require_admin();
  select * into v_review from public.reviews where id = p_review_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  update public.reviews set status = p_status, moderated_at = now(), moderated_by = (select auth.uid()) where id = p_review_id;
  if p_status in ('approved', 'rejected') and v_review.status = 'pending' then
    perform public.notify_user(v_review.user_id,
      case when p_status = 'approved' then 'Your review has been published' else 'Your review was not published' end,
      'Thank you for taking the time to write a review.', '/reviews');
  end if;
  if p_status in ('removed', 'rejected', 'approved') then
    update public.review_reports set resolved = true where review_id = p_review_id;
  end if;
end;
$$;

-- POPIA: anonymise a customer's personal data while preserving business
-- records (orders, submissions and repairs stay, but without personal details).
-- The auth account itself is deleted by the server using the service key.
create or replace function public.admin_anonymise_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  if p_user_id = (select auth.uid()) then
    raise exception 'CANNOT_ANONYMISE_SELF';
  end if;
  update public.purchase_requests
    set contact_name = 'Deleted customer', contact_email = 'deleted@invalid', contact_phone = null, customer_message = '[removed]'
  where user_id = p_user_id;
  update public.reservations
    set contact_name = 'Deleted customer', contact_email = 'deleted@invalid', contact_phone = null, customer_message = '[removed]'
  where user_id = p_user_id;
  update public.seller_submissions
    set seller_name = 'Deleted seller', contact_number = '000000', email = null, notes = '[removed]'
  where user_id = p_user_id;
  update public.repair_bookings
    set contact_name = 'Deleted customer', contact_phone = '000000', contact_email = null, notes = '[removed]'
  where user_id = p_user_id;
  update public.enquiries
    set name = 'Deleted customer', email = 'deleted@invalid', phone = null, message = '[removed]'
  where user_id = p_user_id;
  update public.reviews set status = 'removed', reviewer_name = 'Former customer' where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.availability_alerts where user_id = p_user_id;
  delete from public.wishlists where user_id = p_user_id;
  update public.profiles
    set full_name = null, phone = null, email = null, is_anonymised = true
  where id = p_user_id;
  update public.data_requests set status = 'completed', completed_at = now(), user_email = null
  where user_id = p_user_id and request_type = 'deletion' and status = 'pending';
  perform public.write_audit('anonymise_user', 'profiles', p_user_id::text, '{}'::jsonb);
end;
$$;

-- Removes every product flagged as demonstration data (and its images rows).
create or replace function public.admin_remove_demo_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform public.require_admin();
  -- Keep purchase history intact: detach request items from demo products.
  update public.purchase_request_items set product_id = null
  where product_id in (select id from public.products where is_demo);
  delete from public.products where is_demo;
  get diagnostics v_count = row_count;
  perform public.write_audit('remove_demo_data', 'products', null, jsonb_build_object('removed', v_count));
  return v_count;
end;
$$;

-- Dashboard figures in one round trip.
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'products_published', (select count(*) from public.products where status = 'published'),
    'products_reserved', (select count(*) from public.products where status = 'reserved'),
    'products_draft', (select count(*) from public.products where status = 'draft'),
    'products_sold', (select count(*) from public.products where status = 'sold'),
    'requests_open', (select count(*) from public.purchase_requests where status in ('submitted', 'under_review', 'awaiting_customer')),
    'requests_awaiting_eft', (select count(*) from public.purchase_requests where status in ('approved', 'awaiting_eft')),
    'requests_ready', (select count(*) from public.purchase_requests where status in ('payment_confirmed', 'ready_for_collection')),
    'reservations_pending', (select count(*) from public.reservations where status = 'requested'),
    'submissions_open', (select count(*) from public.seller_submissions where status in ('submitted', 'under_review', 'more_info_requested', 'offer_accepted')),
    'repairs_open', (select count(*) from public.repair_bookings where status in ('submitted', 'awaiting_review', 'awaiting_info', 'quote_provided')),
    'repairs_active', (select count(*) from public.repair_bookings where status in ('approved', 'in_progress', 'awaiting_collection')),
    'reviews_pending', (select count(*) from public.reviews where status = 'pending'),
    'reports_open', (select count(*) from public.review_reports where not resolved),
    'enquiries_new', (select count(*) from public.enquiries where status = 'new'),
    'data_requests_pending', (select count(*) from public.data_requests where status = 'pending'),
    'customers', (select count(*) from public.profiles where role = 'customer' and not is_anonymised),
    'sales_completed_30d', (select coalesce(sum(estimated_total), 0) from public.purchase_requests where status = 'completed' and completed_at > now() - interval '30 days'),
    'events_30d', (
      select coalesce(jsonb_object_agg(event_name, c), '{}'::jsonb)
      from (select event_name, count(*) c from public.analytics_events where created_at > now() - interval '30 days' group by event_name) e
    ),
    'top_products_30d', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select p.title, p.slug, count(*) as views
        from public.analytics_events a join public.products p on p.id = a.product_id
        where a.event_name = 'product_view' and a.created_at > now() - interval '30 days'
        group by p.title, p.slug order by views desc limit 5
      ) t
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Lock down function execution. Internal helpers are not callable via the API.
-- ---------------------------------------------------------------------------
revoke execute on function public.notify_user(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, text, text) from public, anon, authenticated;
revoke execute on function public.write_audit(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.record_status_update(text, uuid, text, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.release_product_if_free(uuid) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.audit_row_change() from public, anon, authenticated;
revoke execute on function public.audit_role_change() from public, anon, authenticated;
revoke execute on function public.notify_availability_alerts() from public, anon, authenticated;
revoke execute on function public.expire_reservations() from public, anon;
