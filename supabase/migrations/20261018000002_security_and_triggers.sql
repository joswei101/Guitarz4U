-- =============================================================================
-- Guitarz4U — security helpers, triggers, row-level security
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- True when running from the SQL editor / migrations / cron / service role,
-- i.e. NOT on behalf of a website visitor. Uses the request JWT (set by the
-- API for every request) rather than current_user, because current_user
-- changes inside SECURITY DEFINER functions.
create or replace function private.is_backend()
returns boolean
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    'backend'
  ) not in ('anon', 'authenticated');
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.format_rand(amount numeric)
returns text
language sql
immutable
as $$
  select 'R ' || replace(
    case when amount = trunc(amount) then to_char(amount, 'FM999,999,990')
         else to_char(amount, 'FM999,999,990.00') end, ',', ' ');
$$;

create or replace function private.status_label(p_entity text, p_status text)
returns text
language sql
immutable
as $$
  select case p_entity
    when 'purchase_request' then case p_status
      when 'submitted' then 'Submitted'
      when 'reviewing' then 'Being reviewed'
      when 'accepted' then 'Accepted — we will contact you about payment'
      when 'awaiting_payment' then 'Awaiting payment'
      when 'completed' then 'Completed'
      when 'declined' then 'Declined'
      when 'cancelled' then 'Cancelled'
      else p_status end
    when 'reservation' then case p_status
      when 'requested' then 'Requested (not yet confirmed)'
      when 'approved' then 'Approved'
      when 'declined' then 'Declined'
      when 'cancelled' then 'Cancelled'
      when 'expired' then 'Expired'
      when 'converted' then 'Completed (item purchased)'
      else p_status end
    when 'seller_submission' then case p_status
      when 'submitted' then 'Submitted'
      when 'under_review' then 'Under review'
      when 'more_info_requested' then 'More information requested'
      when 'approved' then 'Approved for inspection'
      when 'offer_made' then 'Offer made'
      when 'offer_accepted' then 'Offer accepted'
      when 'offer_declined' then 'Offer declined'
      when 'rejected' then 'Not accepted'
      when 'purchased' then 'Purchased'
      when 'withdrawn' then 'Withdrawn'
      else p_status end
    when 'repair_booking' then case p_status
      when 'submitted' then 'Submitted'
      when 'awaiting_review' then 'Awaiting review'
      when 'awaiting_customer' then 'Awaiting your response'
      when 'quote_provided' then 'Quote provided'
      when 'approved' then 'Approved'
      when 'in_progress' then 'In progress'
      when 'awaiting_collection' then 'Ready — awaiting collection'
      when 'completed' then 'Completed'
      when 'cancelled' then 'Cancelled'
      when 'declined' then 'Declined'
      else p_status end
    else p_status
  end;
$$;

