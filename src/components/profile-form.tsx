"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/auth";
import { T } from "@/components/language-provider";

export function ProfileForm({
  fullName,
  phone,
  defaultDeliveryAddress,
  showDeliveryAddress = true,
}: {
  fullName: string;
  phone: string;
  defaultDeliveryAddress: string;
  showDeliveryAddress?: boolean;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, {});
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="full_name">
          <T en="Full name" fil="Buong pangalan" />
        </label>
        <input
          id="full_name"
          name="full_name"
          defaultValue={fullName}
          minLength={2}
          maxLength={120}
          required
        />
      </div>
      {showDeliveryAddress && (
        <div className="field">
          <label htmlFor="default_delivery_address">
            <T en="Default delivery address" fil="Karaniwang address sa delivery" />
          </label>
          <textarea
            id="default_delivery_address"
            name="default_delivery_address"
            defaultValue={defaultDeliveryAddress}
            rows={3}
            maxLength={500}
            autoComplete="street-address"
            aria-describedby="profile-address-help"
          />
          <p className="field-help" id="profile-address-help">
            <T
              en="Saved for convenience. You can still choose or edit the address for each delivery order."
              fil="Para mas mabilis mag-order. Maaari mo pa ring piliin o baguhin ang address sa bawat delivery order."
            />
          </p>
        </div>
      )}
      <div className="field">
        <label htmlFor="phone">
          <T en="Contact number" fil="Numero ng telepono" />
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          maxLength={32}
        />
      </div>
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
        {pending ? (
          <T en="Saving…" fil="Sine-save…" />
        ) : (
          <T en="Save profile" fil="I-save ang profile" />
        )}
      </button>
    </form>
  );
}
