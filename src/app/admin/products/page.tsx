import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatZAR } from '@/lib/format';
import { CATEGORY_SINGULAR, PRODUCT_STATUS, label, type Category } from '@/lib/labels';
import { imageUrl, sortImages, type ImageRow } from '@/lib/products';

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('inventory');
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from('products').select('id, ref, slug, brand, model, category, price, status, is_featured, updated_at, product_images(id, path, thumb_path, alt, sort_order, width, height)').order('updated_at', { ascending: false }).limit(200);
  if (sp.status && sp.status in PRODUCT_STATUS) q = q.eq('status', sp.status);
  if (sp.q) q = q.or(`brand.ilike.%${sp.q.replace(/[^\w\s-]/g, '')}%,model.ilike.%${sp.q.replace(/[^\w\s-]/g, '')}%,ref.ilike.%${sp.q.replace(/[^\w\s-]/g, '')}%`);
  const { data } = await q;
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="row-between"><h1 style={{ margin: 0 }}>Products</h1><Link href="/admin/products/new" className="btn btn-primary">+ Add a guitar</Link></div>
      <nav className="tabs" aria-label="Filter by status">
        <Link href="/admin/products" aria-current={!sp.status ? 'page' : undefined}>All</Link>
        {Object.entries(PRODUCT_STATUS).map(([k, l]) => <Link key={k} href={`/admin/products?status=${k}`} aria-current={sp.status === k ? 'page' : undefined}>{l.replace(' (hidden)', '')}</Link>)}
      </nav>
      <form method="get" className="row"><input type="hidden" name="status" value={sp.status ?? ''} />
        <label className="visually-hidden" htmlFor="pq">Search products</label>
        <input id="pq" name="q" type="search" placeholder="Search brand, model or ref" defaultValue={sp.q} style={{ maxWidth: 320 }} />
        <button className="btn btn-outline btn-small" type="submit">Search</button></form>
      {data?.length ? (
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Photo</th><th>Guitar</th><th>Status</th><th className="num">Price</th><th>Updated</th></tr></thead>
          <tbody>{data.map((p) => {
            const img = sortImages(p.product_images as ImageRow[])[0];
            return (
              <tr key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <td>{img ? <img src={imageUrl(img.thumb_path ?? img.path)!} alt="" width={44} height={55} style={{ width: 44, height: 55, objectFit: 'cover', borderRadius: 4 }} /> : <span className="small muted">No photo</span>}</td>
                <td><Link href={`/admin/products/${p.id}`}><strong>{p.brand} {p.model}</strong></Link><div className="small muted">{p.ref} · {CATEGORY_SINGULAR[p.category as Category]}{p.is_featured ? ' · Featured' : ''}</div></td>
                <td><StatusBadge status={p.status} text={label(PRODUCT_STATUS, p.status)} /></td>
                <td className="num">{formatZAR(p.price)}</td>
                <td>{formatDate(p.updated_at)}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      ) : (
        <div className="empty-state"><h2>No products {sp.status ? 'with this status' : 'yet'}</h2><p>Add your first guitar listing. It starts as a hidden draft until you publish it.</p><Link href="/admin/products/new" className="btn btn-primary">+ Add a guitar</Link></div>
      )}
    </>
  );
}
