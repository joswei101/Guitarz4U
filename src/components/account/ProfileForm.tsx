"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/(site)/account/actions";
import { initialState } from "@/lib/actions";
import { FormMessage, SelectField, SubmitButton, TextField } from "@/components/forms/FormBits";

export function ProfileForm({ defaults }: { defaults: { full_name: string; phone: string; preferred_contact: string } }) {
  const [state, action] = useActionState(updateProfileAction, initialState);
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <TextField label="Full name" name="full_name" required maxLength={120} defaultValue={defaults.full_name} state={state} autoComplete="name" />
      <TextField label="Phone / WhatsApp" name="phone" type="tel" maxLength={30} defaultValue={defaults.phone} state={state} autoComplete="tel" />
      <SelectField
        label="Preferred contact method"
        name="preferred_contact"
        defaultValue={defaults.preferred_contact}
        options={[
          { value: "whatsapp", label: "WhatsApp" },
          { value: "email", label: "Email" },
          { value: "phone", label: "Phone call" },
        ]}
        state={state}
      />
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Saving…">Save details</SubmitButton>
      </div>
    </form>
  );
}
