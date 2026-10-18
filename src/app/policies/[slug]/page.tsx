import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Markdown } from "@/components/ui/Markdown";
import { Alert } from "@/components/ui/Alert";
import { POLICY_DRAFT_NOTICE, PRIVACY_POLICY, RETURNS_POLICY, TERMS, withDate } from "@/content/policies";

const POLICIES = {
  privacy: { title: "Privacy policy", key: "policy_privacy", text: PRIVACY_POLICY, description: "How Guitarz4U collects, uses and protects personal information under POPIA." },
  terms: { title: "Terms & conditions", key: "policy_terms", text: TERMS, description: "Terms for using the Guitarz4U website, purchase requests, reservations, selling and repairs." },
  returns: {
    title: "Returns, refunds, condition & reservations",
    key: "policy_returns",
    text: RETURNS_POLICY,
    description: "Second-hand condition grades, returns and refunds, reservations and collection at Guitarz4U.",
  },
} as const;

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = POLICIES[slug as keyof typeof POLICIES];
  if (!p) return {};
  return { title: p.title, description: p.description, alternates: { canonical: `/policies/${slug}` } };
}

export default async function PolicyPage({ params }: PageProps<"/policies/[slug]">) {
  const { slug } = await params;
  const p = POLICIES[slug as keyof typeof POLICIES];
  if (!p) notFound();
  const s = await getSettings();
  const custom = s[p.key];
  return (
    <>
      <PageHeader eyebrow="Policies" title={p.title} />
      <div className="container-page max-w-3xl py-12">
        {!custom && (
          <Alert tone="warning" className="mb-8">
            {POLICY_DRAFT_NOTICE}
          </Alert>
        )}
        <Markdown>{custom || withDate(p.text, "October 2026")}</Markdown>
      </div>
    </>
  );
}
