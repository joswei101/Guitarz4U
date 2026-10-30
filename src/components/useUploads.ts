'use client';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { finaliseUploads } from '@/app/actions/submissions';
import type { ActionState } from '@/lib/action-state';
import type { UploadTarget } from '@/lib/upload-rules';
import type { PreparedFile } from '@/components/FilePicker';

/** After a successful submission, uploads the chosen files with the signed URLs. */
export function useUploadsAfterSubmit(state: ActionState, files: PreparedFile[]) {
  const [status, setStatus] = useState<string>('');
  useEffect(() => {
    const data = state.data as { ticket?: string; targets?: UploadTarget[]; uploadFailed?: boolean } | undefined;
    if (!state.ok || !data) return;
    if (data.uploadFailed) {
      setStatus('Your request was saved, but the photos could not be uploaded. Please send them to us on WhatsApp.');
      return;
    }
    if (!data.ticket || !data.targets?.length) return;
    let cancelled = false;
    (async () => {
      setStatus(`Uploading ${data.targets!.length} file(s)…`);
      const supabase = createBrowserSupabase();
      let failed = 0;
      for (let i = 0; i < data.targets!.length; i++) {
        const t = data.targets![i];
        const f = files[i];
        if (!f) continue;
        const { error } = await supabase.storage.from('submissions').uploadToSignedUrl(t.path, t.token, f.blob, { contentType: t.type });
        if (error) failed++;
        if (!cancelled) setStatus(`Uploaded ${i + 1 - failed} of ${data.targets!.length}…`);
      }
      const result = await finaliseUploads(data.ticket!);
      if (cancelled) return;
      if (result.error) setStatus(result.error);
      else if (failed) setStatus(`${result.saved} file(s) uploaded; ${failed} failed. Please send the missing ones on WhatsApp.`);
      else setStatus(`All ${result.saved} file(s) uploaded successfully.`);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return status;
}
