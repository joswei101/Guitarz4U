// Small inline SVG icon set (no icon font or external requests).
type P = { className?: string; title?: string };
const base = (title?: string) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": title ? undefined : true,
  role: title ? "img" : undefined,
});

export const IconCart = ({ className, title }: P) => (
  <svg {...base(title)} className={className}>{title && <title>{title}</title>}<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" /><circle cx="10" cy="20.5" r="1" /><circle cx="17" cy="20.5" r="1" /></svg>
);
export const IconHeart = ({ className, title, filled }: P & { filled?: boolean }) => (
  <svg {...base(title)} className={className} fill={filled ? "currentColor" : "none"}>{title && <title>{title}</title>}<path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.8 4 7.3 4c2 0 3.6 1.1 4.7 2.7C13.1 5.1 14.7 4 16.7 4c3.5 0 5.7 3.6 4.5 7.1-1.7 4.8-9.2 9.4-9.2 9.4z" /></svg>
);
export const IconUser = ({ className, title }: P) => (
  <svg {...base(title)} className={className}>{title && <title>{title}</title>}<circle cx="12" cy="8" r="4" /><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" /></svg>
);
export const IconSearch = ({ className, title }: P) => (
  <svg {...base(title)} className={className}>{title && <title>{title}</title>}<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconMenu = ({ className }: P) => (
  <svg {...base()} className={className}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
);
export const IconClose = ({ className }: P) => (
  <svg {...base()} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconBell = ({ className, title }: P) => (
  <svg {...base(title)} className={className}>{title && <title>{title}</title>}<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const IconShare = ({ className }: P) => (
  <svg {...base()} className={className}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" /></svg>
);
export const IconWrench = ({ className }: P) => (
  <svg {...base()} className={className}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></svg>
);
export const IconTag = ({ className }: P) => (
  <svg {...base()} className={className}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
);
export const IconShield = ({ className }: P) => (
  <svg {...base()} className={className}><path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const IconHandshake = ({ className }: P) => (
  <svg {...base()} className={className}><path d="m11 17 2 2a1.4 1.4 0 0 0 2-2" /><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2L15 11l-3 1-2-2 3-3h3l4 4" /><path d="M3 12l3-3 4 4-2 2a1.4 1.4 0 0 1-2 0z" /><path d="M7 6 4 9" /></svg>
);
export const IconGuitar = ({ className }: P) => (
  <svg {...base()} className={className}><path d="m14 10 6-6M18.5 2.5l3 3" /><path d="M11.5 9.5c-1.4-.9-3.4-.6-4.4.7-.7.9-.6 1.8-1.3 2.4-.8.6-2 .4-3 1.4-1.6 1.6-1.2 4.4.8 6.4s4.8 2.4 6.4.8c1-1 .8-2.2 1.4-3 .6-.7 1.5-.6 2.4-1.3 1.3-1 1.6-3 .7-4.4" /><circle cx="9" cy="15" r="1.5" /></svg>
);
export const IconWhatsApp = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.8c.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.4-.2z" /></svg>
);
export const IconMail = ({ className }: P) => (
  <svg {...base()} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
export const IconPin = ({ className }: P) => (
  <svg {...base()} className={className}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const IconClock = ({ className }: P) => (
  <svg {...base()} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
