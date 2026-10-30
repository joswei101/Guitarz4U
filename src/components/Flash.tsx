/**
 * Shows ?ok= / ?error= messages after a form redirect. React escapes the text,
 * and messages that look like phishing (links, email addresses, phone numbers)
 * are never shown, so a crafted link cannot display a convincing fake notice.
 */
const SUSPICIOUS = /(https?:|www\.|\.[a-z]{2,}\/|@|\d[\d\s()-]{7,}\d)/i;

export function Flash({ ok, error, allow }: { ok?: string | string[]; error?: string | string[]; allow?: string[] }) {
  const o = Array.isArray(ok) ? ok[0] : ok;
  const e = Array.isArray(error) ? error[0] : error;
  const text = (e ?? o ?? '').slice(0, 300);
  if (!text || SUSPICIOUS.test(text)) return null;
  if (allow && !allow.includes(text)) return null;
  return (
    <div role={e ? 'alert' : 'status'} className={`alert ${e ? 'alert-error' : 'alert-success'}`}>
      {text}
    </div>
  );
}
