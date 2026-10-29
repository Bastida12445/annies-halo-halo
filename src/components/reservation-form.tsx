"use client";

import { useActionState, useMemo, useState } from "react";
import { requestReservationAction } from "@/app/actions/shop";
import { T } from "@/components/language-provider";
import { formatDateTime } from "@/lib/money";
import type { ReservationSlot, ReservationType } from "@/lib/business";

export function ReservationForm({
  types,
  slots,
  phone,
}: {
  types: ReservationType[];
  slots: ReservationSlot[];
  phone: string;
}) {
  const [state, action, pending] = useActionState(requestReservationAction, {});
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const selectedType = types.find((type) => type.id === typeId);
  const availableSlots = useMemo(
    () => slots.filter((slot) => slot.type_id === typeId),
    [slots, typeId],
  );

  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="type">
          <T en="Reservation type" fil="Uri ng reservation" />
        </label>
        <select
          id="type"
          name="type"
          value={typeId}
          onChange={(event) => setTypeId(event.target.value)}
          required
        >
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="requested_at">
          <T en="Available date and time" fil="Available na petsa at oras" />
        </label>
        <select id="requested_at" name="requested_at" required defaultValue="">
          <option value="">
            <T
              en="Choose a configured time"
              fil="Pumili ng naka-configure na oras"
            />
          </option>
          {availableSlots.map((slot) => (
            <option
              key={`${slot.type_id}-${slot.starts_at}`}
              value={slot.starts_at}
            >
              {formatDateTime(slot.starts_at)}
            </option>
          ))}
        </select>
      </div>
      {selectedType?.party_size_required && (
        <div className="field">
          <label htmlFor="party_size">
            <T en="Party size" fil="Bilang ng tao" />
          </label>
          <input
            id="party_size"
            name="party_size"
            type="number"
            min={selectedType.minimum_party_size}
            max={Math.min(
              selectedType.maximum_party_size,
              selectedType.capacity ?? 40,
            )}
            required
          />
        </div>
      )}
      <div className="field">
        <label htmlFor="reservation-phone">
          <T en="Contact number" fil="Numero ng telepono" />
        </label>
        <input
          id="reservation-phone"
          name="phone"
          type="tel"
          maxLength={32}
          defaultValue={phone}
        />
      </div>
      <div className="field">
        <label htmlFor="reservation-notes">
          <T en="Notes (optional)" fil="Tala (opsyonal)" />
        </label>
        <textarea id="reservation-notes" name="notes" maxLength={1000} />
      </div>
      <label className="consent-row">
        <input type="checkbox" name="reservation_terms" required />{" "}
        <span>
          <T
            en="I agree to the reservation policy for this request."
            fil="Sumasang-ayon ako sa patakaran ng reservation para sa request na ito."
          />{" "}
          <a className="text-link" href="/reservation-policy">
            <T en="Read the reservation policy" fil="Basahin ang patakaran" />
          </a>
        </span>
      </label>
      <p className="field-help">
        <T
          en="This is a request only. Your reservation is pending until staff confirm it."
          fil="Request lamang ito. Pending ang reservation hanggang kumpirmahin ng staff."
        />
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <button
        className="button form-submit"
        type="submit"
        disabled={pending || availableSlots.length === 0}
      >
        {pending ? (
          <T en="Submitting request…" fil="Isinusumite ang request…" />
        ) : (
          <T en="Request reservation" fil="Mag-request ng reservation" />
        )}
      </button>
    </form>
  );
}
