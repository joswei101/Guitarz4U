import type { Metadata } from "next";
import { requireUser, getProfile } from "@/lib/auth";
import { ProfileForm } from "@/components/account/ProfileForm";
import { UpdatePasswordForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const profile = await getProfile();
  const hasPassword = user.identities?.some((i) => i.provider === "email") ?? true;
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Profile &amp; password</h1>
      <section className="card p-6">
        <h2 className="text-xl">Your details</h2>
        <p className="mt-1 text-sm text-ink-soft">Email address: {user.email} {user.email_confirmed_at ? "(verified)" : "(not verified)"}</p>
        <div className="mt-5">
          <ProfileForm defaults={{ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "", preferred_contact: profile?.preferred_contact ?? "whatsapp" }} />
        </div>
      </section>
      <section className="card p-6">
        <h2 className="text-xl">{hasPassword ? "Change password" : "Set a password"}</h2>
        <div className="mt-5 max-w-md">
          <UpdatePasswordForm />
        </div>
      </section>
    </div>
  );
}
