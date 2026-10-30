import type { Permission } from '@/lib/labels';

/** Datasets the owner can download from Admin → Export & backup. */
export const DATASETS: Record<string, { label: string; table: string; perm: Permission; order: string }> = {
  products: { label: 'Products', table: 'products', perm: 'inventory', order: 'created_at' },
  product_private: { label: 'Product private records (serials, costs)', table: 'product_private', perm: 'inventory', order: 'updated_at' },
  product_images: { label: 'Product photo list', table: 'product_images', perm: 'inventory', order: 'created_at' },
  reservations: { label: 'Reservations', table: 'reservations', perm: 'reservations', order: 'created_at' },
  enquiries: { label: 'Purchase enquiries', table: 'enquiries', perm: 'enquiries', order: 'created_at' },
  enquiry_items: { label: 'Purchase enquiry items', table: 'enquiry_items', perm: 'enquiries', order: 'id' },
  offers: { label: 'Offers', table: 'offers', perm: 'enquiries', order: 'created_at' },
  messages: { label: 'Messages & questions', table: 'messages', perm: 'enquiries', order: 'created_at' },
  seller_enquiries: { label: 'Seller enquiries', table: 'seller_enquiries', perm: 'sellers', order: 'created_at' },
  seller_offers: { label: 'Seller offers', table: 'seller_offers', perm: 'sellers', order: 'created_at' },
  repairs: { label: 'Repairs', table: 'repairs', perm: 'repairs', order: 'created_at' },
  repair_quotes: { label: 'Repair quotes', table: 'repair_quotes', perm: 'repairs', order: 'created_at' },
  repair_work_log: { label: 'Repair work log', table: 'repair_work_log', perm: 'repairs', order: 'created_at' },
  submission_files: { label: 'Uploaded file list', table: 'submission_files', perm: 'repairs', order: 'created_at' },
  payments: { label: 'Payments (manual records)', table: 'payments', perm: 'payments', order: 'created_at' },
  status_history: { label: 'Status history', table: 'status_history', perm: 'audit', order: 'id' },
  customers: { label: 'Customer accounts', table: 'profiles', perm: 'customers', order: 'created_at' },
  reviews: { label: 'Reviews', table: 'reviews', perm: 'reviews', order: 'created_at' },
  stock_alerts: { label: 'Stock alerts', table: 'stock_alerts', perm: 'inventory', order: 'created_at' },
  site_content: { label: 'Website content', table: 'site_content', perm: 'content', order: 'key' },
  faqs: { label: 'FAQs', table: 'faqs', perm: 'content', order: 'sort_order' },
  settings: { label: 'Settings', table: 'settings', perm: 'settings', order: 'id' },
  email_outbox: { label: 'Email log', table: 'email_outbox', perm: 'settings', order: 'created_at' },
  audit_log: { label: 'Audit log', table: 'audit_log', perm: 'audit', order: 'id' },
};

/** CSV with protection against spreadsheet formula injection. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((c) => c !== 'search');
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return '';
    let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
}
