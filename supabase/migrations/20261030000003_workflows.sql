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
