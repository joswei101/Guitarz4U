import Link from "next/link";
import { requirePermissionPage } from "@/lib/auth/guards";
import { formatZAR } from "@/lib/money";
import { financialReport, inventoryValuation, popularProducts, websiteActivity } from "@/lib/reports";
import { AdminHeader, FilterBar, Stat, Table } from "@/components/admin/admin-ui";
import { Alert, Card } from "@/components/ui/misc";
import { Input } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requirePermissionPage("reports:view");
  const sp = await searchParams;
  const today = new Date();
  const fromStr = sp.from ?? new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const toStr = sp.to ?? today.toISOString().slice(0, 10);
  const range = { from: new Date(`${fromStr}T00:00:00+02:00`), to: new Date(`${toStr}T23:59:59+02:00`) };
  const [fin, inv, popular, activity] = await Promise.all([financialReport(range), inventoryValuation(), popularProducts(), websiteActivity(30)]);
  const q = `?from=${fromStr}&to=${toStr}`;
  return (
    <div className="space-y-8">
      <AdminHeader title="Reports" />
      <FilterBar>
        <label className="text-xs text-bone-dim">From<Input type="date" name="from" defaultValue={fromStr} className="w-44" /></label>
        <label className="text-xs text-bone-dim">To<Input type="date" name="to" defaultValue={toStr} className="w-44" /></label>
        <Button type="submit" variant="subtle">Update</Button>
        <ButtonLink href={`/api/admin/export/orders${q}`} variant="outline" size="sm">Orders CSV</ButtonLink>
        <ButtonLink href={`/api/admin/export/payments${q}`} variant="outline" size="sm">Payments & refunds CSV</ButtonLink>
        <ButtonLink href={`/api/admin/export/repairs${q}`} variant="outline" size="sm">Repairs CSV</ButtonLink>
        <ButtonLink href="/api/admin/export/inventory" variant="outline" size="sm">Inventory CSV</ButtonLink>
      </FilterBar>

      <section className="space-y-3">
        <h2 className="font-display text-xl uppercase">Money actually received (records)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Shop card payments" value={formatZAR(fin.received.shop)} hint="Gateway-verified" />
          <Stat label="Repair payments" value={formatZAR(fin.received.repairsAll)} hint={`incl. ${formatZAR(fin.received.repairsOnline)} online`} />
          <Stat label="Refunds completed" value={formatZAR(fin.received.refunded)} hint="Gateway-confirmed" />
          <Stat label="Gateway fees" value={formatZAR(fin.received.gatewayFees)} hint="As reported by PayFast" />
          <Stat label="Paid to sellers" value={formatZAR(fin.purchases.spent)} hint={`${fin.purchases.count} purchase(s)`} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl uppercase">Estimated profit</h2>
        <Alert tone="warn">Estimates only — based on the acquisition, refurbishment and parts costs you have recorded. They are not accounting figures. Refunds and gateway fees are not deducted.</Alert>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="font-display text-lg uppercase">Goods sold</h3>
            <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
              <dt className="text-bone-dim">Items sold</dt><dd>{fin.goods.itemsSold}</dd>
              <dt className="text-bone-dim">Sales value</dt><dd>{formatZAR(fin.goods.sales)}</dd>
              <dt className="text-bone-dim">Recorded costs</dt><dd>{formatZAR(fin.goods.cost)}</dd>
              <dt className="font-semibold">Estimated profit</dt><dd className="font-semibold text-amp">{formatZAR(fin.goods.estimatedProfit)}</dd>
            </dl>
            {fin.goods.itemsMissingCost > 0 && <p className="mt-2 text-xs text-warn">{fin.goods.itemsMissingCost} sold item(s) have no acquisition cost recorded, so profit is overstated.</p>}
          </Card>
          <Card>
            <h3 className="font-display text-lg uppercase">Repairs</h3>
            <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
              <dt className="text-bone-dim">Jobs paid</dt><dd>{fin.repairs.jobsPaid}</dd>
              <dt className="text-bone-dim">Repair income</dt><dd>{formatZAR(fin.repairs.income)}</dd>
              <dt className="text-bone-dim">Recorded costs</dt><dd>{formatZAR(fin.repairs.recordedCost)}</dd>
              <dt className="font-semibold">Estimated profit</dt><dd className="font-semibold text-amp">{formatZAR(fin.repairs.estimatedProfit)}</dd>
            </dl>
          </Card>
        </div>
        {fin.byCategory.length > 0 && <Table><thead><tr><th>Category</th><th>Units</th><th>Sales</th></tr></thead><tbody>{fin.byCategory.map((c) => <tr key={c.name}><td>{c.name}</td><td>{c.count}</td><td>{formatZAR(c.sales)}</td></tr>)}</tbody></Table>}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl uppercase">Inventory valuation (now)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Units in stock" value={inv.units} hint={`${inv.items} listings incl. drafts`} />
          <Stat label="Retail value" value={formatZAR(inv.retail)} />
          <Stat label="Recorded cost" value={formatZAR(inv.cost)} />
          <Stat label="Potential margin" value={formatZAR(inv.potentialMargin)} hint="Estimate" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg uppercase">Popular products (views)</h2>
          <ul className="mt-2 space-y-1 text-sm">{popular.map((p) => <li key={p.id}><Link className="link" href={`/admin/products/${p.id}`}>{p.title}</Link> · {p.viewCount} views · {p._count.wishlistedBy} wishlists · {p._count.questions} questions</li>)}</ul>
        </Card>
        <Card>
          <h2 className="font-display text-lg uppercase">Website activity (30 days)</h2>
          <p className="mt-1 text-sm text-bone-muted">{activity.total} page views · {activity.signups} new customer accounts. Cookie-free, anonymous counts.</p>
          <ul className="mt-2 space-y-1 text-sm">{activity.top.map((r) => <li key={r.path}><span className="font-mono text-xs">{r.path}</span> — {r.views}</li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
