"use client";

import { Button } from "../ui/button";

export function ConfirmButton({ message, children, variant = "ghost", className }: { message: string; children: React.ReactNode; variant?: "ghost" | "danger" | "outline"; className?: string }) {
  return (
    <Button type="submit" variant={variant} className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </Button>
  );
}
