import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { ResetPasswordForm } from "@/components/forms/AuthForms";

export const metadata = { title: "Profile & password" };

export default async function ProfilePage() {
  const { user, profile } = await requireUser("/account/profile");
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-6">
        <h2 className="text-2xl">Your details</h2>
        <p className="mt-1 text-sm text-tan">Email: {user.email} (contact us to change it)</p>
        <div className="mt-4">
          <ProfileForm defaults={{ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "", preferred_contact: profile?.preferred_contact ?? "whatsapp" }} />
        </div>
      </section>
      <section className="card p-6">
        <h2 className="text-2xl">Change password</h2>
        <div className="mt-4">
          <ResetPasswordForm />
        </div>
      </section>
    </div>
  );
}
