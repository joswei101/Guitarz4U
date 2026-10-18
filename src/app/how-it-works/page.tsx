import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { ContentPage } from "@/components/content-page";
import { Card } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPage("how-it-works");
  return { title: p?.title, description: p?.metaDescription, alternates: { canonical: "/how-it-works" } };
}

export default function HowItWorksPage() {
  return (
    <ContentPage slug="how-it-works" eyebrow="The process">
      <Card className="space-y-3">
        <ButtonLink href="/shop" className="w-full">Shop guitars</ButtonLink>
        <ButtonLink href="/sell" variant="outline" className="w-full">Sell your guitar</ButtonLink>
        <ButtonLink href="/repairs/book" variant="outline" className="w-full">Book a repair</ButtonLink>
      </Card>
    </ContentPage>
  );
}
