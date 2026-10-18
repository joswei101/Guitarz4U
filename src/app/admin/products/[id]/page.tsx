import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { features } from "@/lib/env";
import { formatZAR } from "@/lib/money";
import { PRODUCT_STATUS_LABELS } from "@/lib/catalog";
import { decidePriceSuggestionAction, deleteProductAction, mediaAction, requestAiPriceAction, setProductStatusAction, updateProductAction } from "@/app/actions/admin/products";
import { AdminHeader, Table } from "@/components/admin/admin-ui";
import { ProductFields } from "@/components/admin/product-form";
import { MediaUploader } from "@/components/admin/media-uploader";
import { ActionForm } from "@/components/forms/action-form";
import { Alert, Badge, Card } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { fmtDate } from "@/components/status-badges";
import { ConfirmButton } from "@/components/admin/confirm-button";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; kept?: string }> }) {
  const user = await requirePermissionPage("inventory:view");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { media: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { file: true } }, priceSuggestions: { orderBy: { createdAt: "desc" }, take: 5 }, orderItems: { include: { order: { select: { id: true, orderNumber: true, status: true } } } }, sourceEnquiry: { select: { id: true, reference: true } } } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();
  const canPrice = can(user.role, "inventory:edit-pricing");
  const canStatus = can(user.role, "inventory:change-status");
  const canEdit = can(user.role, "inventory:edit-content");
  return (
    <div className="max-w-6xl space-y-6">
      <AdminHeader title={product.title} back={{ href: "/admin/products", label: "Inventory" }}>
        {product.publishedAt && ["AVAILABLE", "RESERVED"].includes(product.status) && <Link href={`/shop/${product.slug}`} className="link text-sm" target="_blank">View in shop ↗</Link>}
      </AdminHeader>
      {sp.created && <Alert tone="ok">Draft created. Upload photos, then publish when ready.</Alert>}
      {sp.kept && <Alert tone="info">This product has sales records, so it was hidden (Unavailable) instead of deleted.</Alert>}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge tone={product.status === "AVAILABLE" ? "ok" : "neutral"}>{PRODUCT_STATUS_LABELS[product.status]}</Badge>
        <span className="text-bone-dim">SKU {product.sku} · added {fmtDate(product.createdAt)}{product.publishedAt ? ` · published ${fmtDate(product.publishedAt)}` : ""}{product.soldAt ? ` · sold ${fmtDate(product.soldAt)}` : ""}</span>
        {product.sourceEnquiry && <Link href={`/admin/enquiries/${product.sourceEnquiry.id}`} className="link">From enquiry {product.sourceEnquiry.reference}</Link>}
      </div>

      {canStatus && (
        <Card>
          <h2 className="font-display text-lg uppercase">Availability</h2>
          <ActionForm action={setProductStatusAction} submitLabel="Update status" className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={product.id} />
            <Select name="status" defaultValue={product.status} className="w-56" aria-label="Status">
              {Object.entries(PRODUCT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </ActionForm>
          <p className="mt-2 text-xs text-bone-dim">Available = public & purchasable. Reserved = visible but not purchasable. Sold/Unavailable/Draft = hidden from the shop (records kept). Online sales mark items sold automatically after verified payment.</p>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 font-display text-lg uppercase">Photos & videos</h2>
        {product.media.length === 0 && <p className="mb-3 text-sm text-warn">No photos yet — at least one is required to publish.</p>}
        <ul className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {product.media.map((m, i) => (
            <li key={m.id} className="space-y-1 rounded-lg border border-ink-500 p-2 text-xs">
              {m.file.kind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${m.fileId}?v=thumb`} alt={m.altText ?? ""} className="aspect-square w-full rounded object-cover" />
              ) : <div className="grid aspect-square place-items-center rounded bg-ink-600">▶ Video</div>}
              {i === 0 && <Badge tone="amp">Cover</Badge>}
              {canEdit && (
                <div className="flex flex-wrap gap-1">
                  {(["up", "down", "delete"] as const).map((op) => (
                    <form key={op} action={mediaAction}><input type="hidden" name="mediaId" value={m.id} /><input type="hidden" name="op" value={op} /><button className={op === "delete" ? "text-danger underline" : "underline"}>{op === "up" ? "←" : op === "down" ? "→" : "Delete"}</button></form>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        {canEdit && <MediaUploader productId={product.id} />}
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg uppercase">Details</h2>
        {canEdit ? (
          <ActionForm action={updateProductAction} submitLabel="Save changes">
            <input type="hidden" name="id" value={product.id} />
            <ProductFields product={product} categories={categories} canPrice={canPrice} />
          </ActionForm>
        ) : <p className="text-sm text-bone-muted">You can view but not edit this product.</p>}
      </Card>

      {canPrice && (
        <Card>
          <h2 className="font-display text-lg uppercase">AI-assisted price estimate</h2>
          <p className="mt-1 text-sm text-bone-muted">Optional. Estimates are clearly labelled, never applied automatically, and need your approval. Manual pricing always works.</p>
          {features.aiPricing() ? (
            <ActionForm action={requestAiPriceAction} submitLabel="Get AI estimate" variant="outline" className="mt-3 space-y-3"><input type="hidden" name="id" value={product.id} /></ActionForm>
          ) : <Alert tone="info" className="mt-3">Not configured (set ANTHROPIC_API_KEY to enable).</Alert>}
          {product.priceSuggestions.length > 0 && (
            <div className="mt-4"><Table>
              <thead><tr><th>Date</th><th>Estimate</th><th>Range</th><th>Rationale</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {product.priceSuggestions.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">{fmtDate(s.createdAt, true)}</td>
                    <td className="whitespace-nowrap"><Badge tone="info">ESTIMATE</Badge> {formatZAR(s.suggestedCents)}</td>
                    <td className="whitespace-nowrap">{s.lowCents != null ? `${formatZAR(s.lowCents)} – ${formatZAR(s.highCents ?? 0)}` : "—"}</td>
                    <td className="max-w-md text-xs">{s.rationale}<span className="block text-bone-dim">{s.source}</span></td>
                    <td>{s.status.toLowerCase()}</td>
                    <td>{s.status === "PENDING" && (
                      <div className="flex gap-2">
                        <form action={decidePriceSuggestionAction}><input type="hidden" name="suggestionId" value={s.id} /><input type="hidden" name="decision" value="approve" /><Button size="sm">Apply price</Button></form>
                        <form action={decidePriceSuggestionAction}><input type="hidden" name="suggestionId" value={s.id} /><input type="hidden" name="decision" value="dismiss" /><Button size="sm" variant="ghost">Dismiss</Button></form>
                      </div>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </Table></div>
          )}
        </Card>
      )}

      {product.orderItems.length > 0 && (
        <Card>
          <h2 className="font-display text-lg uppercase">Sales records</h2>
          <ul className="mt-2 text-sm">{product.orderItems.map((oi) => <li key={oi.id}><Link className="link" href={`/admin/orders/${oi.order.id}`}>{oi.order.orderNumber}</Link> · {formatZAR(oi.lineTotalCents)} · {oi.order.status.toLowerCase()}</li>)}</ul>
        </Card>
      )}

      {can(user.role, "inventory:delete") && (
        <form action={deleteProductAction} className="text-right">
          <input type="hidden" name="id" value={product.id} />
          <ConfirmButton message="Delete this product permanently? This cannot be undone." className="text-danger">Delete product</ConfirmButton>
          <p className="text-xs text-bone-dim">Products with sales records are hidden instead of deleted.</p>
        </form>
      )}
    </div>
  );
}
