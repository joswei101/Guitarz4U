import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

type Variant = "primary" | "outline" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold tracking-wide transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amp disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-amp text-ink hover:bg-amp-light",
  outline: "border border-ink-400 text-bone hover:border-amp hover:text-amp",
  ghost: "text-bone-muted hover:text-amp",
  danger: "bg-red-600 text-white hover:bg-red-500",
  subtle: "bg-ink-600 text-bone hover:bg-ink-500",
};
const sizes: Record<Size, string> = { sm: "h-9 px-3 text-sm", md: "h-11 px-5 text-sm", lg: "h-12 px-7 text-base" };

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
