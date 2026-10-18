import { cn } from "./cn";

/** A guitar drawn as the letter "I" — headstock, neck and body. */
export function GuitarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 100" className={className} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <path d="M10 2h8l1 13h-10z" />
        <circle cx="7.5" cy="5" r="1.6" />
        <circle cx="7.5" cy="10" r="1.6" />
        <circle cx="20.5" cy="5" r="1.6" />
        <circle cx="20.5" cy="10" r="1.6" />
        <rect x="11.6" y="15" width="4.8" height="44" rx="1" />
        <path d="M14 56c-6.5 0-10 4-10 9 0 3.2 1.8 5 1.8 7.2 0 2-3.8 4.5-3.8 10.3C2 91 7.5 98 14 98s12-7 12-15.5c0-5.8-3.8-8.3-3.8-10.3 0-2.2 1.8-4 1.8-7.2 0-5-3.5-9-10-9z" />
      </g>
      <g fill="#0A0A0A">
        <circle cx="14" cy="73" r="4" />
        <rect x="9" y="86" width="10" height="2.4" rx="1" />
      </g>
      <g stroke="#0A0A0A" strokeWidth="0.5">
        <line x1="13" y1="15" x2="13" y2="87" />
        <line x1="15" y1="15" x2="15" y2="87" />
      </g>
    </svg>
  );
}

/** The Guitarz4U wordmark: "GU[guitar]TARZ" in white, "4U" in electric orange. */
export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = { sm: "text-xl", md: "text-2xl", lg: "text-4xl", xl: "text-6xl sm:text-7xl" };
  return (
    <span className={cn("inline-flex items-end font-display font-bold uppercase leading-none tracking-wider text-bone", sizes[size], className)} aria-label="Guitarz4U" role="img">
      <span aria-hidden="true">GU</span>
      <GuitarGlyph className="mx-[0.02em] h-[1.12em] w-auto -translate-y-[0.02em] text-amp" />
      <span aria-hidden="true">TARZ</span>
      <span aria-hidden="true" className="text-amp">4U</span>
    </span>
  );
}
