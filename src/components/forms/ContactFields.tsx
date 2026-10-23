"use client";

import type { ActionState } from "@/lib/actions";
import { SelectField, TextField } from "@/components/forms/FormBits";

export type ContactDefaults = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  preferred?: string | null;
};

export function ContactFields({ defaults, state }: { defaults: ContactDefaults; state: ActionState }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="Your name" name="contact_name" required autoComplete="name" maxLength={120} defaultValue={defaults.name ?? ""} state={state} />
      <SelectField
        label="Preferred contact method"
        name="preferred_contact"
        defaultValue={defaults.preferred ?? "whatsapp"}
        options={[
          { value: "whatsapp", label: "WhatsApp" },
          { value: "email", label: "Email" },
          { value: "phone", label: "Phone call" },
        ]}
        state={state}
      />
      <TextField label="Phone / WhatsApp number" name="contact_phone" type="tel" autoComplete="tel" maxLength={30} defaultValue={defaults.phone ?? ""} state={state} />
      <TextField label="Email" name="contact_email" type="email" autoComplete="email" maxLength={200} defaultValue={defaults.email ?? ""} state={state} />
    </div>
  );
}
