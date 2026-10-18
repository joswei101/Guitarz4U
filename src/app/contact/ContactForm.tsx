"use client";
import { useState } from "react";
import { ContactFields, Field, FormStatus, SpamTrap, inputProps, useSubmit } from "@/components/forms";

export function ContactForm({ defaults }: { defaults?: { name?: string; email?: string } }) {
  const { pending, error, fieldErrors: fe, submit } = useSubmit("/api/contact");
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="card" role="status" data-testid="contact-success">
        <h2>Message sent</h2>
        <p>Thank you. Your message has been saved and Guitarz4U will reply using your preferred contact method.</p>
      </div>
    );
  return (
    <form className="card form" noValidate onSubmit={async (e) => { e.preventDefault(); if (await submit(new FormData(e.currentTarget))) setDone(true); }}>
      <h2 style={{ marginBottom: 0 }}>Send a message</h2>
      <FormStatus error={error} />
      <ContactFields errors={fe} defaults={{ ...defaults, preferredContact: "email" }} emailRequired={false} />
      <Field label="Subject" name="subject" error={fe.subject}>
        <input type="text" {...inputProps("subject", fe)} maxLength={160} />
      </Field>
      <Field label="Message" name="message" required error={fe.message}>
        <textarea {...inputProps("message", fe)} required minLength={5} maxLength={4000} rows={6} />
      </Field>
      <SpamTrap />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
