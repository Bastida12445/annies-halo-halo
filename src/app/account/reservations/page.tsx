import Link from "next/link";
import type { Metadata } from "next";
import { T } from "@/components/language-provider";
import { requireCustomer } from "@/lib/auth";
import { formatDateTime } from "@/lib/money";
import { getSupabaseConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Reservation history" };

export default async function ReservationsHistoryPage() {
  if (!getSupabaseConfig())
    return (
      <section className="customer-account-page">
        <div className="form-shell">
          <h1>
            <T
              en="Reservation history is unavailable"
              fil="Hindi available ang reservation history"
            />
          </h1>
        </div>
      </section>
    );
  const { supabase, user } = await requireCustomer("/account/reservations");
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return (
    <section className="customer-account-page">
      <span className="eyebrow">
        <T en="Customer account" fil="Account ng customer" />
      </span>
      <h1>
        <T en="Your reservations" fil="Iyong mga reservation" />
      </h1>
      {error && (
        <p className="form-error" role="alert">
          <T
            en="Reservations could not be loaded."
            fil="Hindi ma-load ang reservation."
          />
        </p>
      )}
      {!error && data?.length ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <T en="Reference" fil="Reference" />
                </th>
                <th>
                  <T en="Type" fil="Uri" />
                </th>
                <th>
                  <T en="Date and time" fil="Petsa at oras" />
                </th>
                <th>
                  <T en="Status" fil="Status" />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((reservation) => (
                <tr key={reservation.id}>
                  <td>{reservation.reservation_reference}</td>
                  <td>{reservation.reservation_type}</td>
                  <td>{formatDateTime(reservation.requested_at)}</td>
                  <td>
                    <span className="status-badge">
                      {reservation.reservation_status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/account/reservations/${reservation.reservation_reference}`}
                    >
                      <T en="View" fil="Tingnan" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !error ? (
        <div className="empty-state">
          <h2>
            <T
              en="No reservation requests yet"
              fil="Wala pang reservation request"
            />
          </h2>
          <p>
            <T
              en="Your reservation history will appear here."
              fil="Lalabas dito ang reservation history."
            />
          </p>
          <div className="button-row" style={{ justifyContent: "center" }}>
            <Link className="button button-secondary" href="/reservations">
              <T en="View reservations" fil="Tingnan ang reservation" />
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
