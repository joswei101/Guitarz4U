import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, ContactLinks } from "@/components/admin/AdminUI";
import { StatusBadge } from "@/components/ui/Badge";
import { setEnquiryStatusAction } from "@/app/admin/actions";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Enquiries" };

const LABELS = { new: "New", in_progress: "In progress", closed: "Closed" } as const;

export default async function AdminEnquiries({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("enquiries")
    .select("id, name, email, phone, subject, message, status, created_at, product:products(title, slug)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (show !== "all") query = query.neq("status", "closed");
  const { data } = await query;
  const rows = (data ?? []) as unknown as {
    id: string; name: string; email: string | null; phone: string | null; subject: string; message: string; status: keyof typeof LABELS; created_at: string;
    product: { title: string; slug: string } | null;
  }[];

  return (
    <div>
      <AdminPageHeader
        title="Enquiries"
        description="Messages from the contact form and product question forms. Reply privately by WhatsApp, phone or email."
        actions={
          <Link href={show === "all" ? "/admin/enquiries" : "/admin/enquiries?show=all"} className="btn btn-outline btn-sm">
            {show === "all" ? "Hide closed" : "Show closed"}
          </Link>
        }
      />
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((e) => (
            <li key={e.id} className="card space-y-2 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg">{e.subject}</h2>
                <StatusBadge status={e.status === "new" ? "pending" : e.status === "closed" ? "completed" : "in_progress"} label={LABELS[e.status]} />
              </div>
              <p className="text-sm text-ink-soft">
                {e.name} · {e.email ?? "no email"} · {e.phone ?? "no phone"} · {formatDateTime(e.created_at)}
                {e.product && (
                  <>
                    {" "}
                    · about{" "}
                    <Link href={`/shop/${e.product.slug}`} className="text-gold-ink">
                      {e.product.title}
                    </Link>
                  </>
                )}
              </p>
              <p className="whitespace-pre-line text-sm">{e.message}</p>
              <div className="flex flex-wrap items-center gap-2">
                <ContactLinks name={e.name} phone={e.phone} email={e.email} context={`your enquiry: ${e.subject}`} />
                {(["new", "in_progress", "closed"] as const)
                  .filter((s) => s !== e.status)
                  .map((s) => (
                    <form key={s} action={setEnquiryStatusAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="status" value={s} />
                      <button className="btn btn-outline btn-sm">Mark {LABELS[s].toLowerCase()}</button>
                    </form>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-8 text-center text-ink-soft">No enquiries.</p>
      )}
    </div>
  );
}