-- Notification helpers -------------------------------------------------------
create or replace function private.notify_user(
  p_user uuid, p_type text, p_title text, p_body text, p_link text, p_email boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then
    return;
  end if;
  insert into public.notifications (audience, user_id, type, title, body, link, email_status)
  values ('user', p_user, p_type, p_title, coalesce(p_body, ''), p_link,
          case when p_email then 'pending' else 'not_applicable' end);
end;
$$;

create or replace function private.notify_admins(
  p_type text, p_title text, p_body text, p_link text, p_email boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (audience, user_id, type, title, body, link, email_status)
  values ('admin', null, p_type, p_title, coalesce(p_body, ''), p_link,
          case when p_email then 'pending' else 'not_applicable' end);
end;
$$;

-- Rate limiting: raises an error if the current user exceeded p_max rows in p_window.
create or replace function private.enforce_rate_limit(
  p_table text, p_user_column text, p_window interval, p_max int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if private.is_backend() or public.is_admin() then
    return;
  end if;
  if auth.uid() is null then
    raise exception 'You need to be signed in to do that.' using errcode = '42501';
  end if;
  execute format(
    'select count(*) from public.%I where %I = $1 and created_at > now() - $2',
    p_table, p_user_column)
  into v_count using auth.uid(), p_window;
  if v_count >= p_max then
    raise exception 'Too many submissions. Please try again later or contact us on WhatsApp.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- New user → profile
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
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
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 120), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.sync_user_email()
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
  for each row execute function private.sync_user_email();

-- Role changes are only allowed from the backend (SQL editor), never via the API.
create or replace function private.protect_profile()
returns trigger
language plpgsql
as $$
begin
  if not private.is_backend() then
    if new.role is distinct from old.role then
      raise exception 'Roles can only be changed by the site owner from the database console.'
        using errcode = '42501';
    end if;
    new.email := old.email;
    new.anonymised_at := old.anonymised_at;
  end if;
  return new;
end;
$$;

create trigger protect_profile before update on public.profiles
  for each row execute function private.protect_profile();

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.product_private
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.purchase_requests
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.reservations
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.seller_submissions
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.repair_bookings
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.reviews
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.site_settings
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Audit log (records admin and backend changes to important tables)
-- -----------------------------------------------------------------------------
create or replace function private.audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changes jsonb;
  v_id text;
  v_actor uuid := auth.uid();
begin
  -- Only log actions taken by admins or from the backend; customer activity
  -- is already recorded in its own tables.
  if not (private.is_backend() or public.is_admin()) then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value))
      into v_changes
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o using (key)
     where n.value is distinct from o.value
       and n.key not in ('updated_at');
    if v_changes is null then
      return new;
    end if;
    v_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'key', to_jsonb(new) ->> 'product_id');
  elsif tg_op = 'INSERT' then
    v_changes := to_jsonb(new);
    v_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'key', to_jsonb(new) ->> 'product_id');
  else
    v_changes := to_jsonb(old);
    v_id := coalesce(to_jsonb(old) ->> 'id', to_jsonb(old) ->> 'key', to_jsonb(old) ->> 'product_id');
  end if;

  insert into public.audit_logs (actor_id, actor_email, action, table_name, record_id, changes)
  values (
    v_actor,
    (select email from public.profiles where id = v_actor),
    lower(tg_op),
    tg_table_name,
    v_id,
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
    'products', 'product_private', 'product_images', 'categories', 'brands',
    'purchase_requests', 'reservations', 'seller_submissions', 'seller_offers',
    'repair_bookings', 'reviews', 'site_settings', 'profiles', 'data_requests',
    'contact_messages']
  loop
    execute format(
      'create trigger audit_change after insert or update or delete on public.%I
         for each row execute function private.audit_change()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Customer-created records: force server-controlled fields (sanitise)
-- -----------------------------------------------------------------------------
create or replace function private.sanitise_customer_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_backend() or public.is_admin() then
    return new;
  end if;

  new.user_id := auth.uid();
  new.created_at := now();

  if tg_table_name = 'seller_submissions' then
    perform private.enforce_rate_limit('seller_submissions', 'user_id', interval '1 day', 5);
    new.status := 'submitted';
    new.customer_message := null;
    new.consent_at := now();
  elsif tg_table_name = 'repair_bookings' then
    perform private.enforce_rate_limit('repair_bookings', 'user_id', interval '1 day', 5);
    new.status := 'submitted';
    new.customer_message := null;
    new.quote_amount := null;
    new.quote_message := null;
    new.quote_status := 'none';
    new.appointment_at := null;
    if new.preferred_date is not null and new.preferred_date < current_date then
      raise exception 'Preferred date cannot be in the past.';
    end if;
  elsif tg_table_name = 'reviews' then
    perform private.enforce_rate_limit('reviews', 'user_id', interval '1 day', 3);
    new.status := 'pending';
    new.rejection_reason := null;
    new.moderated_by := null;
    new.moderated_at := null;
    -- Only mark as verified when this account genuinely has a completed purchase.
    new.verified_purchase := exists (
      select 1 from public.purchase_requests pr
      where pr.user_id = auth.uid() and pr.status = 'completed');
  elsif tg_table_name = 'data_requests' then
    perform private.enforce_rate_limit('data_requests', 'user_id', interval '1 day', 3);
    new.status := 'pending';
    new.admin_response := null;
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger sanitise_insert before insert on public.seller_submissions
  for each row execute function private.sanitise_customer_insert();
create trigger sanitise_insert before insert on public.repair_bookings
  for each row execute function private.sanitise_customer_insert();
create trigger sanitise_insert before insert on public.reviews
  for each row execute function private.sanitise_customer_insert();
create trigger sanitise_insert before insert on public.data_requests
  for each row execute function private.sanitise_customer_insert();

-- review_reports uses reporter_id instead of user_id
create or replace function private.sanitise_review_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_backend() or public.is_admin() then
    return new;
  end if;
  perform private.enforce_rate_limit('review_reports', 'reporter_id', interval '1 day', 10);
  new.reporter_id := auth.uid();
  new.resolved := false;
  new.created_at := now();
  return new;
end;
$$;
create trigger sanitise_insert before insert on public.review_reports
  for each row execute function private.sanitise_review_report();

-- Limit photos per submission / repair (max 12)
create or replace function private.limit_images()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if tg_table_name = 'seller_submission_images' then
    select count(*) into v_count from public.seller_submission_images
     where submission_id = new.submission_id;
  elsif tg_table_name = 'repair_images' then
    select count(*) into v_count from public.repair_images where repair_id = new.repair_id;
  else
    select count(*) into v_count from public.product_images where product_id = new.product_id;
    if v_count >= 24 then
      raise exception 'A product can have at most 24 photos.';
    end if;
    return new;
  end if;
  if v_count >= 12 then
    raise exception 'You can upload at most 12 photos.';
  end if;
  return new;
end;
$$;
create trigger limit_images before insert on public.seller_submission_images
  for each row execute function private.limit_images();
create trigger limit_images before insert on public.repair_images
  for each row execute function private.limit_images();
create trigger limit_images before insert on public.product_images
  for each row execute function private.limit_images();

-- -----------------------------------------------------------------------------
-- Status timeline + notifications for workflow records
-- TG_ARGV[0] = entity type, TG_ARGV[1] = human label, TG_ARGV[2] = customer link
-- prefix, TG_ARGV[3] = admin link prefix
-- -----------------------------------------------------------------------------
create or replace function private.on_workflow_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity text := tg_argv[0];
  v_label text := tg_argv[1];
  v_user_link text := tg_argv[2] || new.id;
  v_admin_link text := tg_argv[3] || new.id;
  v_new jsonb := to_jsonb(new);
  v_old jsonb;
  v_status text := v_new ->> 'status';
  v_ref text := v_new ->> 'reference';
  v_user uuid := (v_new ->> 'user_id')::uuid;
  v_msg text := v_new ->> 'customer_message';
  v_body text;
begin
  if tg_op = 'INSERT' then
    insert into public.status_events (entity_type, entity_id, from_status, to_status, changed_by)
    values (v_entity, new.id, null, v_status, auth.uid());

    perform private.notify_admins(
      v_entity || '_new',
      'New ' || lower(v_label) || ' ' || v_ref,
      coalesce(v_new ->> 'contact_name', 'A customer') || ' submitted a new ' || lower(v_label) || '.',
      v_admin_link);

    if not public.is_admin() then
      perform private.notify_user(
        v_user,
        v_entity || '_received',
        v_label || ' ' || v_ref || ' received',
        'Thank you. Guitarz4U will review it personally and get back to you. Nothing is confirmed until we contact you.',
        v_user_link,
        false);
    end if;
    return new;
  end if;

  v_old := to_jsonb(old);

  if v_status is distinct from (v_old ->> 'status') then
    insert into public.status_events (entity_type, entity_id, from_status, to_status, note, changed_by)
    values (v_entity, new.id, v_old ->> 'status', v_status,
            case when v_msg is distinct from (v_old ->> 'customer_message') then v_msg end,
            auth.uid());

    if public.is_admin() or private.is_backend() then
      v_body := 'Status: ' || private.status_label(v_entity, v_status) || '.';
      if v_msg is distinct from (v_old ->> 'customer_message') and v_msg is not null then
        v_body := v_body || E'\n\n' || v_msg;
      end if;
      perform private.notify_user(v_user, v_entity || '_status',
        v_label || ' ' || v_ref || ' updated', v_body, v_user_link);
    else
      -- Customer-initiated change (cancel / withdraw / respond)
      perform private.notify_admins(v_entity || '_customer_update',
        v_label || ' ' || v_ref || ': ' || private.status_label(v_entity, v_status),
        coalesce(v_new ->> 'contact_name', 'The customer') || ' updated this ' || lower(v_label) || '.',
        v_admin_link);
    end if;
  elsif v_msg is distinct from (v_old ->> 'customer_message') and v_msg is not null
        and (public.is_admin() or private.is_backend()) then
    perform private.notify_user(v_user, v_entity || '_message',
      'New message about ' || v_ref, v_msg, v_user_link);
  end if;

  return new;
end;
$$;

create trigger workflow_change after insert or update on public.purchase_requests
  for each row execute function private.on_workflow_change(
    'purchase_request', 'Purchase request', '/account/requests/', '/admin/requests/');
create trigger workflow_change after insert or update on public.reservations
  for each row execute function private.on_workflow_change(
    'reservation', 'Reservation request', '/account/reservations/', '/admin/reservations/');
create trigger workflow_change after insert or update on public.seller_submissions
  for each row execute function private.on_workflow_change(
    'seller_submission', 'Seller submission', '/account/submissions/', '/admin/submissions/');
create trigger workflow_change after insert or update on public.repair_bookings
  for each row execute function private.on_workflow_change(
    'repair_booking', 'Repair booking', '/account/repairs/', '/admin/repairs/');

-- Repair quote: changing the amount resets the quote to "pending customer response"
create or replace function private.repair_quote_guard()
returns trigger
language plpgsql
as $$
begin
  if new.quote_amount is distinct from old.quote_amount and new.quote_amount is not null then
    new.quote_status := 'pending';
  elsif new.quote_amount is null then
    new.quote_status := 'none';
  end if;
  return new;
end;
$$;
create trigger repair_quote_guard before update of quote_amount on public.repair_bookings
  for each row execute function private.repair_quote_guard();

-- Offers: one pending at a time; a new offer withdraws older ones and moves the
-- submission to "offer_made".
create or replace function private.on_offer_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.seller_offers set status = 'withdrawn'
   where submission_id = new.submission_id and status = 'pending' and id <> new.id;
  return new;
end;
$$;
create trigger on_offer_before_insert before insert on public.seller_offers
  for each row execute function private.on_offer_insert();

create or replace function private.on_offer_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.seller_submissions
     set status = 'offer_made',
         customer_message = 'Offer: ' || private.format_rand(new.amount)
           || case when new.valid_until is not null
                then ' (valid until ' || to_char(new.valid_until at time zone 'Africa/Johannesburg', 'DD Mon YYYY') || ')'
                else '' end
           || case when new.message <> '' then E'\n\n' || new.message else '' end
   where id = new.submission_id;
  return new;
end;
$$;
create trigger on_offer_after_insert after insert on public.seller_offers
  for each row execute function private.on_offer_created();

-- Reviews: notify admin of new reviews and customer of moderation results
create or replace function private.on_review_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify_admins('review_new', 'New review awaiting approval',
      new.display_name || ' left a ' || new.rating || '-star review.', '/admin/reviews');
  elsif new.status is distinct from old.status and new.status in ('approved', 'rejected', 'removed') then
    perform private.notify_user(new.user_id, 'review_' || new.status,
      case new.status
        when 'approved' then 'Your review has been published'
        when 'rejected' then 'Your review was not approved'
        else 'Your review has been removed' end,
      coalesce(new.rejection_reason, ''),
      '/account/reviews', false);
  end if;
  return new;
end;
$$;
create trigger review_change after insert or update on public.reviews
  for each row execute function private.on_review_change();

create or replace function private.on_review_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_admins('review_reported', 'A review was reported',
    left(new.reason, 300), '/admin/reviews', false);
  return new;
end;
$$;
create trigger review_report after insert on public.review_reports
  for each row execute function private.on_review_report();

create or replace function private.on_data_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify_admins('data_request_new',
      'New ' || new.request_type || ' request',
      'A customer asked for ' || case new.request_type when 'deletion' then 'their account to be deleted.' else 'a copy of their data.' end,
      '/admin/customers?tab=requests');
  elsif new.status is distinct from old.status then
    perform private.notify_user(new.user_id, 'data_request_' || new.status,
      'Your ' || new.request_type || ' request was ' || new.status,
      coalesce(new.admin_response, ''), '/account/privacy');
  end if;
  return new;
end;
$$;
create trigger data_request_change after insert or update on public.data_requests
  for each row execute function private.on_data_request();

create or replace function private.on_contact_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_admins('contact_message', 'New message: ' || coalesce(nullif(new.subject, ''), 'General enquiry'),
    new.name || ' sent a message through the contact form.', '/admin/messages');
  return new;
end;
$$;
create trigger contact_message_created after insert on public.contact_messages
  for each row execute function private.on_contact_message();

-- -----------------------------------------------------------------------------
-- Products: lifecycle bookkeeping, availability alerts, reservation cleanup
-- -----------------------------------------------------------------------------
create or replace function private.product_before_change()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  if new.status = 'sold' and (tg_op = 'INSERT' or old.status <> 'sold') then
    new.sold_at := now();
    new.featured := false;
  end if;
  if new.status <> 'sold' then
    new.sold_at := null;
  end if;
  if new.status <> 'reserved' then
    new.reserved_until := null;
  end if;
  return new;
end;
$$;
create trigger product_before_change before insert or update on public.products
  for each row execute function private.product_before_change();

create or replace function private.product_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- Back in stock → tell people who asked to be notified
  if new.status = 'published' and old.status in ('reserved', 'sold', 'archived', 'draft') then
    for r in
      select id, user_id from public.availability_alerts
       where product_id = new.id and notified_at is null
    loop
      perform private.notify_user(r.user_id, 'availability',
        new.title || ' is available',
        'An item you asked about is available again. Availability is first come, first served.',
        '/shop/' || new.slug);
      update public.availability_alerts set notified_at = now() where id = r.id;
    end loop;
    -- Released from reserved by the admin → close the approved reservation
    if old.status = 'reserved' then
      update public.reservations
         set status = 'cancelled',
             customer_message = coalesce(customer_message, 'The reservation hold was released.')
       where product_id = new.id and status = 'approved';
    end if;
  end if;

  if new.status = 'sold' then
    update public.reservations set status = 'converted'
     where product_id = new.id and status = 'approved';
    update public.reservations
       set status = 'declined', decided_at = now(),
           customer_message = 'Sorry — this item has been sold.'
     where product_id = new.id and status = 'requested';
  end if;

  if new.status in ('archived', 'draft') then
    update public.reservations
       set status = 'declined', decided_at = now(),
           customer_message = 'Sorry — this item is no longer available.'
     where product_id = new.id and status in ('requested', 'approved');
  end if;

  return new;
end;
$$;
create trigger product_after_change after update on public.products
  for each row execute function private.product_after_change();

-- =============================================================================
-- ROW-LEVEL SECURITY
-- Every table has RLS enabled. Anything not explicitly allowed is denied.
-- =============================================================================
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
alter table public.status_events enable row level security;
alter table public.reviews enable row level security;
alter table public.review_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.contact_messages enable row level security;
alter table public.data_requests enable row level security;
alter table public.admin_notes enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.analytics_events enable row level security;

-- Profiles
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: update own or admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- Categories & brands: public read, admin write
create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin write" on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "brands: public read" on public.brands for select using (true);
create policy "brands: admin write" on public.brands for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Products: public sees published/reserved/sold only; admin sees all and writes
create policy "products: public read" on public.products for select
  using (status in ('published', 'reserved', 'sold') or (select public.is_admin()));
create policy "products: admin insert" on public.products for insert to authenticated
  with check ((select public.is_admin()));
create policy "products: admin update" on public.products for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "products: admin delete" on public.products for delete to authenticated
  using ((select public.is_admin()));

create policy "product_private: admin only" on public.product_private for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "product_images: public read" on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id)); -- inherits product RLS
create policy "product_images: admin write" on public.product_images for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Wishlists & alerts: own only
create policy "wishlists: own" on public.wishlists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "alerts: own read" on public.availability_alerts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "alerts: own insert" on public.availability_alerts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "alerts: own delete" on public.availability_alerts for delete to authenticated
  using (user_id = (select auth.uid()));

