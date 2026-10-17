import type { Role } from "@prisma/client";

/**
 * Server-side permission matrix. Every admin page, action and API route checks one of these
 * through requirePermission(); hiding buttons in the UI is never relied on for security.
 */
export const PERMISSIONS = {
  "dashboard:view": ["ADMIN", "CONTENT_MANAGER"],
  "finance:view": ["ADMIN"],
  "inventory:view": ["ADMIN", "CONTENT_MANAGER"],
  "inventory:edit-content": ["ADMIN", "CONTENT_MANAGER"],
  "inventory:edit-pricing": ["ADMIN"],
  "inventory:change-status": ["ADMIN"],
  "inventory:delete": ["ADMIN"],
  "categories:manage": ["ADMIN"],
  "enquiries:manage": ["ADMIN"],
  "orders:manage": ["ADMIN"],
  "refunds:manage": ["ADMIN"],
  "repairs:manage": ["ADMIN"],
  "customers:manage": ["ADMIN"],
  "reviews:moderate": ["ADMIN"],
  "questions:answer": ["ADMIN", "CONTENT_MANAGER"],
  "questions:publish": ["ADMIN"],
  "contact:manage": ["ADMIN", "CONTENT_MANAGER"],
  "content:draft": ["ADMIN", "CONTENT_MANAGER"],
  "content:publish": ["ADMIN"],
  "newsletter:manage": ["ADMIN"],
  "discounts:manage": ["ADMIN"],
  "reports:view": ["ADMIN"],
  "audit:view": ["ADMIN"],
  "settings:manage": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function isStaff(role: Role | null | undefined): boolean {
  return role === "ADMIN" || role === "CONTENT_MANAGER";
}
