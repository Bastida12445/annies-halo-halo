import Link from "next/link";
import type { Metadata } from "next";
import { ReservationForm } from "@/components/reservation-form";
import { T } from "@/components/language-provider";
import { requireUser } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/business";
import { getSupabaseConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Request a reservation",
  robots: { index: false, follow: false },
};

export default async function NewReservationPage() {
  if (!getSupabaseConfig())
    return (
      <section className="section container">
        <div className="form-shell">
          <h1>
            <T
              en="Reservations are unavailable"
              fil="Hindi available ang reservation"
            />
          </h1>
          <p className="muted">
            <T
              en="Supabase and reservation rules must be configured first."
              fil="Kailangang i-configure muna ang Supabase at patakaran sa reservation."
            />
          </p>
          <Link className="text-link" href="/reservations">
            <T en="Back to reservations" fil="Bumalik sa reservation" />
          </Link>
        </div>
      </section>
    );
  const { supabase, user } = await requireUser("/reservations/new");
  const settings = await getBusinessSettings();
  const types = settings.reservation_types.filter((type) => type.enabled);
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();
  const now = new Date().toISOString();
  const typeIds = new Set(types.map((type) => type.id));
  const slots = now
    ? settings.reservation_slots.filter(
        (slot) =>
          typeIds.has(slot.type_id) &&
          Date.parse(slot.starts_at) > Date.parse(now),
      )
    : [];
  if (
    !settings.reservations_enabled ||
    types.length === 0 ||
    slots.length === 0
  ) {
    return (
      <section className="section container">
        <div className="form-shell">
          <h1>
            <T
              en="Reservations are currently unavailable"
              fil="Kasalukuyang hindi available ang reservation"
            />
          </h1>
          <p className="muted">
            <T
              en="The shop has not set reservation types and available times yet."
              fil="Hindi pa nagtatakda ang tindahan ng uri ng reservation at available na oras."
            />
          </p>
          <Link className="text-link" href="/reservations">
            <T en="Back to reservations" fil="Bumalik sa reservation" />
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section className="section container">
      <div className="form-shell">
        <span className="eyebrow">
          <T en="Reservation request" fil="Request ng reservation" />
        </span>
        <h1>
          <T en="Choose a time" fil="Pumili ng oras" />
        </h1>
        <p className="form-intro">
          <T
            en="Only configured future time slots are shown. Requests need staff confirmation."
            fil="Mga naka-configure na oras sa hinaharap lang ang ipinapakita. Kailangan ng kumpirmasyon ng staff."
          />
        </p>
        <ReservationForm
          types={types}
          slots={slots}
          phone={profile?.phone ?? ""}
        />
      </div>
    </section>
  );
}
