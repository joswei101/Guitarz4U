import { requireUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { Flash } from "@/components/Flash";
import { updateProfile } from "../actions";
import { ChangePassword } from "./ChangePassword";

export default async function Profile({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const p = await queryOne<{ phone: string | null; preferred_contact: string }>("select phone, preferred_contact from customer_profiles where user_id=$1", [user.id]);
  const hasPassword = await queryOne(`select 1 from account where "userId"=$1 and "providerId"='credential'`, [user.id]);
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <h1 style={{ fontSize: "2rem" }}>Profile</h1>
      <form action={updateProfile} className="card form">
        <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Your details</h2>
        <div className="form-grid">
          <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" type="text" defaultValue={user.name} required minLength={2} maxLength={120} /></div>
          <div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" value={user.email} readOnly aria-describedby="email-hint" /><span className="hint" id="email-hint">Contact us if you need to change your email address.</span></div>
          <div className="field"><label htmlFor="phone">Phone / WhatsApp</label><input id="phone" name="phone" type="tel" defaultValue={p?.phone ?? ""} maxLength={30} /></div>
          <div className="field"><label htmlFor="preferredContact">Preferred contact</label>
            <select id="preferredContact" name="preferredContact" defaultValue={p?.preferred_contact ?? "whatsapp"}>
              <option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="phone">Phone call</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary">Save details</button>
      </form>
      {hasPassword ? <ChangePassword /> : <div className="card"><p>You sign in with Google, so there is no Guitarz4U password to change.</p></div>}
    </div>
  );
}
