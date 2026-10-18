const EXPORTS: [string, string][] = [
  ["products", "All products (inventory, including serial numbers)"],
  ["sold-products", "Sold products archive"],
  ["purchase-requests", "Purchase requests & EFT status"],
  ["reservations", "Reservations"],
  ["seller-submissions", "Seller submissions & offers"],
  ["repairs", "Repair bookings"],
  ["customers", "Customer accounts"],
  ["reviews", "Reviews"],
  ["messages", "Messages & product questions"],
  ["audit-log", "Audit log"],
];

export default function AdminExports() {
  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Exports &amp; backups</h1>
      <section className="card">
        <h2 style={{ fontSize: "1.2rem" }}>Download CSV files</h2>
        <p className="muted">CSV files open in Excel or Google Sheets. They contain private customer information — store them securely and do not share them.</p>
        <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
          {EXPORTS.map(([k, label]) => (
            <li key={k} className="row between card-flat" style={{ padding: 12 }}>
              <span>{label}</span>
              <a className="btn btn-outline btn-sm" href={`/api/admin/export/${k}`} download>Download CSV</a>
            </li>
          ))}
        </ul>
      </section>
      <section className="card prose">
        <h2 style={{ fontSize: "1.2rem" }}>Full backups</h2>
        <p>CSV files are useful records but are <strong>not</strong> a complete backup. The free database plan does not include downloadable automatic backups, so make a full backup regularly (for example monthly, and before big changes):</p>
        <ul>
          <li><strong>Database:</strong> run <code>npm run backup:db</code> on your computer, or use the included GitHub Actions workflow (see <code>docs/BACKUP-AND-RESTORE.md</code>).</li>
          <li><strong>Photos:</strong> download the storage buckets as described in the same guide.</li>
        </ul>
      </section>
    </div>
  );
}
