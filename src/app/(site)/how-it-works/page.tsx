import type { Metadata } from "next";
import { EditablePageView } from "@/components/content/EditablePageView";
import { DEFAULT_PAGES } from "@/content/pages";

const page = DEFAULT_PAGES["how-it-works"];

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: "/how-it-works" },
};

export default function Page() {
  return <EditablePageView slug="how-it-works" eyebrow="Buying & selling" />;
}
