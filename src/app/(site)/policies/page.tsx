import type { Metadata } from "next";
import { EditablePageView } from "@/components/content/EditablePageView";
import { DEFAULT_PAGES } from "@/content/pages";

const page = DEFAULT_PAGES["policies"];

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: "/policies" },
};

export default function Page() {
  return <EditablePageView slug="policies" eyebrow="Policies" />;
}
