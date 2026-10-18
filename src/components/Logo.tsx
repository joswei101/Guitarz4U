import Link from "next/link";

/** Guitarz4U mark: a guitar pick framing a guitar silhouette. */
export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <path
        d="M32 3C51 3 61 13 59 26C57 41 43 56 32 61C21 56 7 41 5 26C3 13 13 3 32 3Z"
        fill="#38271F"
        stroke="#B08A52"
        strokeWidth="3"
      />
      <rect x="29" y="7" width="6" height="7" rx="1.5" fill="#D4B07A" />
      <rect x="30.6" y="12" width="2.8" height="20" fill="#D4B07A" />
      <circle cx="32" cy="35.5" r="6.8" fill="#B08A52" />
      <circle cx="32" cy="44" r="9" fill="#B08A52" />
      <circle cx="32" cy="38.5" r="2.6" fill="#38271F" />
      <rect x="27.5" y="46" width="9" height="2" rx="1" fill="#38271F" />
    </svg>
  );
}

export function Logo({ light = true, showTagline = true }: { light?: boolean; showTagline?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3 no-underline" aria-label="Guitarz4U home">
      <LogoMark className="h-11 w-11 transition-transform duration-300 group-hover:-rotate-6" />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[1.45rem] font-semibold ${light ? "text-ivory" : "text-walnut"}`}>
          Guitarz<span className="text-gold">4</span>U
        </span>
        {showTagline && (
          <span
            className={`mt-1 hidden text-[0.62rem] uppercase tracking-[0.16em] sm:block xl:hidden 2xl:block ${light ? "text-gold-light" : "text-tan"}`}
          >
            Second-hand equipment, first-hand service
          </span>
        )}
      </span>
    </Link>
  );
}
