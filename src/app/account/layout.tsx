import Link from "next/link";
import { requireUserPage } from "@/lib/auth/guards";
import { logoutAction } from "@/app/actions/auth";
import { isStaff } from "@/lib/permissions";

const LINKS = [
  ["/account", "Overview"],
  ["/account/orders", "Orders"],
  ["/account/repairs", "Repairs"],
  ["/account/enquiries", "Items I've offered"],
  ["/account/wishlist", "Wishlist"],
  ["/account/reviews", "Reviews"],
  ["/account/support", "Support"],
  ["/account/settings", "Settings & privacy"],
] as const;

export const metadata = { robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage("/account");
  return (
    <div className="container grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
      <aside>
        <p className="font-display text-xl uppercase tracking-wide">My account</p>
        <p className="mb-4 truncate text-sm text-bone-dim">{user.email}</p>
        <nav aria-label="Account">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {LINKS.map(([href, label]) => (
              <li key={href}><Link href={href} className="block rounded-md bg-ink-700 px-3 py-1.5 text-sm text-bone-muted hover:text-amp lg:bg-transparent">{label}</Link></li>
            ))}
            {isStaff(user.role) && <li><Link href="/admin" className="block rounded-md px-3 py-1.5 text-sm text-amp">Admin dashboard</Link></li>}
          </ul>
        </nav>
        <form action={logoutAction} className="mt-4"><button className="px-3 text-sm text-bone-dim underline hover:text-danger" type="submit">Sign out</button></form>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
