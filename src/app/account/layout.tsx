import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AccountNav } from "@/components/account/AccountNav";
import { signOut } from "@/app/actions/auth";

export const metadata: Metadata = { title: { default: "My account", template: "%s | My account | Guitarz4U" }, robots: { index: false } };

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const { user, profile } = await requireUser("/account");
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="text-3xl">Hello{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
        </div>
        <form action={signOut}>
          <button className="btn btn-outline btn-sm">Sign out</button>
        </form>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <AccountNav unread={count ?? 0} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
