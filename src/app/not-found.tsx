import { ButtonLink } from "@/components/ui/button";
import { GuitarGlyph } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center py-24 text-center">
      <GuitarGlyph className="h-32 w-auto rotate-12 text-amp" />
      <p className="mt-6 font-display text-7xl text-bone">404</p>
      <h1 className="mt-2 font-display text-2xl uppercase tracking-wide text-bone">This page is out of tune</h1>
      <p className="mt-3 max-w-md text-bone-muted">The page you're looking for doesn't exist, or the item has already found a new home.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/shop">Browse the shop</ButtonLink>
        <ButtonLink href="/" variant="outline">Go home</ButtonLink>
      </div>
    </div>
  );
}
