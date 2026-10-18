import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Flash } from "@/components/Flash";
import { requestDataAction } from "../actions";

export default async function PrivacyAndData({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const requests = await query<{ kind: string; status: string; created_at: Date; admin_note: string }>(
    "select kind, status, created_at, admin_note from data_requests where user_id=$1 order by created_at desc",
    [user.id],
  );
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <h1 style={{ fontSize: "2rem" }}>Privacy &amp; your data</h1>
      <p>Under South Africa&apos;s Protection of Personal Information Act (POPIA) you can access, correct and ask us to delete your personal information. See our <Link href="/privacy">privacy policy</Link>.</p>
      <section className="card stack">
        <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Download your data</h2>
        <p style={{ margin: 0 }}>Download a copy of the personal information linked to your account (profile, requests, reservations, submissions, repairs, reviews, wishlist and notifications) as a JSON file.</p>
        <a className="btn btn-primary" href="/api/account/export" download>Download my data</a>
      </section>
      <section className="card stack">
        <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Delete my account</h2>
        <p style={{ margin: 0 }}>Guitarz4U will remove your login and personal details. Records of completed sales may be kept in anonymised form where the law requires us to keep them. We will confirm with you before deleting.</p>
        <form action={requestDataAction} className="form">
          <input type="hidden" name="kind" value="deletion" />
          <div className="field"><label htmlFor="details">Anything we should know? (optional)</label><textarea id="details" name="details" maxLength={2000} rows={3} /></div>
          <button className="btn btn-danger">Request account deletion</button>
        </form>
      </section>
      {requests.length > 0 && (
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>Your requests</h2>
          <ul>{requests.map((r, i) => <li key={i}>{r.kind === "deletion" ? "Account deletion" : "Data export"} — {r.status} ({formatDate(r.created_at)}){r.admin_note ? `: ${r.admin_note}` : ""}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
