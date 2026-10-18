"use client";

import { usePathname } from "next/navigation";

/** Hides the floating WhatsApp button inside the admin dashboard, where it would cover controls. */
export function WhatsAppFloatGate({ children }: { children: React.ReactNode }) {
  return usePathname()?.startsWith("/admin") ? null : <>{children}</>;
}
