"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Bell, BookOpen, Boxes, CalendarClock, ClipboardList, Database, FileText, Guitar, Inbox, Settings, ShieldCheck, Star, Tags, Users, Wrench,
} from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Overview", icon: BarChart3, key: "" },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, key: "unread_notifications" },
  { href: "/admin/products", label: "Inventory", icon: Boxes, key: "" },
  { href: "/admin/catalogue", label: "Categories & brands", icon: Tags, key: "" },
  { href: "/admin/requests", label: "Purchase requests", icon: ClipboardList, key: "purchase_requests" },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarClock, key: "reservations" },
  { href: "/admin/submissions", label: "Seller submissions", icon: Guitar, key: "seller_submissions" },
  { href: "/admin/repairs", label: "Repairs", icon: Wrench, key: "repairs" },
  { href: "/admin/customers", label: "Customers & privacy", icon: Users, key: "data_requests" },
  { href: "/admin/reviews", label: "Reviews", icon: Star, key: "reviews" },
  { href: "/admin/messages", label: "Messages", icon: Inbox, key: "messages" },
  { href: "/admin/content", label: "Website content", icon: FileText, key: "" },
  { href: "/admin/settings", label: "Settings", icon: Settings, key: "" },
  { href: "/admin/exports", label: "Exports & backups", icon: Database, key: "" },
  { href: "/admin/audit", label: "Audit log", icon: ShieldCheck, key: "" },
  { href: "/admin/guide", label: "Owner's guide", icon: BookOpen, key: "" },
];

export function AdminNav({ counts }: { counts: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
        {LINKS.map(({ icon: Icon, ...l }) => {
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          const n = l.key ? counts[l.key] ?? 0 : 0;
          return (
            <li key={l.href} className="flex-none">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm ${active ? "bg-gold text-espresso font-semibold" : "text-cream/85 hover:bg-white/5"}`}
              >
                <Icon className="h-4 w-4 flex-none" aria-hidden />
                <span className="flex-1">{l.label}</span>
                {n > 0 && <span className="rounded-full bg-cream px-2 text-xs font-bold text-espresso">{n}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