-- Purchase requests: created through submit_purchase_request() only
create policy "purchase_requests: own or admin read" on public.purchase_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "purchase_requests: admin update" on public.purchase_requests for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "purchase_request_items: read via parent" on public.purchase_request_items for select to authenticated
  using (exists (select 1 from public.purchase_requests r where r.id = request_id));

-- Reservations: created through request_reservation() only
create policy "reservations: own or admin read" on public.reservations for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "reservations: admin update" on public.reservations for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Seller submissions
create policy "seller_submissions: own or admin read" on public.seller_submissions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "seller_submissions: customer insert" on public.seller_submissions for insert to authenticated
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "seller_submissions: admin update" on public.seller_submissions for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "seller_submissions: admin delete" on public.seller_submissions for delete to authenticated
  using ((select public.is_admin()));

create policy "seller_images: read via parent" on public.seller_submission_images for select to authenticated
  using (exists (select 1 from public.seller_submissions s where s.id = submission_id));
create policy "seller_images: owner insert while open" on public.seller_submission_images for insert to authenticated
  with check (
    (select public.is_admin()) or exists (
      select 1 from public.seller_submissions s
       where s.id = submission_id and s.user_id = (select auth.uid())
         and s.status in ('submitted', 'under_review', 'more_info_requested')));
