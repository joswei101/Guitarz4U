import Link from "next/link";

export function LogoMark({ className = "brand-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#241A16" stroke="#B08A52" strokeWidth="2" />
      <circle cx="32" cy="32" r="26.5" fill="none" stroke="#806044" strokeWidth="0.8" strokeDasharray="1.6 1.6" />
      <g fill="none" stroke="#B08A52" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 9v14" />
        <path d="M29.5 9h5l-.6 3h-3.8z" fill="#B08A52" />
        <path d="M30 23c-3.6-1.8-8 .4-8 4.6 0 2.6 1.6 3.7 1.6 5.3 0 1.8-3.1 3.2-3.1 7.4 0 5.6 5 9.2 11.5 9.2s11.5-3.6 11.5-9.2c0-4.2-3.1-5.6-3.1-7.4 0-1.6 1.6-2.7 1.6-5.3 0-4.2-4.4-6.4-8-4.6" />
      </g>
      <text x="32" y="44.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="12.5" fill="#F5EBD8">G4U</text>
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Guitarz4U home">
      <LogoMark />
      <span>
        <span className="brand-word">Guitarz<span>4U</span></span>
        <span className="brand-tag">Second-hand equipment, first-hand service</span>
      </span>
    </Link>
  );
}
