// Removes ALL demonstration products (is_demo = true) and their photos.
// Run before launch:  npm run db:remove-demo
import "./load-env";

(async () => {
  const { pool, query } = await import("../src/lib/db");
  const { deleteObject } = await import("../src/lib/storage");
  const imgs = await query<{ storage_key: string }>("select i.storage_key from product_images i join products p on p.id=i.product_id where p.is_demo");
  // Demo products may have been requested during testing; remove those test records too.
  await query("delete from purchase_request_items where product_id in (select id from products where is_demo)");
  await query("delete from reservations where product_id in (select id from products where is_demo)");
  const res = await query<{ id: string }>("delete from products where is_demo returning id");
  for (const i of imgs) await deleteObject("public", i.storage_key);
  await query("delete from brands b where not exists (select 1 from products p where p.brand_id=b.id)");
  await query("insert into audit_logs (actor_email, action, entity_type, details) values ('cli','demo.removed','product',$1)", [JSON.stringify({ count: res.length })]);
  console.log(`✔ Removed ${res.length} demo product(s) and ${imgs.length} photo(s). The shop is ready for real stock.`);
  await pool.end();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
