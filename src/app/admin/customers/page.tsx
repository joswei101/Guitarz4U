import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { ConfirmCheckboxForm } from "@/components/admin/AdminForms";
import { processDeletionAction, rejectDataRequestAction } from "@/app/admin/actions";
import { formatDate, formatDateTime } from "@/lib/format";
import { CONTACT_METHOD_LABELS, type ContactMethod } from "@/lib/constants";
import { sanitiseSearch } from "@/lib/data/products";

export const metadata = { title: "Customers & privacy" };

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, email, full_name, phone, preferred_contact, role, is_anonymised, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const term = q ? sanitiseSearch(q) : "";
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  const [{ data: profiles }, { data: requests }] = await Promise.all([
    query,
    supabase.from("data_requests").select("id, user_id, user_email, request_type, status, reason, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  const rows = (profiles ?? []) as { id: string; email: string | null; full_name: string | null; phone: string | null; preferred_contact: ContactMethod; role: string; is_anonymised: boolean; created_at: string }[];
  const dataRequests = (requests ?? []) as { id: string; user_id: string | null; user_email: string | null; request_type: string; status: string; reason: string | null; created_at: string }[];
  const pending = dataRequests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Customers & privacy requests"
        description="Customer contact details are private. Use them only to manage requests. Process POPIA deletion requests here — business records are kept in anonymised form."
      />

      <section className="card p-5">
        <h2 className="text-xl">Pending privacy requests ({pending.length})</h2>
        {pending.length ? (
          <ul className="mt-3 divide-y divide-line">
            {pending.map((r) => (
              <li key={r.id} className="grid gap-4 py-4 lg:grid-cols-[1fr_22rem]">
                <div className="text-sm">
                  <p className="font-semibold capitalize">{r.request_type} request</p>
                  <p>{r.user_email ?? "Unknown email"} · {formatDateTime(r.created_at)}</p>
                  {r.reason && <p className="text-ink-soft">Reason: {r.reason}</p>}
                  <p className="mt-1 text-xs text-ink-soft">
                    Anonymising replaces names, contact details and messages on their requests with placeholders, removes their reviews, wishlist,
                    alerts and notifications, then deletes the login account (requires SUPABASE_SECRET_KEY on the server).
                  </p>
                </div>
                <div className="space-y-2">
                  {r.request_type === "deletion" && r.user_id && (
                    <ConfirmCheckboxForm
                      action={processDeletionAction}
                      hidden={{ user_id: r.user_id }}
                      checkboxLabel="I confirm I want to permanently anonymise this customer and delete their login."
                      submitLabel="Process deletion"
                      danger
                    />
                  )}
                  <form action={rejectDataRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn-outline btn-sm">Mark as handled / reject</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">No pending privacy requests.</p>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl">Accounts ({rows.length})</h2>
          <form className="flex gap-2" role="search">
            <label htmlFor="cq" className="sr-only">
              Search customers
            </label>
            <input id="cq" name="q" defaultValue={q} placeholder="Name, email or phone" className="input h-10 min-h-0 py-1" />
            <button className="btn btn-outline btn-sm">Search</button>
          </form>
        </div>
        <div className="card overflow-x-auto">
          <table className="table-g4u">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Prefers</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.is_anonymised ? <em className="text-ink-soft">Anonymised</em> : p.full_name || "—"}</td>
                  <td className="break-all">{p.email ?? "—"}</td>
                  <td>{p.phone ?? "—"}</td>
                  <td>{CONTACT_METHOD_LABELS[p.preferred_contact]}</td>
                  <td>{p.role === "admin" ? <span className="badge badge-gold">Admin</span> : "Customer"}</td>
                  <td className="whitespace-nowrap text-ink-soft">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-soft">Administrator roles can only be granted from the Supabase SQL editor or the setup script (see docs/SETUP.md) — never from the website.</p>
      </section>
    </div>
  );
}
