"use client";

import { useActionState, useState, type ReactNode } from "react";
import { CheckCircle2, TriangleAlert, X } from "lucide-react";
import type { ShopActionState } from "@/app/actions/shop";

export function AdminActionForm({
  action,
  children,
  className,
  submitLabel,
  buttonClassName,
  confirmMessage,
}: {
  action: (
    state: ShopActionState,
    formData: FormData,
  ) => Promise<ShopActionState>;
  children: ReactNode;
  className?: string;
  submitLabel: string;
  buttonClassName?: string;
  confirmMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [dismissedState, setDismissedState] = useState(state);
  const message = state.error ?? state.success;
  const isError = Boolean(state.error);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {children}
      {message && dismissedState !== state && (
        <div className={`admin-action-toast ${isError ? "is-error" : "is-success"}`} role={isError ? "alert" : "status"}>
          {isError ? <TriangleAlert aria-hidden="true" size={18} /> : <CheckCircle2 aria-hidden="true" size={18} />}
          <span>{message}</span>
          <button aria-label="Dismiss notification" onClick={() => setDismissedState(state)} type="button"><X aria-hidden="true" size={16} /></button>
        </div>
      )}
      <button className={buttonClassName ?? "button"} type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
