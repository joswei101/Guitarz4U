-- =============================================================================
-- Guitarz4U — workflow functions (RPC). Each function validates input and
-- checks permissions on the server. SECURITY DEFINER functions always set an
-- empty search_path and fully-qualify table names.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shop search (runs with the caller's permissions, so RLS applies)
-- -----------------------------------------------------------------------------
create or replace function public.search_products(
  p_q text default null,
  p_category text default null,
  p_brand text default null,
  p_conditions text[] default null,
  p_min numeric default null,
  p_max numeric default null,
  p_availability text default 'available',   -- available | all | sold
  p_sort text default 'newest',              -- newest | price_asc | price_desc | brand
  p_featured_only boolean default false,
  p_offers_only boolean default false,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, slug text, title text, model text, price numeric, compare_at_price numeric,
  condition text, status text, featured boolean, is_demo boolean, quantity int,
  created_at timestamptz, brand_name text, brand_slug text, category_name text,
  category_slug text, image_path text, image_alt text, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select nullif(trim(p_q), '') as term
  )
  select p.id, p.slug, p.title, p.model, p.price, p.compare_at_price, p.condition, p.status,
         p.featured, p.is_demo, p.quantity, p.created_at,
         b.name, b.slug, c.name, c.slug,
         img.storage_path, img.alt_text,
         count(*) over () as total_count
    from public.products p
    join public.categories c on c.id = p.category_id
    left join public.brands b on b.id = p.brand_id
    left join lateral (
      select i.storage_path, i.alt_text from public.product_images i
       where i.product_id = p.id order by i.sort_order, i.created_at limit 1
    ) img on true
    cross join q
   where p.status in ('published', 'reserved', 'sold')
     and (case p_availability
            when 'available' then p.status in ('published', 'reserved')
            when 'sold' then p.status = 'sold'
            else true end)
     and (p_category is null or c.slug = p_category)
     and (p_brand is null or b.slug = p_brand)
     and (p_conditions is null or cardinality(p_conditions) = 0 or p.condition = any (p_conditions))
     and (p_min is null or p.price >= p_min)
     and (p_max is null or p.price <= p_max)
     and (not p_featured_only or p.featured)
     and (not p_offers_only or p.compare_at_price is not null)
     and (q.term is null
          or p.title ilike '%' || q.term || '%'
          or p.model ilike '%' || q.term || '%'
          or b.name ilike '%' || q.term || '%'
          or c.name ilike '%' || q.term || '%'
          or p.description ilike '%' || q.term || '%')
   order by
     case when p_availability <> 'sold' and p.status = 'sold' then 1 else 0 end,
     case when p_sort = 'price_asc' then p.price end asc nulls last,
     case when p_sort = 'price_desc' then p.price end desc nulls last,
     case when p_sort = 'brand' then b.name end asc nulls last,
     case when p_availability = 'sold' then p.sold_at end desc nulls last,
     coalesce(p.published_at, p.created_at) desc
   limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;
grant execute on function public.search_products to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Purchase request (enquiry cart). Checks availability in the database.
-- p_items: [{"product_id": "...", "quantity": 1}, ...]
-- -----------------------------------------------------------------------------
create or replace function public.submit_purchase_request(
  p_items jsonb,
  p_contact_name text,
  p_contact_phone text,
  p_contact_email text,
  p_preferred_contact text,
  p_message text
)
returns table (id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_item jsonb;
  v_product public.products;
  v_qty int;
  v_request_id uuid;
  v_reference text;
  v_total numeric := 0;
  v_unavailable text[] := '{}';
  v_count int := 0;
begin
  if v_uid is null then
    raise exception 'Please sign in to submit a request.' using errcode = '42501';
  end if;
  perform private.enforce_rate_limit('purchase_requests', 'user_id', interval '1 day', 10);

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your request cart is empty.';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'Please request at most 20 items at a time.';
  end if;

  -- First pass: lock and validate every product
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(coalesce((v_item ->> 'quantity')::int, 1), 1);
    select * into v_product from public.products
     where public.products.id = (v_item ->> 'product_id')::uuid
     for update;
    if not found or v_product.status <> 'published' or v_product.quantity < v_qty then
      v_unavailable := v_unavailable || coalesce(v_product.title, 'An item');
    end if;
  end loop;

  if cardinality(v_unavailable) > 0 then
    raise exception 'Sorry, these items are no longer available: %', array_to_string(v_unavailable, ', ')
      using hint = 'unavailable';
  end if;

  insert into public.purchase_requests
    (user_id, contact_name, contact_phone, contact_email, preferred_contact, message)
  values (v_uid, trim(p_contact_name), nullif(trim(p_contact_phone), ''), nullif(trim(p_contact_email), ''),
          coalesce(p_preferred_contact, 'whatsapp'), coalesce(trim(p_message), ''))
  returning public.purchase_requests.id, public.purchase_requests.reference
    into v_request_id, v_reference;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(coalesce((v_item ->> 'quantity')::int, 1), 1);
    select * into v_product from public.products where public.products.id = (v_item ->> 'product_id')::uuid;
    insert into public.purchase_request_items (request_id, product_id, title_snapshot, price_snapshot, quantity)
    values (v_request_id, v_product.id, v_product.title, v_product.price, v_qty);
    v_total := v_total + v_product.price * v_qty;
    v_count := v_count + 1;
  end loop;

  update public.purchase_requests set total_estimate = v_total where public.purchase_requests.id = v_request_id;

  insert into public.analytics_events (event_type, product_id)
  select 'purchase_request', (e ->> 'product_id')::uuid from jsonb_array_elements(p_items) e;

  return query select v_request_id, v_reference;
end;
$$;
revoke execute on function public.submit_purchase_request from public, anon;
grant execute on function public.submit_purchase_request to authenticated;

create or replace function public.cancel_purchase_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.purchase_requests
     set status = 'cancelled'
   where id = p_id and user_id = auth.uid()
     and status in ('submitted', 'reviewing', 'accepted', 'awaiting_payment');
  if not found then
    raise exception 'This request cannot be cancelled.';
  end if;
end;
$$;
revoke execute on function public.cancel_purchase_request from public, anon;
grant execute on function public.cancel_purchase_request to authenticated;

-- -----------------------------------------------------------------------------
-- Reservations — a REQUEST only; the owner must approve it.
-- -----------------------------------------------------------------------------
create or replace function public.request_reservation(
  p_product_id uuid,
  p_contact_name text,
  p_contact_phone text,
  p_contact_email text,
  p_preferred_contact text,
  p_message text
)
returns table (id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_product public.products;
  v_id uuid;
  v_ref text;
begin
  if v_uid is null then
    raise exception 'Please sign in to request a reservation.' using errcode = '42501';
  end if;
  perform private.enforce_rate_limit('reservations', 'user_id', interval '1 day', 10);

  select * into v_product from public.products where public.products.id = p_product_id for update;
  if not found or v_product.status <> 'published' then
    raise exception 'Sorry, this item is not available for reservation.' using hint = 'unavailable';
  end if;
  if exists (select 1 from public.reservations r
              where r.product_id = p_product_id and r.status = 'approved') then
    raise exception 'Sorry, this item is already reserved.' using hint = 'unavailable';
  end if;
  if exists (select 1 from public.reservations r
              where r.product_id = p_product_id and r.user_id = v_uid and r.status = 'requested') then
    raise exception 'You already have a pending reservation request for this item.';
  end if;

  insert into public.reservations
    (user_id, product_id, product_title_snapshot, price_snapshot, contact_name, contact_phone,
     contact_email, preferred_contact, message)
  values (v_uid, v_product.id, v_product.title, v_product.price, trim(p_contact_name),
          nullif(trim(p_contact_phone), ''), nullif(trim(p_contact_email), ''),
          coalesce(p_preferred_contact, 'whatsapp'), coalesce(trim(p_message), ''))
  returning public.reservations.id, public.reservations.reference into v_id, v_ref;

  insert into public.analytics_events (event_type, product_id) values ('reservation_request', p_product_id);
  return query select v_id, v_ref;
end;
$$;
revoke execute on function public.request_reservation from public, anon;
grant execute on function public.request_reservation to authenticated;

create or replace function public.cancel_reservation(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.reservations;
begin
  select * into v_res from public.reservations
   where id = p_id and user_id = auth.uid() and status in ('requested', 'approved')
   for update;
  if not found then
    raise exception 'This reservation cannot be cancelled.';
  end if;
  update public.reservations set status = 'cancelled', decided_at = now() where id = p_id;
  if v_res.status = 'approved' then
    update public.products set status = 'published'
     where id = v_res.product_id and status = 'reserved';
  end if;
end;
$$;
revoke execute on function public.cancel_reservation from public, anon;
grant execute on function public.cancel_reservation to authenticated;

create or replace function public.approve_reservation(p_id uuid, p_hold_days int, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.reservations;
  v_product public.products;
  v_until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;
  select * into v_res from public.reservations where id = p_id for update;
  if not found or v_res.status <> 'requested' then
    raise exception 'Only pending reservation requests can be approved.';
  end if;
  select * into v_product from public.products where id = v_res.product_id for update;
  if not found or v_product.status <> 'published' then
    raise exception 'This product is not available (status: %).', coalesce(v_product.status, 'deleted');
  end if;

  v_until := now() + make_interval(days => least(greatest(coalesce(p_hold_days, 3), 1), 30));

  update public.reservations
     set status = 'approved', expires_at = v_until, decided_at = now(),
         customer_message = coalesce(nullif(trim(p_message), ''),
           'Your reservation is confirmed until ' ||
           to_char(v_until at time zone 'Africa/Johannesburg', 'DD Mon YYYY HH24:MI') ||
           '. We will contact you about payment and collection.')
   where id = p_id;
  update public.products set status = 'reserved', reserved_until = v_until where id = v_product.id;
end;
$$;
revoke execute on function public.approve_reservation from public, anon;
grant execute on function public.approve_reservation to authenticated;

create or replace function public.decline_reservation(p_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.reservations;
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;
  select * into v_res from public.reservations where id = p_id for update;
  if not found or v_res.status not in ('requested', 'approved') then
    raise exception 'This reservation cannot be declined.';
  end if;
  update public.reservations
     set status = case when v_res.status = 'approved' then 'cancelled' else 'declined' end,
         decided_at = now(),
         customer_message = coalesce(nullif(trim(p_message), ''), customer_message)
   where id = p_id;
  if v_res.status = 'approved' then
    update public.products set status = 'published'
     where id = v_res.product_id and status = 'reserved';
  end if;
end;
$$;
revoke execute on function public.decline_reservation from public, anon;
grant execute on function public.decline_reservation to authenticated;

-- Expire stale reservations and offers. Safe for anyone to call (idempotent).
create or replace function public.expire_stale_records()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select id, product_id from public.reservations
     where status = 'approved' and expires_at < now()
     for update skip locked
  loop
    update public.reservations
       set status = 'expired',
           customer_message = 'Your reservation hold has expired. Contact us if you are still interested.'
     where id = r.id;
    update public.products set status = 'published'
     where id = r.product_id and status = 'reserved';
    v_count := v_count + 1;
  end loop;

  update public.seller_offers set status = 'expired'
   where status = 'pending' and valid_until is not null and valid_until < now();

  return v_count;
end;
$$;
grant execute on function public.expire_stale_records to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Seller offers & repair quotes: customer responses
-- -----------------------------------------------------------------------------
create or replace function public.respond_to_offer(p_offer_id uuid, p_accept boolean, p_message text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer public.seller_offers;
  v_sub public.seller_submissions;
begin
  select * into v_offer from public.seller_offers where id = p_offer_id for update;
  if not found then
    raise exception 'Offer not found.';
  end if;
  select * into v_sub from public.seller_submissions where id = v_offer.submission_id;
  if v_sub.user_id is distinct from auth.uid() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'This offer is no longer open.';
  end if;
  if v_offer.valid_until is not null and v_offer.valid_until < now() then
    update public.seller_offers set status = 'expired' where id = p_offer_id;
    raise exception 'This offer has expired. Please contact us.';
  end if;

  update public.seller_offers
     set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
   where id = p_offer_id;
  update public.seller_submissions
     set status = case when p_accept then 'offer_accepted' else 'offer_declined' end,
         notes = case when nullif(trim(p_message), '') is not null
                   then left(notes || E'\n\nSeller response: ' || trim(p_message), 4000) else notes end
   where id = v_sub.id;
end;
$$;
revoke execute on function public.respond_to_offer from public, anon;
grant execute on function public.respond_to_offer to authenticated;

create or replace function public.withdraw_seller_submission(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.seller_submissions set status = 'withdrawn'
   where id = p_id and user_id = auth.uid()
     and status in ('submitted', 'under_review', 'more_info_requested', 'approved', 'offer_made', 'offer_declined');
  if not found then
    raise exception 'This submission cannot be withdrawn.';
  end if;
  update public.seller_offers set status = 'withdrawn' where submission_id = p_id and status = 'pending';
end;
$$;
revoke execute on function public.withdraw_seller_submission from public, anon;
grant execute on function public.withdraw_seller_submission to authenticated;

-- Customer replies to "more information requested"
create or replace function public.reply_to_seller_submission(p_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Please enter a message.';
  end if;
  update public.seller_submissions
     set notes = left(notes || E'\n\nSeller reply (' || to_char(now() at time zone 'Africa/Johannesburg', 'DD Mon HH24:MI') || '): ' || left(trim(p_message), 1500), 4000),
         status = case when status = 'more_info_requested' then 'under_review' else status end
   where id = p_id and user_id = auth.uid()
     and status not in ('withdrawn', 'rejected', 'purchased');
  if not found then
    raise exception 'You cannot reply to this submission.';
  end if;
end;
$$;
revoke execute on function public.reply_to_seller_submission from public, anon;
grant execute on function public.reply_to_seller_submission to authenticated;

create or replace function public.respond_to_repair_quote(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.repair_bookings
     set quote_status = case when p_accept then 'accepted' else 'declined' end,
         -- Accepting a quote does NOT start the repair; the owner approves next.
         status = 'awaiting_review'
   where id = p_id and user_id = auth.uid() and quote_status = 'pending'
     and status in ('quote_provided', 'awaiting_customer');
  if not found then
    raise exception 'There is no open quote to respond to.';
  end if;
end;
$$;
revoke execute on function public.respond_to_repair_quote from public, anon;
grant execute on function public.respond_to_repair_quote to authenticated;

create or replace function public.reply_to_repair_booking(p_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(trim(coalesce(p_message, ''))) < 2 then
    raise exception 'Please enter a message.';
  end if;
  update public.repair_bookings
     set notes = left(notes || E'\n\nCustomer reply (' || to_char(now() at time zone 'Africa/Johannesburg', 'DD Mon HH24:MI') || '): ' || left(trim(p_message), 1500), 4000),
         status = case when status = 'awaiting_customer' then 'awaiting_review' else status end
   where id = p_id and user_id = auth.uid() and status not in ('completed', 'cancelled', 'declined');
  if not found then
    raise exception 'You cannot reply to this booking.';
  end if;
end;
$$;
revoke execute on function public.reply_to_repair_booking from public, anon;
grant execute on function public.reply_to_repair_booking to authenticated;

create or replace function public.cancel_repair_booking(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.repair_bookings set status = 'cancelled'
   where id = p_id and user_id = auth.uid()
     and status in ('submitted', 'awaiting_review', 'awaiting_customer', 'quote_provided', 'approved');
  if not found then
    raise exception 'This booking cannot be cancelled online. Please contact us.';
  end if;
end;
$$;
revoke execute on function public.cancel_repair_booking from public, anon;
grant execute on function public.cancel_repair_booking to authenticated;

-- -----------------------------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;
  update public.notifications set read_at = now()
   where read_at is null
     and (p_ids is null or id = any (p_ids))
     and ((audience = 'user' and user_id = auth.uid())
          or (audience = 'admin' and public.is_admin()));
end;
$$;
revoke execute on function public.mark_notifications_read from public, anon;
grant execute on function public.mark_notifications_read to authenticated;

-- -----------------------------------------------------------------------------
-- Contact form (works without an account; validated & rate limited)
-- -----------------------------------------------------------------------------
create or replace function public.submit_contact_message(
  p_name text, p_email text, p_phone text, p_subject text, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent int;
begin
  if nullif(trim(p_email), '') is null and nullif(trim(p_phone), '') is null then
    raise exception 'Please give us an email address or phone number so we can reply.';
  end if;
  if p_email is not null and trim(p_email) <> ''
     and trim(p_email) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please enter a valid email address.';
  end if;
  -- Abuse protection: per-sender and global limits
  select count(*) into v_recent from public.contact_messages
   where created_at > now() - interval '1 hour'
     and ((nullif(trim(p_email), '') is not null and lower(email) = lower(trim(p_email)))
          or (nullif(trim(p_phone), '') is not null and phone = trim(p_phone))
          or (auth.uid() is not null and user_id = auth.uid()));
  if v_recent >= 3 then
    raise exception 'You have sent several messages recently. Please wait a while or contact us on WhatsApp.'
      using hint = 'rate_limited';
  end if;
  select count(*) into v_recent from public.contact_messages where created_at > now() - interval '1 hour';
  if v_recent >= 60 then
    raise exception 'We are receiving a lot of messages right now. Please contact us on WhatsApp.'
      using hint = 'rate_limited';
  end if;

  insert into public.contact_messages (user_id, name, email, phone, subject, message)
  values (auth.uid(), trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_phone), ''),
          coalesce(trim(p_subject), ''), trim(p_message));
end;
$$;
grant execute on function public.submit_contact_message to anon, authenticated;

-- -----------------------------------------------------------------------------
-- First-party, cookie-free analytics (no personal data stored)
-- -----------------------------------------------------------------------------
create or replace function public.track_event(p_type text, p_product_id uuid default null, p_path text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_type not in ('page_view', 'product_view', 'wishlist_add', 'whatsapp_click', 'share',
                    'seller_submission', 'repair_booking') then
    return;
  end if;
  if p_product_id is not null and not exists (
       select 1 from public.products where id = p_product_id and status in ('published', 'reserved', 'sold')) then
    p_product_id := null;
  end if;
  insert into public.analytics_events (event_type, product_id, path)
  values (p_type, p_product_id, left(split_part(coalesce(p_path, ''), '?', 1), 300));
end;
$$;
grant execute on function public.track_event to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Admin dashboard statistics
-- -----------------------------------------------------------------------------
create or replace function public.admin_overview(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - make_interval(days => least(greatest(p_days, 1), 365));
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'inventory', (select jsonb_object_agg(status, n) from (
        select status, count(*) n from public.products group by status) s),
    'open', jsonb_build_object(
      'purchase_requests', (select count(*) from public.purchase_requests where status in ('submitted', 'reviewing')),
      'reservations', (select count(*) from public.reservations where status = 'requested'),
      'seller_submissions', (select count(*) from public.seller_submissions where status in ('submitted', 'under_review')),
      'repairs', (select count(*) from public.repair_bookings where status in ('submitted', 'awaiting_review')),
      'reviews', (select count(*) from public.reviews where status = 'pending'),
      'messages', (select count(*) from public.contact_messages where status = 'new'),
      'data_requests', (select count(*) from public.data_requests where status = 'pending'),
      'unread_notifications', (select count(*) from public.notifications where audience = 'admin' and read_at is null)
    ),
    'period_days', p_days,
    'events', (select coalesce(jsonb_object_agg(event_type, n), '{}'::jsonb) from (
        select event_type, count(*) n from public.analytics_events
         where created_at >= v_since group by event_type) e),
    'top_products', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select p.id, p.title, p.slug, p.status,
               count(*) filter (where e.event_type = 'product_view') as views,
               count(*) filter (where e.event_type in ('purchase_request', 'reservation_request')) as enquiries
          from public.analytics_events e
          join public.products p on p.id = e.product_id
         where e.created_at >= v_since
         group by p.id
         order by views desc
         limit 10) t),
    'sold_in_period', (select count(*) from public.products where sold_at >= v_since),
    'sold_value_in_period', (select coalesce(sum(price), 0) from public.products where sold_at >= v_since),
    'customers', (select count(*) from public.profiles where role = 'customer' and anonymised_at is null),
    'new_customers_in_period', (select count(*) from public.profiles where created_at >= v_since and role = 'customer')
  ) into v;
  return v;
end;
$$;
revoke execute on function public.admin_overview from public, anon;
grant execute on function public.admin_overview to authenticated;

-- -----------------------------------------------------------------------------
-- Privacy: anonymise a customer (processing an account deletion request).
-- Business records (requests, offers, repairs) are KEPT for record-keeping
-- but personal contact details are removed. The login is deleted.
-- -----------------------------------------------------------------------------
create or replace function public.admin_anonymise_user(p_user_id uuid, p_response text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or private.is_backend()) then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own admin account here.';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and role = 'admin') then
    raise exception 'Admin accounts must be removed from the database console.';
  end if;

  update public.purchase_requests
     set contact_name = 'Deleted customer', contact_email = null, contact_phone = null, message = '[removed]'
   where user_id = p_user_id;
  update public.reservations
     set contact_name = 'Deleted customer', contact_email = null, contact_phone = null, message = '[removed]'
   where user_id = p_user_id;
  update public.seller_submissions
     set contact_name = 'Deleted customer', contact_email = null, contact_phone = null, location = null
   where user_id = p_user_id;
  update public.repair_bookings
     set contact_name = 'Deleted customer', contact_email = null, contact_phone = null
   where user_id = p_user_id;
  update public.contact_messages set name = 'Deleted customer', email = null, phone = null
   where user_id = p_user_id;
  update public.reviews set status = 'removed', display_name = 'Former customer'
   where user_id = p_user_id;
  update public.data_requests
     set status = 'completed', completed_at = now(),
         admin_response = coalesce(p_response, 'Your account and personal details have been deleted.')
   where user_id = p_user_id and request_type = 'deletion' and status = 'pending';

  insert into public.audit_logs (actor_id, actor_email, action, table_name, record_id, changes)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()),
          'anonymise_user', 'auth.users', p_user_id::text, null);

  -- Deleting the login cascades to profile, wishlist, alerts and notifications;
  -- business records keep their row with user_id set to null.
  delete from auth.users where id = p_user_id;
end;
$$;
revoke execute on function public.admin_anonymise_user from public, anon;
grant execute on function public.admin_anonymise_user to authenticated;

-- -----------------------------------------------------------------------------
-- Admin setup: ONLY callable from the Supabase SQL editor (not from the API).
--   select public.promote_to_admin('you@example.com');
-- -----------------------------------------------------------------------------
create or replace function public.promote_to_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.is_backend() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    raise exception 'No account with email %. Register on the website first.', p_email;
  end if;
  update public.profiles set role = 'admin' where id = v_id;
  return 'User ' || p_email || ' is now an administrator.';
end;
$$;
revoke execute on function public.promote_to_admin from public, anon, authenticated;

create or replace function public.demote_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_backend() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;
  update public.profiles set role = 'customer'
   where id = (select id from auth.users where lower(email) = lower(trim(p_email)));
  return 'Done.';
end;
$$;
revoke execute on function public.demote_admin from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Demo data: clearly labelled, easy to remove. Admin only.
-- -----------------------------------------------------------------------------
create or replace function public.admin_remove_demo_data()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if not (public.is_admin() or private.is_backend()) then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;
  delete from public.products where is_demo;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.admin_remove_demo_data from public, anon;
grant execute on function public.admin_remove_demo_data to authenticated;

create or replace function public.admin_load_demo_data()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cat record;
  v_id uuid;
  v_n int := 0;
  d record;
begin
  if not (public.is_admin() or private.is_backend()) then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;
  if exists (select 1 from public.products where is_demo) then
    raise exception 'Demo data is already loaded. Remove it first.';
  end if;

  insert into public.brands (name, slug) values ('Demo Brand', 'demo-brand') on conflict (slug) do nothing;

  for d in select * from (values
    ('demo-electric-sunburst', 'DEMO — Sunburst single-cut electric', 'electric-guitars', 7500::numeric, null::numeric, 'very_good', 'electric', true,
     'This is a demonstration listing used to preview the shop. It is not a real item for sale.', 'Light pick wear near the bridge (demo text).'),
    ('demo-bass-natural', 'DEMO — Four-string bass, natural finish', 'bass-guitars', 5200, 5800, 'good', 'bass', false,
     'This is a demonstration listing used to preview the shop. It is not a real item for sale.', 'Small chip on the headstock (demo text).'),
    ('demo-acoustic-dreadnought', 'DEMO — Dreadnought acoustic', 'acoustic-guitars', 3900, null, 'excellent', 'acoustic', true,
     'This is a demonstration listing used to preview the shop. It is not a real item for sale.', ''),
    ('demo-classical-nylon', 'DEMO — Nylon-string classical', 'classical-guitars', 1800, null, 'fair', 'classical', false,
     'This is a demonstration listing used to preview the shop. It is not a real item for sale.', 'Finish checking on the top (demo text).')
  ) as t(slug, title, cat, price, compare_at, cond, art, featured, description, defects)
  loop
    select id into v_cat from public.categories where slug = d.cat;
    if v_cat.id is null then
      continue;
    end if;
    insert into public.products
      (slug, title, brand_id, model, category_id, price, compare_at_price, condition, description, defects,
       status, featured, is_demo)
    values (d.slug, d.title, (select id from public.brands where slug = 'demo-brand'), 'Demo model',
            v_cat.id, d.price, d.compare_at, d.cond, d.description, d.defects, 'published', d.featured, true)
    returning id into v_id;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order)
    values (v_id, '/demo/' || d.art || '.svg', 'Illustration of a ' || d.art || ' guitar (demo image)', 0);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public.admin_load_demo_data from public, anon;
grant execute on function public.admin_load_demo_data to authenticated;
