-- =============================================================================
-- Guitarz4U — storage buckets, base data (categories & settings), scheduling
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Storage buckets
--   product-images      public  — admin uploads shop photos
--   site-assets         public  — admin uploads hero/social images
--   submission-images   private — sellers upload photos of guitars
--   repair-images       private — customers upload photos for repairs
-- Size/type limits are enforced by Supabase Storage itself.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('site-assets', 'site-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('submission-images', 'submission-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('repair-images', 'repair-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets: anyone can view; only admins can upload/change/delete.
create policy "public images: admin insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images', 'site-assets') and (select public.is_admin()));
create policy "public images: admin update" on storage.objects for update to authenticated
  using (bucket_id in ('product-images', 'site-assets') and (select public.is_admin()));
create policy "public images: admin delete" on storage.objects for delete to authenticated
  using (bucket_id in ('product-images', 'site-assets') and (select public.is_admin()));

-- Private buckets: files live under "<user id>/..." — owners and admins only.
create policy "private images: owner insert" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('submission-images', 'repair-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "private images: owner or admin read" on storage.objects for select to authenticated
  using (
    bucket_id in ('submission-images', 'repair-images')
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
create policy "private images: owner or admin delete" on storage.objects for delete to authenticated
  using (
    bucket_id in ('submission-images', 'repair-images')
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

-- -----------------------------------------------------------------------------
-- Base catalogue data (real categories, not demo data)
-- -----------------------------------------------------------------------------
insert into public.categories (name, slug, description, kind, sort_order) values
  ('Electric guitars', 'electric-guitars', 'Pre-owned solid-body, semi-hollow and hollow-body electric guitars.', 'guitar', 1),
  ('Bass guitars', 'bass-guitars', 'Pre-owned four-, five- and six-string bass guitars.', 'guitar', 2),
  ('Acoustic guitars', 'acoustic-guitars', 'Pre-owned steel-string acoustic and electro-acoustic guitars.', 'guitar', 3),
  ('Classical guitars', 'classical-guitars', 'Pre-owned nylon-string classical guitars.', 'guitar', 4),
  ('Amps & equipment', 'amps-equipment', 'Selected pre-owned amplifiers, effects and guitar equipment.', 'equipment', 5)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Site settings. Public settings are readable by visitors; private ones only
-- by admins. Text left null means "use the default text built into the site".
-- -----------------------------------------------------------------------------
insert into public.site_settings (key, value, is_public) values
  ('whatsapp_number', '"0648567019"', true),
  ('contact_email', '"Joshuaweinfas@gmail.com"', true),
  ('social_handle', '"Shuaweinfas"', true),
  ('closed_notice', '"Closed on Saturdays."', true),
  ('announcement', 'null', true),
  ('hero_title', 'null', true),
  ('hero_subtitle', 'null', true),
  ('hero_image_path', 'null', true),
  ('about_body', 'null', true),
  ('repairs_intro', 'null', true),
  ('repair_prices', '[]', true),
  ('policy_privacy', 'null', true),
  ('policy_terms', 'null', true),
  ('policy_returns', 'null', true),
  ('reservation_hold_days', '3', true),
  -- PRIVATE: only shown to the admin; shared with a customer manually after approval
  ('collection_address', 'null', false),
  ('bank_details', 'null', false)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Scheduled job: expire reservation holds and offers every hour.
-- pg_cron is free on Supabase. If it is unavailable the site still works:
-- the app also calls expire_stale_records() when the admin dashboard loads.
-- -----------------------------------------------------------------------------
do $outer$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron not available — skipping schedule (%).', sqlerrm;
    return;
  end;
  perform cron.schedule('g4u-expire-stale', '7 * * * *', $job$select public.expire_stale_records()$job$);
exception when others then
  raise notice 'Could not schedule job: %', sqlerrm;
end;
$outer$;