create policy "seller_images: owner or admin delete" on public.seller_submission_images for delete to authenticated
  using (
    (select public.is_admin()) or exists (
      select 1 from public.seller_submissions s
       where s.id = submission_id and s.user_id = (select auth.uid())
         and s.status in ('submitted', 'more_info_requested')));

create policy "seller_offers: read via parent" on public.seller_offers for select to authenticated
  using (exists (select 1 from public.seller_submissions s where s.id = submission_id));
create policy "seller_offers: admin write" on public.seller_offers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Repairs
create policy "repairs: own or admin read" on public.repair_bookings for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "repairs: customer insert" on public.repair_bookings for insert to authenticated
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "repairs: admin update" on public.repair_bookings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "repairs: admin delete" on public.repair_bookings for delete to authenticated
  using ((select public.is_admin()));

create policy "repair_images: read via parent" on public.repair_images for select to authenticated
  using (exists (select 1 from public.repair_bookings r where r.id = repair_id));
create policy "repair_images: owner insert while open" on public.repair_images for insert to authenticated
  with check (
    (select public.is_admin()) or exists (
      select 1 from public.repair_bookings r
       where r.id = repair_id and r.user_id = (select auth.uid())
         and r.status in ('submitted', 'awaiting_review', 'awaiting_customer')));
