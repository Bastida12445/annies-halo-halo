"use client";

import { useActionState, type ReactNode } from "react";
import type { ShopActionState } from "@/app/actions/shop";

export function AdminActionForm({
  action,
  children,
  className,
  submitLabel,
}: {
  action: (
    state: ShopActionState,
    formData: FormData,
  ) => Promise<ShopActionState>;
  children: ReactNode;
  className?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
