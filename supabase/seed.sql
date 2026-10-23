-- =============================================================================
-- DEMONSTRATION DATA ONLY
--
-- These listings are fictional examples so you can see how the shop looks.
-- Every row is flagged is_demo = true, titled "DEMO" and shows a
-- "Demonstration listing" badge on the website.
--
-- Local development: loaded automatically by `npx supabase db reset`.
-- Production: NOT loaded automatically. Your live shop starts empty.
-- Remove demo data at any time from Admin -> Settings -> "Remove demo data",
-- or run:  delete from public.products where is_demo;
--
-- No reviews, testimonials or customers are created here.
-- =============================================================================

insert into public.brands (name, slug) values
  ('Fender', 'fender'), ('Squier', 'squier'), ('Yamaha', 'yamaha'), ('Ibanez', 'ibanez'),
  ('Epiphone', 'epiphone'), ('Cort', 'cort'), ('Admira', 'admira')
on conflict do nothing;

with c as (select id, slug from public.categories), b as (select id, slug from public.brands)
insert into public.products (slug, title, brand_id, model, category_id, price, compare_at_price, condition, functional_status,
  description, defects, history, specifications, included_items, colour, status, is_featured, is_demo)
values
  ('demo-squier-stratocaster-sunburst', 'DEMO — Squier Stratocaster, sunburst',
   (select id from b where slug = 'squier'), 'Affinity Stratocaster', (select id from c where slug = 'electric'),
   3200, null, 'very_good', 'fully_working',
   'Demonstration listing. A popular, comfortable S-style electric that suits beginners and gigging players alike.',
   'Light buckle rash on the back of the body. Small chip on the headstock edge (photographed).',
   'Demonstration listing — no real history.', 'Three single-coil pickups, five-way switch, tremolo bridge.',
   'Tremolo arm', 'Three-tone sunburst', 'published', true, true),
  ('demo-yamaha-f310-acoustic', 'DEMO — Yamaha F310 acoustic',
   (select id from b where slug = 'yamaha'), 'F310', (select id from c where slug = 'acoustic'),
   1650, 1900, 'good', 'fully_working',
   'Demonstration listing. A dependable dreadnought acoustic, set up with fresh strings.',
   'Pick wear next to the soundhole. Minor scratches on the top.', '', 'Dreadnought body, spruce top.',
   'Soft gig bag', 'Natural', 'published', true, true),
  ('demo-ibanez-gsr200-bass', 'DEMO — Ibanez GSR200 bass',
   (select id from b where slug = 'ibanez'), 'GSR200', (select id from c where slug = 'bass'),
   2800, null, 'excellent', 'fully_working',
   'Demonstration listing. Lightweight four-string bass with active EQ.',
   'No notable defects.', '', 'Four strings, active Phat II EQ, P/J pickup configuration.',
   '', 'Black', 'published', true, true),
  ('demo-admira-classical', 'DEMO — Admira classical guitar',
   (select id from b where slug = 'admira'), 'Alba', (select id from c where slug = 'classical'),
   1400, null, 'good', 'fully_working',
   'Demonstration listing. Full-size nylon-string classical guitar.',
   'Small ding on the lower bout. Tuner buttons slightly worn.', '', 'Full size, nylon strings.',
   '', 'Natural', 'published', false, true),
  ('demo-epiphone-les-paul-project', 'DEMO — Epiphone Les Paul Special (project)',
   (select id from b where slug = 'epiphone'), 'Les Paul Special II', (select id from c where slug = 'electric'),
   1200, null, 'project', 'not_working',
   'Demonstration listing. A project guitar for someone who enjoys a repair.',
   'Output jack not working. Bridge pickup intermittent. Missing truss rod cover. Sold as-is.',
   '', 'Two humbuckers, set-style neck.', '', 'Ebony', 'published', false, true),
  ('demo-cort-earth-electro-acoustic', 'DEMO — Cort Earth electro-acoustic',
   (select id from b where slug = 'cort'), 'Earth 70E', (select id from c where slug = 'acoustic'),
   2950, null, 'very_good', 'minor_issues',
   'Demonstration listing. Electro-acoustic with built-in preamp and tuner.',
   'Preamp battery cover is loose. Light fret wear on the first five frets.', '', 'Solid spruce top, onboard preamp.',
   '', 'Open-pore natural', 'reserved', false, true),
  ('demo-fender-precision-bass', 'DEMO — Fender Precision Bass',
   (select id from b where slug = 'fender'), 'Player Precision Bass', (select id from c where slug = 'bass'),
   11500, null, 'excellent', 'fully_working',
   'Demonstration listing. Classic split-coil bass tone.',
   'Very light finish checking near the bridge.', '', 'Split single-coil pickup, four strings.',
   'Hard case', 'Polar white', 'published', true, true),
  ('demo-squier-telecaster-draft', 'DEMO — Squier Telecaster (draft)',
   (select id from b where slug = 'squier'), 'Classic Vibe Telecaster', (select id from c where slug = 'electric'),
   4200, null, 'good', 'fully_working',
   'Demonstration draft listing — not visible to the public until published.',
   'Not yet inspected.', '', '', '', 'Butterscotch', 'draft', false, true);

insert into public.product_images (product_id, storage_path, alt_text, sort_order)
select p.id,
  case
    when c.slug = 'electric' then '/demo/electric.svg'
    when c.slug = 'bass' then '/demo/bass.svg'
    when c.slug = 'acoustic' then '/demo/acoustic.svg'
    else '/demo/classical.svg'
  end,
  'Illustration used for the demonstration listing ' || p.title, 0
from public.products p join public.categories c on c.id = p.category_id
where p.is_demo;

insert into public.product_private (product_id, serial_number, internal_notes)
select id, 'DEMO-' || upper(substr(md5(slug), 1, 8)), 'Demonstration data'
from public.products where is_demo;