create policy "repair_images: owner or admin delete" on public.repair_images for delete to authenticated
  using (
    (select public.is_admin()) or exists (
      select 1 from public.repair_bookings r
       where r.id = repair_id and r.user_id = (select auth.uid())
         and r.status in ('submitted', 'awaiting_customer')));

-- Status timeline: visible if the parent record is visible
create policy "status_events: read via parent" on public.status_events for select to authenticated
  using (
    (select public.is_admin())
    or (entity_type = 'purchase_request' and exists (
          select 1 from public.purchase_requests x where x.id = entity_id and x.user_id = (select auth.uid())))
    or (entity_type = 'reservation' and exists (
          select 1 from public.reservations x where x.id = entity_id and x.user_id = (select auth.uid())))
    or (entity_type = 'seller_submission' and exists (
          select 1 from public.seller_submissions x where x.id = entity_id and x.user_id = (select auth.uid())))
    or (entity_type = 'repair_booking' and exists (
          select 1 from public.repair_bookings x where x.id = entity_id and x.user_id = (select auth.uid())))
  );

-- Reviews: customers see their own; the public uses the public_reviews view
create policy "reviews: own or admin read" on public.reviews for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "reviews: customer insert" on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "reviews: admin update" on public.reviews for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "reviews: own pending or admin delete" on public.reviews for delete to authenticated
  using ((user_id = (select auth.uid()) and status = 'pending') or (select public.is_admin()));

