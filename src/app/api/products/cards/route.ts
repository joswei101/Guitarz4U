import { NextResponse, type NextRequest } from 'next/server';
import { getProductsByIds, imageUrl, sortImages } from '@/lib/products';
import { formatZAR } from '@/lib/format';

// Public product summaries for the "recently viewed" list. Row-level security
// means only published (available/reserved/sold) guitars are ever returned.
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get('ids') ?? '')
    .split(',').filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 8);
  const rows = await getProductsByIds(ids);
  return NextResponse.json(rows.filter((p) => ['available', 'reserved', 'sold'].includes(p.status)).map((p) => {
    const img = sortImages(p.product_images)[0];
    return {
      id: p.id, slug: p.slug, name: `${p.brand} ${p.model}`, price: formatZAR(p.price), status: p.status,
      image: imageUrl(img?.thumb_path ?? img?.path),
    };
  }));
}
