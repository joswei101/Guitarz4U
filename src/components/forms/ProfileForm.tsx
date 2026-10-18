"use client";
import { useActionState } from "react";
import { updateProfile } from "@/app/actions/account";
import { Field, Select } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { CONTACT_METHODS } from "@/lib/constants";

export function ProfileForm({ defaults }: { defaults: { full_name: string; phone: string; preferred_contact: string } }) {
  const [state, action] = useActionState(updateProfile, null);
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && <Alert tone={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Alert>}
      <Field label="Full name" name="full_name" required defaultValue={defaults.full_name} error={e.full_name} autoComplete="name" />
      <Field label="Phone / WhatsApp" name="phone" type="tel" defaultValue={defaults.phone} error={e.phone} autoComplete="tel" />
      <Select label="Preferred contact method" name="preferred_contact" options={CONTACT_METHODS} defaultValue={defaults.preferred_contact} />
      <SubmitButton pendingText="Saving…">Save details</SubmitButton>
    </form>
  );
}