create policy "review_reports: insert signed in" on public.review_reports for insert to authenticated
  with check (true);
create policy "review_reports: admin read" on public.review_reports for select to authenticated
  using ((select public.is_admin()));
create policy "review_reports: admin update" on public.review_reports for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Notifications
create policy "notifications: own or admin read" on public.notifications for select to authenticated
  using ((audience = 'user' and user_id = (select auth.uid()))
         or (audience = 'admin' and (select public.is_admin())));
create policy "notifications: admin update" on public.notifications for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "notifications: admin delete" on public.notifications for delete to authenticated
  using ((select public.is_admin()));

-- Contact messages: created through submit_contact_message(); admin manages
create policy "contact_messages: admin" on public.contact_messages for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "contact_messages: own read" on public.contact_messages for select to authenticated
  using (user_id = (select auth.uid()));

-- Data requests
create policy "data_requests: own or admin read" on public.data_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "data_requests: own insert" on public.data_requests for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "data_requests: admin update" on public.data_requests for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Admin-only tables
create policy "admin_notes: admin" on public.admin_notes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "audit_logs: admin read" on public.audit_logs for select to authenticated
  using ((select public.is_admin()));
create policy "analytics: admin read" on public.analytics_events for select to authenticated
  using ((select public.is_admin()));

-- Site settings: public keys readable by everyone; private keys admin only
create policy "site_settings: read" on public.site_settings for select
  using (is_public or (select public.is_admin()));
create policy "site_settings: admin write" on public.site_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Belt and braces: tables written only via functions get no direct write grants.
revoke insert, update, delete on public.purchase_request_items from anon, authenticated;
revoke insert, delete on public.purchase_requests from anon, authenticated;
revoke insert, delete on public.reservations from anon, authenticated;
revoke insert, update, delete on public.status_events from anon, authenticated;
revoke insert, update, delete on public.audit_logs from anon, authenticated;
revoke insert, update, delete on public.analytics_events from anon, authenticated;
revoke insert on public.notifications from anon, authenticated;
revoke insert on public.profiles from anon, authenticated;
revoke all on public.product_private from anon;
revoke all on public.admin_notes from anon;
revoke all on public.audit_logs from anon;
revoke all on sequence public.purchase_request_ref_seq, public.reservation_ref_seq from anon;

-- Public view of approved reviews (no user ids exposed)
create view public.public_reviews as
  select id, display_name, rating, title, body, verified_purchase, created_at
    from public.reviews
   where status = 'approved';
grant select on public.public_reviews to anon, authenticated;
