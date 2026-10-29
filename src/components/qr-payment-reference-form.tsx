"use client";

import { useActionState } from "react";
import { submitQrPaymentReferenceAction } from "@/app/actions/shop";
import { T } from "@/components/language-provider";

export function QrPaymentReferenceForm({
  orderId,
  reference,
}: {
  orderId: string;
  reference: string | null;
}) {
  const [state, action, pending] = useActionState(
    submitQrPaymentReferenceAction,
    {},
  );

  return (
    <form action={action} className="qr-payment-reference-form">
      <input type="hidden" name="order_id" value={orderId} />
      <div className="field">
        <label htmlFor={`qr-reference-${orderId}`}>
          <T en="GCash / Maya transaction reference" fil="Transaction reference sa GCash / Maya" />
        </label>
        <input
          id={`qr-reference-${orderId}`}
          name="reference"
          type="text"
          defaultValue={reference ?? ""}
          minLength={4}
          maxLength={80}
          autoComplete="off"
          required
          aria-describedby={`qr-reference-help-${orderId}`}
        />
        <p className="field-help" id={`qr-reference-help-${orderId}`}>
          <T en="Enter the transaction/reference number shown in your wallet after sending payment. Staff will compare it with the received transfer." fil="Ilagay ang transaction/reference number na ipinakita ng wallet pagkatapos magbayad. Ihahambing ito ng staff sa natanggap na transfer." />
        </p>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-success" role="status">{state.success}</p>}
      <button className="button button-secondary" type="submit" disabled={pending}>
        {pending
          ? <T en="Saving reference…" fil="Sine-save ang reference…" />
          : <T en={reference ? "Update transfer reference" : "Submit transfer reference"} fil={reference ? "I-update ang transfer reference" : "Isumite ang transfer reference"} />}
      </button>
    </form>
  );
}
