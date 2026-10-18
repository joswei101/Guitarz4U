"use client";

import { useEffect, useRef } from "react";
import { Button } from "../ui/button";

/** Posts signed fields to the payment gateway. Auto-submits, with a manual button as fallback. */
export function AutoSubmitForm({ action, fields }: { action: string; fields: [string, string][] }) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.submit(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <form ref={ref} action={action} method="post">
      {fields.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Button type="submit" size="lg">Pay securely with PayFast</Button>
    </form>
  );
}
