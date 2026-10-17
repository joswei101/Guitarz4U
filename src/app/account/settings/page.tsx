import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { addAddressAction, changePasswordAction, deleteAddressAction, requestAccountDeletionAction, updatePreferencesAction, updateProfileAction } from "@/app/actions/account";
import { features } from "@/lib/env";
import { Alert, Card } from "@/components/ui/misc";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/forms/action-form";

export const metadata = { title: "Settings & privacy" };

export default async function SettingsPage() {
  const user = await requireUserPage("/account/settings");
  const [profile, addresses, pendingDeletion] = await Promise.all([
    prisma.customerProfile.findUnique({ where: { userId: user.id } }),
    prisma.address.findMany({ where: { userId: user.id } }),
    prisma.accountDeletionRequest.findFirst({ where: { userId: user.id, status: "PENDING" } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">Settings & privacy</h1>
      <Card>
        <h2 className="font-display text-xl uppercase">Profile</h2>
        <ActionForm action={updateProfileAction} submitLabel="Save profile" className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" required><Input id="name" name="name" defaultValue={user.name} required /></Field>
          <Field label="Phone / WhatsApp" htmlFor="phone"><Input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} /></Field>
          <p className="text-sm text-bone-dim sm:col-span-2">Email: {user.email} {user.emailVerifiedAt ? "(verified)" : "(not verified)"}</p>
        </ActionForm>
      </Card>
      <Card>
        <h2 className="font-display text-xl uppercase">Notification preferences</h2>
        <ActionForm action={updatePreferencesAction} submitLabel="Save preferences" className="mt-4 space-y-3">
          <Checkbox id="emailOrderUpdates" name="emailOrderUpdates" defaultChecked={profile?.emailOrderUpdates ?? true} label="Email me about my orders (confirmations and receipts are always sent)" />
          <Checkbox id="emailRepairUpdates" name="emailRepairUpdates" defaultChecked={profile?.emailRepairUpdates ?? true} label="Email me repair status updates" />
          <Checkbox id="emailMarketing" name="emailMarketing" defaultChecked={profile?.emailMarketing ?? false} label="Email me occasionally about new stock (marketing)" />
          <Checkbox id="whatsappOptIn" name="whatsappOptIn" defaultChecked={profile?.whatsappOptIn ?? false} label="I consent to receive automated WhatsApp status messages about my orders and repairs at my phone number" />
          {!features.whatsapp() && <p className="text-xs text-bone-dim">Automated WhatsApp messages are not currently active. You can still message us on WhatsApp at any time.</p>}
        </ActionForm>
      </Card>
      <Card>
        <h2 className="font-display text-xl uppercase">Saved addresses</h2>
        <p className="mt-1 text-sm text-bone-muted">Optional — used for receipts. Orders are collection only.</p>
        <ul className="mt-3 space-y-2 text-sm">
          {addresses.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 rounded-md border border-ink-500 p-3">
              <span>{a.label}: {a.line1}{a.line2 ? `, ${a.line2}` : ""}{a.suburb ? `, ${a.suburb}` : ""}, {a.city}, {a.province}, {a.postalCode}</span>
              <form action={deleteAddressAction}><input type="hidden" name="id" value={a.id} /><button className="text-xs text-bone-dim underline hover:text-danger">Remove</button></form>
            </li>
          ))}
        </ul>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-amp">Add an address</summary>
          <ActionForm action={addAddressAction} submitLabel="Save address" className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Label" htmlFor="label"><Input id="label" name="label" defaultValue="Home" /></Field>
            <Field label="Street address" htmlFor="line1" required><Input id="line1" name="line1" required /></Field>
            <Field label="Address line 2" htmlFor="line2"><Input id="line2" name="line2" /></Field>
            <Field label="Suburb" htmlFor="suburb"><Input id="suburb" name="suburb" /></Field>
            <Field label="City" htmlFor="city" required><Input id="city" name="city" required /></Field>
            <Field label="Province" htmlFor="province" required><Input id="province" name="province" required defaultValue="Gauteng" /></Field>
            <Field label="Postal code" htmlFor="postalCode" required><Input id="postalCode" name="postalCode" required inputMode="numeric" /></Field>
          </ActionForm>
        </details>
      </Card>
      <Card>
        <h2 className="font-display text-xl uppercase">Change password</h2>
        <ActionForm action={changePasswordAction} submitLabel="Change password" className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Current password" htmlFor="current" required><Input id="current" name="current" type="password" autoComplete="current-password" required /></Field>
          <Field label="New password" htmlFor="password" required hint="At least 10 characters, letters and numbers."><Input id="password" name="password" type="password" autoComplete="new-password" required /></Field>
        </ActionForm>
      </Card>
      <Card>
        <h2 className="font-display text-xl uppercase text-danger">Delete my account</h2>
        <div className="mt-2 space-y-2 text-sm text-bone-muted">
          <p>You can ask us to delete your account and personal information. Here&apos;s what happens:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Your request is reviewed by the owner, normally within a few working days.</li>
            <li>Your profile, saved addresses, wishlist, cart and marketing preferences are deleted, and your name and contact details are removed or anonymised.</li>
            <li>Records we are legally required to keep — such as completed orders, payments, refunds and repair invoices — are retained (in anonymised form where possible) for the required period.</li>
            <li>Open orders or repairs must be completed or cancelled first.</li>
          </ul>
        </div>
        {pendingDeletion ? <Alert tone="info" className="mt-4">Your deletion request is pending review.</Alert> : (
          <ActionForm action={requestAccountDeletionAction} submitLabel="Request account deletion" variant="danger" hideOnSuccess className="mt-4 space-y-4">
            <Field label="Reason (optional)" htmlFor="reason"><Textarea id="reason" name="reason" className="min-h-20" /></Field>
            <Field label='Type "DELETE" to confirm' htmlFor="confirm" required><Input id="confirm" name="confirm" required autoComplete="off" /></Field>
          </ActionForm>
        )}
      </Card>
    </div>
  );
}
