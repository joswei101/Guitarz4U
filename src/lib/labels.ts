// Human-readable labels for the codes stored in the database.

export const CATEGORIES = {
  electric: 'Electric guitars',
  bass: 'Bass guitars',
  acoustic: 'Acoustic guitars',
  classical: 'Classical guitars',
  'electro-acoustic': 'Electro-acoustic guitars',
} as const;
export type Category = keyof typeof CATEGORIES;
export const CATEGORY_SINGULAR: Record<Category, string> = {
  electric: 'Electric guitar',
  bass: 'Bass guitar',
  acoustic: 'Acoustic guitar',
  classical: 'Classical guitar',
  'electro-acoustic': 'Electro-acoustic guitar',
};

export const CONDITIONS = {
  excellent: 'Excellent',
  'very-good': 'Very good',
  good: 'Good',
  fair: 'Fair',
  'needs-repair': 'Needs repair / project',
} as const;
export type Condition = keyof typeof CONDITIONS;

export const PRODUCT_STATUS = {
  draft: 'Draft (hidden)',
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  archived: 'Archived (hidden)',
} as const;

export const RESERVATION_STATUS = {
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
  released: 'Released',
  converted: 'Completed (sold)',
} as const;

export const ENQUIRY_STATUS = {
  new: 'New',
  contacted: 'Contacted',
  agreed: 'Sale agreed',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

export const OFFER_STATUS = {
  new: 'New',
  'under-review': 'Under review',
  countered: 'Counter-offer made',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
} as const;

export const SELLER_STATUS = {
  received: 'Received',
  'under-review': 'Under review',
  'awaiting-inspection': 'Awaiting inspection',
  'offer-sent': 'Offer sent',
  negotiating: 'Negotiating',
  'offer-accepted': 'Offer accepted',
  'offer-declined': 'Offer declined',
  'handover-arranged': 'Handover arranged',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

export const SELLER_CONDITIONS = {
  working: 'Working',
  'needs-repair': 'Needs repair',
  broken: 'Broken',
  incomplete: 'Incomplete (missing parts)',
} as const;

export const REPAIR_STATUS = {
  'request-received': 'Request received',
  'under-review': 'Under review',
  'awaiting-quote-approval': 'Awaiting quote approval',
  approved: 'Approved',
  'repair-in-progress': 'Repair in progress',
  'awaiting-parts': 'Awaiting parts',
  'repair-completed': 'Repair completed',
  'ready-for-collection': 'Ready for collection',
  collected: 'Collected',
  cancelled: 'Cancelled',
} as const;

export const REPAIR_SERVICES = {
  strings: 'String replacement',
  setup: 'Setup and action adjustment',
  fretwork: 'Fretwork',
  diagnosis: 'Diagnosis and troubleshooting',
  body: 'Body repairs',
  cleaning: 'Cleaning and maintenance',
  pickups: 'Pickup replacement',
  broken: 'Broken guitar repairs',
  'nut-saddle': 'Nut and saddle replacement',
  intonation: 'Intonation and tuning',
} as const;

export const QUOTE_STATUS = {
  sent: 'Awaiting your approval',
  approved: 'Approved',
  declined: 'Declined',
  superseded: 'Replaced by a newer quote',
  withdrawn: 'Withdrawn',
} as const;

export const CONTACT_METHODS = { email: 'Email', whatsapp: 'WhatsApp', phone: 'Phone call' } as const;

export const PAYMENT_METHODS = { eft: 'EFT / bank transfer', cash: 'Cash', other: 'Other (agreed)' } as const;

export const REVIEW_TOPICS = {
  purchase: 'Buying a guitar',
  repair: 'A repair',
  selling: 'Selling/giving a guitar',
  general: 'General',
} as const;

export const PERMISSIONS = {
  inventory: 'Products & inventory',
  reservations: 'Reservations',
  enquiries: 'Purchase enquiries, offers & messages',
  sellers: 'Seller enquiries',
  repairs: 'Repairs',
  payments: 'Record payments',
  customers: 'Customer accounts (view)',
  reviews: 'Review moderation',
  content: 'Website content & FAQs',
  reports: 'Analytics & reports',
  settings: 'Settings & email log',
  audit: 'Audit log',
} as const;
export type Permission = keyof typeof PERMISSIONS;

export function label<T extends Record<string, string>>(map: T, key: string | null | undefined): string {
  if (!key) return '—';
  return (map as Record<string, string>)[key] ?? key;
}

/** Tone used by status badges. */
export function statusTone(status: string): 'good' | 'warn' | 'bad' | 'info' | 'muted' {
  if (['available', 'active', 'approved', 'accepted', 'offer-accepted', 'completed', 'collected',
       'ready-for-collection', 'repair-completed', 'converted', 'sent-ok', 'agreed'].includes(status)) return 'good';
  if (['reserved', 'awaiting-quote-approval', 'sent', 'offer-sent', 'negotiating', 'countered',
       'awaiting-inspection', 'awaiting-parts', 'pending', 'new', 'request-received', 'received'].includes(status)) return 'warn';
  if (['sold', 'cancelled', 'declined', 'offer-declined', 'expired', 'rejected', 'removed', 'failed', 'withdrawn'].includes(status)) return 'bad';
  if (['draft', 'archived', 'superseded', 'released', 'skipped'].includes(status)) return 'muted';
  return 'info';
}
