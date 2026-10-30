import Link from 'next/link';
import { DeleteAccountForm } from '@/components/AccountForms';

export default function PrivacyPage() {
  return (
    <div className="stack">
      <h1>Privacy &amp; data</h1>
      <section className="card">
        <h2 style={{ fontSize: '1.2rem' }}>Download your data</h2>
        <p>Get a copy of the personal information linked to your account (JSON file).</p>
        <a className="btn btn-outline" href="/account/export" download>Download my data</a>
      </section>
      <section className="card">
        <h2 style={{ fontSize: '1.2rem' }}>Delete your account</h2>
        <p>Deleting your account removes your login, profile, wishlist, notifications, stock alerts and reviews, and removes your contact details from enquiries and submissions that did not lead to a completed transaction.</p>
        <p><strong>Records of completed sales, purchases, repairs and recorded payments are kept</strong> because the business must keep them for tax and accounting purposes. They are unlinked from your account. <Link href="/legal/account-data">Read more</Link>.</p>
        <p className="small muted">You cannot delete your account while a repair, reservation or guitar handover is in progress — please contact us first.</p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
