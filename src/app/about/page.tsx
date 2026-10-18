import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { ContentPage } from "@/components/content-page";
import { Card } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPage("about");
  return { title: p?.title, description: p?.metaDescription, alternates: { canonical: "/about" } };
}

export default function AboutPage() {
  return (
    <ContentPage slug="about" eyebrow="Our story">
      <Card className="space-y-3">
        <p className="font-display text-lg uppercase text-amp">{site.tagline}</p>
        <p className="text-sm text-bone-muted">{site.area}. Collection only. {site.hoursNote}</p>
        <ButtonLink href="/contact" variant="outline" size="sm">Get in touch</ButtonLink>
      </Card>
    </ContentPage>
  );
}
