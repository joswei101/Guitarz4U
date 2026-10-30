import { profileHasPerm, requireStaff } from '@/lib/auth';
import { DATASETS } from '@/lib/exports';

export default async function ExportAdmin() {
  const { profile } = await requireStaff();
  const allowed = Object.entries(DATASETS).filter(([, d]) => profileHasPerm(profile, d.perm));
  return (
    <>
      <h1>Export &amp; backup</h1>
      <section className="card stack">
        <h2 style={{ fontSize: '1.15rem' }}>Full backup (JSON)</h2>
        <p>Downloads every table you have access to in one file. Keep it somewhere safe and private — it contains customer personal information.</p>
        <div><a className="btn btn-primary" href="/admin/export/full" download>Download full backup</a></div>
        <p className="small muted">Uploaded photos are stored separately. See docs/BACKUP-AND-MIGRATION.md for backing up photos and for a complete database backup with the Supabase CLI.</p>
      </section>
      <section className="card">
        <h2 style={{ fontSize: '1.15rem' }}>Spreadsheets (CSV)</h2>
        <p className="small muted">Opens in Excel, Google Sheets or Numbers.</p>
        <ul className="check-grid" style={{ listStyle: 'none', padding: 0 }}>
          {allowed.map(([k, d]) => <li key={k}><a href={`/admin/export/${k}`} download>{d.label}</a></li>)}
        </ul>
      </section>
    </>
  );
}
