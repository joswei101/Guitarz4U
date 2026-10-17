"use client";

import { useActionState } from "react";
import { savePageAction } from "@/app/actions/admin/content";
import { FormResult } from "../forms/form-bits";
import { Button } from "../ui/button";
import { Field, Input, Textarea } from "../ui/form";

export function PageEditor({ slug, title, body, metaDescription, canPublish }: { slug: string; title: string; body: string; metaDescription: string; canPublish: boolean }) {
  const [state, action, pending] = useActionState(savePageAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <Field label="Title" htmlFor="title" required><Input id="title" name="title" defaultValue={title} required /></Field>
      <Field label="Search description" htmlFor="metaDescription"><Input id="metaDescription" name="metaDescription" defaultValue={metaDescription} maxLength={300} /></Field>
      <Field label="Content" htmlFor="body" required hint='Formatting: "## Heading", "- bullet", "1. step", "**bold**", "[link text](/path)", "> callout". Mark open decisions as [OWNER TO CONFIRM …].'>
        <Textarea id="body" name="body" defaultValue={body} required className="min-h-[28rem] font-mono text-sm" />
      </Field>
      <FormResult state={state} />
      <div className="flex flex-wrap gap-2">
        {canPublish && <Button type="submit" name="intent" value="publish" disabled={pending}>Publish now</Button>}
        <Button type="submit" name="intent" value="draft" variant="outline" disabled={pending}>{canPublish ? "Save as draft" : "Submit for approval"}</Button>
      </div>
    </form>
  );
}
