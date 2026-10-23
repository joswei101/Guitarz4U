import { requireUser, getProfile } from "@/lib/auth";
import { AccountNav } from "@/components/account/AccountNav";
import { signOutAction } from "@/app/(site)/(auth)/actions";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  const profile = await getProfile();
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[15rem_1fr]">
      <aside>
        <div className="card p-4 lg:sticky lg:top-24">
          <p className="truncate font-display text-lg text-walnut">{profile?.full_name || "My account"}</p>
          <p className="truncate text-xs text-ink-soft">{user.email}</p>
          <AccountNav isAdmin={profile?.role === "admin"} />
          <form action={signOutAction} className="mt-3 border-t border-line pt-3">
            <button type="submit" className="btn btn-outline btn-sm w-full">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
