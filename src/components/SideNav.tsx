"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SideNav({ title, links, signOut }: { title: string; links: { href: string; label: string; count?: number }[]; signOut?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const root = links[0]?.href;
  return (
    <aside className="side-nav">
      <h2>{title}</h2>
      <nav aria-label="Section">
        {links.map((l) => {
          const current = l.href === root ? pathname === l.href : pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}>
              <span>{l.label}</span>
              {l.count ? <span className="count" aria-label={`${l.count} new`}>{l.count}</span> : null}
            </Link>
          );
        })}
        {signOut && (
          <a
            href="#"
            onClick={async (e) => {
              e.preventDefault();
              await authClient.signOut();
              router.push("/");
              router.refresh();
            }}
          >
            Log out
          </a>
        )}
      </nav>
    </aside>
  );
}
