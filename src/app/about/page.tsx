import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Markdown } from "@/components/ui/Markdown";
import { ABOUT_DEFAULT } from "@/content/copy";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = {
  title: "About Guitarz4U",
  description: "Guitarz4U gives pre-owned guitars a new life, with honest descriptions and friendly, personal service in Johannesburg.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader eyebrow="Our story" title="About Guitarz4U">
        Second-hand equipment, first-hand service.
      </PageHeader>
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_320px]">
        <Markdown>{s.about_body || ABOUT_DEFAULT}</Markdown>
        <aside className="card h-fit p-6 text-center">
          <LogoMark className="mx-auto h-20 w-20" />
          <p className="mt-3 font-display text-xl">Guitarz4U</p>
          <p className="text-sm text-tan">Sandringham, Johannesburg</p>
          <p className="mt-3 text-sm">Social: @{s.social_handle}</p>
          <p className="mt-1 text-sm font-semibold">{s.closed_notice}</p>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/shop" className="btn btn-primary">
              Browse the shop
            </Link>
            <Link href="/contact" className="btn btn-outline">
              Get in touch
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
