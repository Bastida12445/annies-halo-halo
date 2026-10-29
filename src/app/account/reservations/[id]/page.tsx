import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cancelReservationAction } from "@/app/actions/shop";
import { T } from "@/components/language-provider";
import { requireCustomer } from "@/lib/auth";
import { formatDateTime } from "@/lib/money";
import { getSupabaseConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Reservation details",
  robots: { index: false, follow: false },
};

export default async function ReservationDetailsPage({
  params,
}: PageProps<"/account/reservations/[id]">) {
  if (!getSupabaseConfig()) notFound();
  const { id } = await params;
  const { supabase, user } = await requireCustomer(`/account/reservations/${id}`);
  const { data } = await supabase
    .from("reservations")
    .select("*")
    .eq("reservation_reference", id)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  return (
    <section className="customer-account-page">
      <span className="eyebrow">
        <T en="Reservation request" fil="Request ng reservation" />
      </span>
      <h1>{data.reservation_reference}</h1>
      <div className="form-shell">
        <p>
          <T en="Type" fil="Uri" />: {data.reservation_type}
        </p>
        <p>
          <T en="Date and time" fil="Petsa at oras" />:{" "}
          {formatDateTime(data.requested_at)}
        </p>
        {data.party_size && (
          <p>
            <T en="Party size" fil="Bilang ng tao" />: {data.party_size}
          </p>
        )}
        <p>
          <T en="Status" fil="Status" />:{" "}
          <span className="status-badge">
            {data.reservation_status.replaceAll("_", " ")}
          </span>
        </p>
        <p className="field-help">
          <T
            en="A request stays pending until staff confirm it."
            fil="Pending ang request hanggang kumpirmahin ng staff."
          />
        </p>
        {data.reservation_status === "pending" && (
          <form action={cancelReservationAction}>
            <input type="hidden" name="reservation_id" value={data.id} />
            <button className="button button-secondary" type="submit">
              <T en="Request cancellation" fil="Humiling ng pagkansela" />
            </button>
          </form>
        )}
        <div className="form-links">
          <Link href="/account/reservations">
            <T en="Back to reservations" fil="Bumalik sa reservation" />
          </Link>
        </div>
      </div>
    </section>
  );
}
