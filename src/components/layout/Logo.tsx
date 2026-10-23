import Link from "next/link";

/** Guitarz4U plectrum-and-headstock mark. Pure SVG paths, no external fonts. */
export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <path
        d="M50 96C30 80 6 52 8 27 9.5 10 29 4 50 4s40.5 6 42 23c2 25-22 53-42 69Z"
        fill="#38271F"
        stroke="#B08A52"
        strokeWidth="4"
      />
      <path d="M41 70 39 31c0-8 5-13 11-13s11 5 11 13l-2 39Z" fill="#B08A52" />
      <rect x="45.5" y="70" width="9" height="20" rx="1.5" fill="#806044" />
      <rect x="43" y="68" width="14" height="3" rx="1" fill="#F5EBD8" />
      {[32, 44, 56].map((y) => (
        <g key={y} fill="#F5EBD8">
          <circle cx={31} cy={y} r={3.6} />
          <rect x={33} y={y - 1} width={7} height={2} rx={1} />
          <circle cx={69} cy={y} r={3.6} />
          <rect x={60} y={y - 1} width={7} height={2} rx={1} />
        </g>
      ))}
      <g stroke="#38271F" strokeWidth="0.9" opacity="0.6">
        <line x1="46.5" y1="30" x2="46.5" y2="69" />
        <line x1="50" y1="28" x2="50" y2="69" />
        <line x1="53.5" y1="30" x2="53.5" y2="69" />
      </g>
    </svg>
  );
}

export function Logo({ dark = true, showTagline = true }: { dark?: boolean; showTagline?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3 no-underline" aria-label="Guitarz4U home">
      <LogoMark className="h-11 w-11 shrink-0 transition-transform duration-300 group-hover:-rotate-6" />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-[1.45rem] font-semibold tracking-tight ${dark ? "text-cream-light" : "text-walnut"}`}
        >
          Guitarz<span className={dark ? "text-gold-light" : "text-gold-ink"}>4U</span>
        </span>
        {showTagline && (
          <span
            className={`mt-1 hidden text-[0.62rem] font-semibold uppercase tracking-[0.18em] sm:block xl:hidden 2xl:block ${dark ? "text-gold" : "text-muted"}`}
          >
            Second-hand equipment, first-hand service
          </span>
        )}
      </span>
    </Link>
  );
}
