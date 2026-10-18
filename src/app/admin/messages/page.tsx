import { createClient } from "@/lib/supabase/server";
import { AdminTitle } from "@/components/admin/AdminUi";
import { ActionButton } from "@/components/account/ActionButton";
import { StatusBadge } from "@/components/ui/Badges";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { setMessageStatus } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Messages" };

export default async function AdminMessages({ searchParams }: PageProps<"/admin/messages">) {
  const sp = await searchParams;
  const all = sp.all === "1";
  const supabase = await createClient();
  let q = supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(100);
  if (!all) q = q.neq("status", "closed");
  const { data } = await q;
  return (
    <div>
      <AdminTitle title="Contact messages" actions={<a href={all ? "/admin/messages" : "/admin/messages?all=1"} className="btn btn-ghost btn-sm">{all ? "Hide closed" : "Show closed"}</a>}>
        Messages from the contact form. Reply by WhatsApp or email, then mark as replied.
      </AdminTitle>
      <ul className="space-y-3">
        {(data ?? []).map((m) => (
          <li key={m.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{m.subject || "General enquiry"} — {m.name}</p>
              <StatusBadge status={m.status === "new" ? "pending" : m.status === "replied" ? "completed" : "cancelled"} label={m.status} />
            </div>
            <p className="text-xs text-tan">{formatDateTime(m.created_at)}</p>
            <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {m.phone && (
                <a href={whatsappLink(m.phone, `Hi ${m.name.split(" ")[0]}, thanks for your message to Guitarz4U.`)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm">
                  <WhatsAppIcon className="h-4 w-4" /> {m.phone}
                </a>
              )}
              {m.email && <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + (m.subject || "Your message to Guitarz4U"))}`} className="btn btn-outline btn-sm">Email {m.email}</a>}
              {m.status !== "replied" && <ActionButton action={setMessageStatus.bind(null, m.id, "replied")} className="btn btn-ghost btn-sm">Mark replied</ActionButton>}
              {m.status !== "closed" && <ActionButton action={setMessageStatus.bind(null, m.id, "closed")} className="btn btn-ghost btn-sm">Close</ActionButton>}
            </div>
          </li>
        ))}
        {!data?.length && <li className="card p-6 text-center text-tan">No messages.</li>}
      </ul>
    </div>
  );
}
