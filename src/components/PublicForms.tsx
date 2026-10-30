'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import {
  reserveProduct, sendMessage, submitEnquiry, submitOffer, submitReview, subscribeStockAlert,
} from '@/app/actions/public';
import { initialState } from '@/lib/action-state';
import { CATEGORIES, CONTACT_METHODS, REVIEW_TOPICS } from '@/lib/labels';
import { FieldError, FormMessage, GuardFields, SubmitButton, errProps, val } from '@/components/forms';

type Defaults = { name?: string; email?: string; phone?: string };

function Consent({ state, children }: { state: Parameters<typeof FieldError>[0]['state']; children?: React.ReactNode }) {
  return (
    <>
      <label className="check"><input type="checkbox" name="consent" required />
        <span>{children ?? <>I agree that Guitarz4U may use these details to respond to me, as described in the <Link href="/legal/privacy" target="_blank">privacy policy</Link>.</>} <span className="req">*</span></span>
      </label>
      <FieldError state={state} name="consent" />
    </>
  );
}

export function StockAlertForm({ defaults, compact }: { defaults?: Defaults; compact?: boolean }) {
  const [state, action] = useActionState(subscribeStockAlert, initialState);
  if (state.ok) return <div role="status" className="alert alert-success">{state.message}</div>;
  return (
    <form action={action} className="stack" noValidate>
      <FormMessage state={state} />
      <GuardFields />
      <div className="form-grid">
        <div className="field"><label htmlFor="sa-email">Email <span className="req">*</span></label>
          <input id="sa-email" name="email" type="email" autoComplete="email" required defaultValue={val(state, 'email', defaults?.email)} {...errProps(state, 'email')} />
          <FieldError state={state} name="email" /></div>
        <div className="field"><label htmlFor="sa-cat">Type of guitar</label>
          <select id="sa-cat" name="category" defaultValue={val(state, 'category')}>
            <option value="">Any type</option>
            {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></div>
        {!compact ? (
          <>
            <div className="field"><label htmlFor="sa-brand">Brand <span className="hint">(optional)</span></label>
              <input id="sa-brand" name="brand" defaultValue={val(state, 'brand')} /></div>
            <div className="field"><label htmlFor="sa-max">Maximum price (R) <span className="hint">(optional)</span></label>
              <input id="sa-max" name="max_price" inputMode="decimal" defaultValue={val(state, 'max_price')} {...errProps(state, 'max_price')} />
              <FieldError state={state} name="max_price" /></div>
          </>
        ) : null}
      </div>
      <Consent state={state}>Email me when matching guitars are listed. I can unsubscribe at any time.</Consent>
      <div><SubmitButton pendingText="Saving…">Notify me</SubmitButton></div>
    </form>
  );
}

export function ContactForm({ defaults, productId, subjectPlaceholder }: { defaults?: Defaults; productId?: string; subjectPlaceholder?: string }) {
  const [state, action] = useActionState(sendMessage, initialState);
  if (state.ok) return <div role="status" className="alert alert-success">{state.message}</div>;
  const p = productId ? 'q' : 'c';
  return (
    <form action={action} className="stack" noValidate>
      <FormMessage state={state} />
      <GuardFields />
      {productId ? <input type="hidden" name="product_id" value={productId} /> : null}
      <div className="form-grid">
        <div className="field"><label htmlFor={`${p}-name`}>Your name <span className="req">*</span></label>
          <input id={`${p}-name`} name="name" autoComplete="name" required defaultValue={val(state, 'name', defaults?.name)} {...errProps(state, 'name')} />
          <FieldError state={state} name="name" /></div>
        <div className="field"><label htmlFor={`${p}-email`}>Email <span className="req">*</span></label>
          <input id={`${p}-email`} name="email" type="email" autoComplete="email" required defaultValue={val(state, 'email', defaults?.email)} {...errProps(state, 'email')} />
          <FieldError state={state} name="email" /></div>
        <div className="field"><label htmlFor={`${p}-phone`}>WhatsApp / phone <span className="hint">(optional)</span></label>
          <input id={`${p}-phone`} name="phone" type="tel" autoComplete="tel" defaultValue={val(state, 'phone', defaults?.phone)} {...errProps(state, 'phone')} />
          <FieldError state={state} name="phone" /></div>
        {!productId ? (
          <div className="field"><label htmlFor={`${p}-subject`}>Subject</label>
            <input id={`${p}-subject`} name="subject" placeholder={subjectPlaceholder} defaultValue={val(state, 'subject')} /></div>
        ) : null}
        <div className="field field-full"><label htmlFor={`${p}-body`}>{productId ? 'Your question' : 'Message'} <span className="req">*</span></label>
          <textarea id={`${p}-body`} name="body" required defaultValue={val(state, 'body')} {...errProps(state, 'body')} />
          <FieldError state={state} name="body" /></div>
      </div>
      <Consent state={state} />
      <div><SubmitButton>{productId ? 'Send question' : 'Send message'}</SubmitButton></div>
    </form>
  );
}

export function OfferForm({ productId, defaults }: { productId: string; defaults?: Defaults }) {
  const [state, action] = useActionState(submitOffer, initialState);
  if (state.ok) return <div role="status" className="alert alert-success">{state.message}</div>;
  return (
    <form action={action} className="stack" noValidate>
      <FormMessage state={state} />
      <GuardFields />
      <input type="hidden" name="product_id" value={productId} />
      <div className="form-grid">
        <div className="field"><label htmlFor="o-amount">Your offer (R) <span className="req">*</span></label>
          <input id="o-amount" name="amount" inputMode="decimal" required defaultValue={val(state, 'amount')} {...errProps(state, 'amount')} />
          <FieldError state={state} name="amount" /></div>
        <div className="field"><label htmlFor="o-name">Your name <span className="req">*</span></label>
          <input id="o-name" name="name" autoComplete="name" required defaultValue={val(state, 'name', defaults?.name)} {...errProps(state, 'name')} />
          <FieldError state={state} name="name" /></div>
        <div className="field"><label htmlFor="o-email">Email <span className="req">*</span></label>
          <input id="o-email" name="email" type="email" autoComplete="email" required defaultValue={val(state, 'email', defaults?.email)} {...errProps(state, 'email')} />
          <FieldError state={state} name="email" /></div>
        <div className="field"><label htmlFor="o-phone">WhatsApp / phone <span className="hint">(optional)</span></label>
          <input id="o-phone" name="phone" type="tel" autoComplete="tel" defaultValue={val(state, 'phone', defaults?.phone)} {...errProps(state, 'phone')} />
          <FieldError state={state} name="phone" /></div>
        <div className="field field-full"><label htmlFor="o-msg">Message <span className="hint">(optional)</span></label>
          <textarea id="o-msg" name="message" defaultValue={val(state, 'message')} /></div>
      </div>
      <p className="small muted">Offers are reviewed personally and are never accepted automatically. Making an offer does not reserve the guitar.</p>
      <Consent state={state} />
      <div><SubmitButton>Send offer</SubmitButton></div>
    </form>
  );
}

export function ReserveForm({ productId, hours, defaults }: { productId: string; hours: number; defaults?: Defaults }) {
  const [state, action] = useActionState(reserveProduct, initialState);
  if (state.ok) {
    return (
      <div role="status" className="alert alert-success">
        <strong>Reservation confirmed</strong>
        {state.message} <Link href="/account/reservations">View my reservations</Link>
      </div>
    );
  }
  return (
    <form action={action} className="stack" noValidate>
      <FormMessage state={state} />
      <GuardFields />
      <input type="hidden" name="product_id" value={productId} />
      <div className="form-grid">
        <div className="field"><label htmlFor="r-name">Your name <span className="req">*</span></label>
          <input id="r-name" name="name" autoComplete="name" required defaultValue={val(state, 'name', defaults?.name)} {...errProps(state, 'name')} />
          <FieldError state={state} name="name" /></div>
        <div className="field"><label htmlFor="r-phone">WhatsApp / phone <span className="req">*</span></label>
          <input id="r-phone" name="phone" type="tel" autoComplete="tel" required defaultValue={val(state, 'phone', defaults?.phone)} {...errProps(state, 'phone')} />
          <FieldError state={state} name="phone" /></div>
        <div className="field field-full"><label htmlFor="r-msg">Message <span className="hint">(optional)</span></label>
          <textarea id="r-msg" name="message" defaultValue={val(state, 'message')} /></div>
      </div>
      <Consent state={state}>
        I understand this reservation holds the guitar for {hours} hours, is <strong>not a payment</strong>, and that payment and collection are arranged privately with the owner (<Link href="/legal/collection-reservation" target="_blank">reservation policy</Link>).
      </Consent>
      <div><SubmitButton pendingText="Reserving…">Reserve for {hours} hours</SubmitButton></div>
    </form>
  );
}

export function EnquiryForm({ defaults }: { defaults?: Defaults }) {
  const [state, action] = useActionState(submitEnquiry, initialState);
  if (state.ok) {
    return (
      <div role="status" className="card">
        <h2>Enquiry sent</h2>
        <p>{state.message}</p>
        <div className="row"><Link href="/shop" className="btn btn-outline">Keep browsing</Link><Link href="/account/enquiries" className="btn btn-primary">My enquiries</Link></div>
      </div>
    );
  }
  return (
    <form action={action} className="card stack" noValidate>
      <h2>Send your enquiry</h2>
      <FormMessage state={state} />
      <GuardFields />
      <div className="form-grid">
        <div className="field"><label htmlFor="e-name">Your name <span className="req">*</span></label>
          <input id="e-name" name="name" autoComplete="name" required defaultValue={val(state, 'name', defaults?.name)} {...errProps(state, 'name')} />
          <FieldError state={state} name="name" /></div>
        <div className="field"><label htmlFor="e-email">Email <span className="req">*</span></label>
          <input id="e-email" name="email" type="email" autoComplete="email" required defaultValue={val(state, 'email', defaults?.email)} {...errProps(state, 'email')} />
          <FieldError state={state} name="email" /></div>
        <div className="field"><label htmlFor="e-phone">WhatsApp / phone</label>
          <input id="e-phone" name="phone" type="tel" autoComplete="tel" defaultValue={val(state, 'phone', defaults?.phone)} {...errProps(state, 'phone')} />
          <FieldError state={state} name="phone" /></div>
        <div className="field"><label htmlFor="e-pref">Preferred contact</label>
          <select id="e-pref" name="preferred_contact" defaultValue={val(state, 'preferred_contact', 'whatsapp')}>
            {Object.entries(CONTACT_METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></div>
        <div className="field field-full"><label htmlFor="e-msg">Message <span className="hint">(optional)</span></label>
          <textarea id="e-msg" name="message" placeholder="Questions, viewing requests, preferred collection times…" defaultValue={val(state, 'message')} /></div>
      </div>
      <Consent state={state}>
        I understand this enquiry is <strong>not a payment</strong> and does not complete a sale. Collection only, in Sandringham, Johannesburg. I agree to the <Link href="/legal/terms" target="_blank">terms</Link> and <Link href="/legal/privacy" target="_blank">privacy policy</Link>.
      </Consent>
      <div><SubmitButton>Send enquiry (no payment)</SubmitButton></div>
    </form>
  );
}

export function ReviewForm({ defaultName }: { defaultName?: string }) {
  const [state, action] = useActionState(submitReview, initialState);
  if (state.ok) return <div role="status" className="alert alert-success">{state.message}</div>;
  return (
    <form action={action} className="card stack" noValidate>
      <h2>Write a review</h2>
      <FormMessage state={state} />
      <GuardFields />
      <div className="form-grid">
        <div className="field"><label htmlFor="rv-name">Display name <span className="req">*</span></label>
          <input id="rv-name" name="display_name" required defaultValue={val(state, 'display_name', defaultName)} {...errProps(state, 'display_name')} />
          <span className="hint">Shown publicly. You can use just your first name.</span>
          <FieldError state={state} name="display_name" /></div>
        <div className="field"><label htmlFor="rv-rating">Rating <span className="req">*</span></label>
          <select id="rv-rating" name="rating" required defaultValue={val(state, 'rating')} {...errProps(state, 'rating')}>
            <option value="">Choose…</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select><FieldError state={state} name="rating" /></div>
        <div className="field"><label htmlFor="rv-topic">About</label>
          <select id="rv-topic" name="related_to" defaultValue={val(state, 'related_to', 'general')}>
            {Object.entries(REVIEW_TOPICS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></div>
        <div className="field field-full"><label htmlFor="rv-title">Title <span className="hint">(optional)</span></label>
          <input id="rv-title" name="title" defaultValue={val(state, 'title')} /></div>
        <div className="field field-full"><label htmlFor="rv-body">Your review <span className="req">*</span></label>
          <textarea id="rv-body" name="body" required defaultValue={val(state, 'body')} {...errProps(state, 'body')} />
          <FieldError state={state} name="body" /></div>
      </div>
      <Consent state={state}>I confirm this is my honest experience. I understand reviews are checked before they are published.</Consent>
      <div><SubmitButton>Submit review</SubmitButton></div>
    </form>
  );
}
