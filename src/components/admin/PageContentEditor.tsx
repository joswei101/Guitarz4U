"use client";

import { useActionState } from "react";
import { savePageContentAction } from "@/app/admin/actions";
import { initialState } from "@/lib/actions";
import { FormMessage, SubmitButton } from "@/components/forms/FormBits";

export function PageContentEditor({ slug, body, edited }: { slug: string; body: string; edited: boolean }) {
  const [state, action] = useActionState(savePageContentAction, initialState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <label htmlFor="page-body" className="label">
        Page text
      </label>
      <textarea id="page-body" name="body" defaultValue={body} rows={22} maxLength={30000} className="textarea font-mono text-sm" />
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="btn btn-primary btn-sm" pendingText="Saving…">
          Save page
        </SubmitButton>
        {edited && (
          <SubmitButton className="btn btn-outline btn-sm" name="reset" value="1" pendingText="Resetting…">
            Reset to default text
          </SubmitButton>
        )}
        <a href={`/${slug}`} target="_blank" className="btn btn-outline btn-sm">
          View page
        </a>
      </div>
    </form>
  );
}
