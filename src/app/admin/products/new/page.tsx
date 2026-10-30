import { ProductForm } from '@/components/admin/ProductForm';
import { requireStaff } from '@/lib/auth';

export default async function NewProduct({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('inventory');
  const sp = await searchParams;
  return (
    <>
      <h1>Add a guitar</h1>
      <p className="muted">Fill in the details and save. The listing stays hidden (draft) until you add photos and press Publish.</p>
      <ProductForm initial={{ brand: sp.brand ?? '', model: sp.model ?? '', provenance: sp.provenance ?? '' }} />
    </>
  );
}
