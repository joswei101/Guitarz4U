"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { placeOrderAction } from "@/app/actions/checkout";
import { previewDiscount } from "@/app/actions/shop";
import { Card } from "../ui/misc";
import { Button } from "../ui/button";
import { Checkbox, Field, Input, Textarea } from "../ui/form";
import { FormResult } from "../forms/form-bits";

function ApplyButton({ applyAction }: { applyAction: (f: FormData) => void }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="subtle" formAction={applyAction} formNoValidate disabled={pending}>Apply</Button>;
}

function PayButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending || disabled}>
      {pending ? "Please wait…" : disabled ? "Checkout unavailable" : "Continue to secure card payment"}
    </Button>
  );
}

export function CheckoutForm({ subtotal, defaultPhone, disabled }: { subtotal: string; defaultPhone: string; disabled: boolean }) {
  const [state, action] = useActionState(placeOrderAction, null);
  const [discount, discountAction] = useActionState(previewDiscount, null);
  return (
    <Card className="h-fit">
      <form action={action} className="space-y-5">
        <h2 className="font-display text-xl uppercase tracking-wide">Payment summary</h2>
        <div className="flex items-end gap-2">
          <Field label="Discount code" htmlFor="discountCode" className="flex-1">
            <Input id="discountCode" name="discountCode" autoComplete="off" />
          </Field>
          <ApplyButton applyAction={discountAction} />
        </div>
        <FormResult state={discount} />
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-bone-muted">Subtotal</dt><dd>{subtotal}</dd></div>
          {discount?.ok && discount.data && <div className="flex justify-between text-amp"><dt>Discount</dt><dd>−{discount.data.discount}</dd></div>}
          <div className="flex justify-between border-t border-ink-500 pt-2 text-base font-semibold"><dt>Total payable (ZAR)</dt><dd>{discount?.ok && discount.data ? discount.data.total : subtotal}</dd></div>
        </dl>
        <Field label="Phone / WhatsApp for collection" htmlFor="phone" hint="So we can arrange collection with you.">
          <Input id="phone" name="phone" type="tel" defaultValue={defaultPhone} autoComplete="tel" />
        </Field>
        <Field label="Notes (optional)" htmlFor="customerNotes">
          <Textarea id="customerNotes" name="customerNotes" maxLength={1000} className="min-h-20" />
        </Field>
        <Checkbox id="acceptTerms" name="acceptTerms" required label="I accept the terms and conditions and the returns policy, and understand this order is for collection only in Sandringham, Johannesburg." />
        <FormResult state={state} />
        <PayButton disabled={disabled} />
        <p className="text-center text-xs text-bone-dim">You'll be taken to PayFast to pay by card. We never see or store your card details. Discounts are re-checked when you continue.</p>
      </form>
    </Card>
  );
}
