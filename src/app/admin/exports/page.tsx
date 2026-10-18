import { Download } from "lucide-react";
import { AdminTitle } from "@/components/admin/AdminUi";
import { Alert } from "@/components/ui/Alert";

export const metadata = { title: "Exports & backups" };

const ITEMS = [
  ["products", "All products"],
  ["sold-products", "Sold archive"],
  ["product-private", "Private product details (serials, costs)"],
  ["purchase-requests", "Purchase requests"],
  ["purchase-request-items", "Purchase request items"],
  ["reservations", "Reservations"],
  ["seller-submissions", "Seller submissions"],
  ["seller-offers", "Offers to sellers"],
  ["repairs", "Repair bookings"],
  ["reviews", "Reviews"],
  ["customers", "Customers"],
  ["messages", "Contact messages"],
  ["audit-log", "Audit log"],
];

export default function ExportsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <AdminTitle title="Exports & backups">Download your records as CSV files (open in Excel or Google Sheets).</AdminTitle>
      <Alert tone="warning" title="These files contain personal information">
        Store downloads securely (e.g. a private, password-protected folder) and delete old copies you no longer need (POPIA).
      </Alert>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map(([key, label]) => (
          <li key={key}>
            <a href={`/admin/exports/${key}`} className="card flex items-center justify-between gap-3 p-4 hover:border-gold" download>
              <span>{label}</span>
              <Download className="h-5 w-5 text-gold" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <section className="card space-y-2 p-5 text-sm">
        <h2 className="text-xl">Full backups</h2>
        <p>
          The free Supabase plan does <strong>not</strong> include downloadable automatic backups. This project includes a free
          alternative: a GitHub Actions workflow (<code>.github/workflows/backup.yml</code>) that makes a full database backup every
          day and keeps it as a private download for 30 days. It needs a one-off setup — see <code>docs/BACKUP_AND_RESTORE.md</code>.
        </p>
        <p>Product photos can be backed up with the same workflow or downloaded from Supabase Storage. CSV exports above are a good monthly habit.</p>
      </section>
    </div>
  );
}
