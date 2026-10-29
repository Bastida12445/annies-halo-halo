import Link from "next/link";
import type { Metadata } from "next";
import { T } from "@/components/language-provider";
import { getBusinessSettings } from "@/lib/business";

export const metadata: Metadata = {
  title: "Reservations",
  description: "Check reservation availability at Annie’s Halo Halo.",
};

export default async function ReservationsPage() {
  const now = new Date().toISOString();
  const settings = await getBusinessSettings();
  const available =
    settings.reservations_enabled &&
    settings.reservation_types.some((type) => type.enabled) &&
    Boolean(
      now &&
      settings.reservation_slots.some(
        (slot) => Date.parse(slot.starts_at) > Date.parse(now),
      ),
    );
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">
            <T en="Plan ahead" fil="Magplano nang maaga" />
          </span>
          <h1>
            <T en="Reservations" fil="Mga reserbasyon" />
          </h1>
          <p>
            <T
              en="Reservation requests are available only for types and time slots configured by the shop."
              fil="Available lang ang reservation para sa mga uri at oras na na-configure ng tindahan."
            />
          </p>
        </div>
      </section>
      <section className="section container">
        <div className="form-shell">
          {available ? (
            <>
              <h2>
                <T
                  en="Available reservation options"
                  fil="Mga available na reservation"
                />
              </h2>
              <ul>
                {settings.reservation_types
                  .filter((type) => type.enabled)
                  .map((type) => (
                    <li key={type.id}>{type.label}</li>
                  ))}
              </ul>
              <p className="muted">
                <T
                  en="Requests are pending until staff confirm them. Sign in is required."
                  fil="Pending muna ang request hanggang kumpirmahin ng staff. Kailangan mag-log in."
                />
              </p>
              <Link className="button" href="/reservations/new">
                <T
                  en="Request a reservation"
                  fil="Mag-request ng reservation"
                />
              </Link>
            </>
          ) : (
            <>
              <span className="eyebrow">
                <T en="Not available yet" fil="Hindi pa available" />
              </span>
              <h2>
                <T
                  en="Reservations are currently unavailable"
                  fil="Kasalukuyang hindi available ang reservation"
                />
              </h2>
              <p className="muted">
                <T
                  en="The shop has not configured its reservation services yet. No reservation requests can be submitted right now."
                  fil="Hindi pa na-configure ng tindahan ang reservation service. Hindi pa makakapagsumite ng request."
                />
              </p>
              <Link className="text-link" href="/reservation-policy">
                <T
                  en="Read the reservation policy"
                  fil="Basahin ang patakaran sa reservation"
                />
              </Link>
            </>
          )}
        </div>
      </section>
    </>
  );
}
