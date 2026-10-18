import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminTitle, cleanSearch } from "@/components/admin/AdminUi";
import { DataRequestActions } from "@/components/admin/DataRequestActions";
import { StatusBadge } from "@/components/ui/Badges";
import { Pagination } from "@/components/ui/Pagination";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata = { title: "Customers & privacy" };
const PER = 40;

export default async function AdminCustomers({ searchParams }: PageProps<"/admin/customers">) {
  const sp = await searchParams;
  const tab = sp.tab === "requests" ? "requests" : "customers";
  const q = cleanSearch(sp.q);
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase.from("profiles").select("id, full_name, email, phone, role, created_at", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PER, page * PER - 1);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const [customers, requests] = await Promise.all([
    tab === "customers" ? query : Promise.resolve({ data: [], count: 0 }),
    supabase.from("data_requests").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  const userIds = [...new Set((requests.data ?? []).map((r) => r.user_id).filter((x): x is string => Boolean(x)))];
  const { data: profs } = userIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds) : { data: [] };
  const profileOf = (uid: string | null) => (profs ?? []).find((p) => p.id === uid);
  const pendingCount = (requests.data ?? []).filter((r) => r.status === "pending").length;
  return (
    <div>
      <AdminTitle title="Customers & privacy" />
      <nav className="mb-4 flex gap-2" aria-label="Tabs">
        <Link href="/admin/customers" className={`btn btn-sm ${tab === "customers" ? "btn-primary" : "btn-ghost"}`}>Customers</Link>
        <Link href="/admin/customers?tab=requests" className={`btn btn-sm ${tab === "requests" ? "btn-primary" : "btn-ghost"}`}>
          Privacy requests {pendingCount > 0 && <span className="badge badge-warning">{pendingCount}</span>}
        </Link>
      </nav>
      {tab === "customers" ? (
        <>
          <form className="card mb-4 flex gap-2 p-3" action="/admin/customers">
            <label htmlFor="cq" className="sr-only">Search customers</label>
            <input id="cq" name="q" defaultValue={q} className="input" placeholder="Name, email or phone" />
            <button className="btn btn-primary">Search</button>
          </form>
          <div className="card overflow-x-auto">
            <table className="table-g4u">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead>
              <tbody>
                {(customers.data ?? []).map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/admin/customers/${c.id}`} className="link font-semibold">{c.full_name || "(no name)"}</Link> {c.role === "admin" && <span className="badge badge-gold">Admin</span>}</td>
                    <td className="break-all">{c.email}</td>
                    <td>{c.phone ?? "—"}</td>
                    <td className="whitespace-nowrap">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={Math.ceil((customers.count ?? 0) / PER)} makeHref={(p) => `/admin/customers?${new URLSearchParams({ q, page: String(p) })}`} />
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-tan">
            Customers can download their own data instantly from their account. Deletion requests are processed here: the login is deleted and contact details are removed, while purchase, offer and repair records are kept anonymised for business records.
          </p>
          {(requests.data ?? []).map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  <strong>{r.request_type === "deletion" ? "Account deletion" : "Data export"}</strong> — {profileOf(r.user_id)?.full_name ?? (r.user_id ? "Customer" : "Deleted account")} {profileOf(r.user_id)?.email && `(${profileOf(r.user_id)?.email})`}
                </p>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-xs text-tan">{formatDateTime(r.created_at)}</p>
              {r.reason && <p className="mt-1 text-sm">Reason: {r.reason}</p>}
              {r.status === "pending" && <div className="mt-3"><DataRequestActions id={r.id} type={r.request_type} userId={r.user_id} /></div>}
              {r.admin_response && <p className="mt-2 text-sm text-tan">Response: {r.admin_response}</p>}
            </div>
          ))}
          {!requests.data?.length && <div className="card p-6 text-center text-tan">No privacy requests.</div>}
        </div>
      )}
    </div>
  );
}
