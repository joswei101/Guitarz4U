// Small inline icon set (stroke icons, 24px grid).
type P = { className?: string };
const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const CartIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.8a1.5 1.5 0 0 0 1.5-1.1L21.5 7H6" /></svg>);
export const HeartIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><path d="M12 20.5s-8-4.7-8-10.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.9c0 5.9-8 10.6-8 10.6z" /></svg>);
export const UserIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>);
export const SearchIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const MenuIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><path d="M3 6h18M3 12h18M3 18h18" /></svg>);
export const CloseIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const MailIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>);
export const WrenchIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 1-5-5L13 2l1.7 4.3z" /></svg>);
export const ShieldIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>);
export const TagIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>);
export const ChatIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><path d="M21 12a8.5 8.5 0 0 1-12.5 7.5L3 21l1.6-5A8.5 8.5 0 1 1 21 12z" /></svg>);
export const PinIcon = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...s}><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>);
export const WhatsAppIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
  </svg>
);
