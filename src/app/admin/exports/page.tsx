import { AdminPageHeader } from "@/components/admin/AdminUI";
import { DATASETS } from "./datasets";

export const metadata = { title: "Exports & backups" };

export default function AdminExports() {
  return (
    <div className="max-w-4xl space-y-6">
      <AdminPageHeader
        title="Exports & backups"
        description="Download your business records as CSV (opens in Excel or Google Sheets) or a full JSON backup. Store downloads somewhere safe and private — they contain personal information."
      />
      <section className="card p-5">
        <h2 className="text-xl">Full backup</h2>
        <p className="mt-1 text-sm text-ink-soft">
          One JSON file with every table. The Supabase free plan does not include automatic backups you can download, so download this regularly
          (for example weekly) and keep copies. For a complete database dump, see docs/BACKUP-AND-RESTORE.md.
        </p>
        <a href="/admin/exports/backup.json" className="btn btn-primary btn-sm mt-3" download>
          Download full backup (JSON)
        </a>
      </section>
      <section className="card p-5">
        <h2 className="text-xl">CSV exports</h2>
        <ul className="mt-3 divide-y divide-line">
          {Object.entries(DATASETS).map(([key, ds]) => (
            <li key={key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-walnut">{ds.label}</p>
                <p className="text-xs text-ink-soft">{ds.description}</p>
              </div>
              <a href={`/admin/exports/${key}`} className="btn btn-outline btn-sm" download>
                Download CSV
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section className="card p-5 text-sm">
        <h2 className="text-xl">Product photographs</h2>
        <p className="mt-1 text-ink-soft">
          Photos are stored in Supabase Storage (bucket <code>product-images</code>, plus private customer uploads in <code>customer-uploads</code>). To back them
          up, follow the &ldquo;Image backups&rdquo; section in docs/BACKUP-AND-RESTORE.md.
        </p>
      </section>
    </div>
  );
}
