import Link from "next/link";
import { requirePermissionPage } from "@/lib/auth/guards";
import { can, type Permission } from "@/lib/permissions";
import { logoutAction } from "@/app/actions/auth";

export const metadata = { title: { default: "Admin", template: "%s | Guitarz4U admin" }, robots: { index: false, follow: false } };

const NAV: { href: string; label: string; perm: Permission }[] = [
  { href: "/admin", label: "Overview", perm: "dashboard:view" },
  { href: "/admin/products", label: "Inventory", perm: "inventory:view" },
  { href: "/admin/categories", label: "Categories", perm: "categories:manage" },
  { href: "/admin/enquiries", label: "Purchase enquiries", perm: "enquiries:manage" },
  { href: "/admin/orders", label: "Orders", perm: "orders:manage" },
  { href: "/admin/repairs", label: "Repairs", perm: "repairs:manage" },
  { href: "/admin/customers", label: "Customers", perm: "customers:manage" },
  { href: "/admin/reviews", label: "Reviews", perm: "reviews:moderate" },
  { href: "/admin/questions", label: "Product questions", perm: "questions:answer" },
  { href: "/admin/messages", label: "Messages", perm: "contact:manage" },
  { href: "/admin/content", label: "Website content", perm: "content:draft" },
  { href: "/admin/discounts", label: "Discount codes", perm: "discounts:manage" },
  { href: "/admin/newsletter", label: "Newsletter", perm: "newsletter:manage" },
  { href: "/admin/reports", label: "Reports", perm: "reports:view" },
  { href: "/admin/settings", label: "Settings", perm: "settings:manage" },
  { href: "/admin/audit", label: "Audit log", perm: "audit:view" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermissionPage("dashboard:view");
  return (
    <div className="grid min-h-[70vh] lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-ink-500 bg-ink-800 p-4 lg:border-b-0 lg:border-r">
        <p className="font-display text-lg uppercase tracking-wide text-amp">Dashboard</p>
        <p className="mb-4 text-xs text-bone-dim">{user.name} · {user.role === "ADMIN" ? "Owner / admin" : "Content manager"}</p>
        <nav aria-label="Admin">
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {NAV.filter((n) => can(user.role, n.perm)).map((n) => (
              <li key={n.href}><Link href={n.href} className="block rounded-md px-3 py-1.5 text-sm text-bone-muted hover:bg-ink-600 hover:text-amp">{n.label}</Link></li>
            ))}
          </ul>
        </nav>
        <form action={logoutAction} className="mt-6"><button className="px-3 text-xs text-bone-dim underline hover:text-danger">Sign out</button></form>
      </aside>
      <div className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
