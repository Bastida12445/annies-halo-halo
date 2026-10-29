import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth";
import { formatDateTime } from "@/lib/money";
import { getBusinessSettings } from "@/lib/business";
import type { ReservationStatus } from "@/types/database";

export const metadata: Metadata = { title: "Reservations" };
const statuses: ReservationStatus[] = [
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
  "completed",
  "no_show",
];

function isDate(value: string | string[] | undefined): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00+08:00`))
  );
}

export default async function AdminReservationsPage({
  searchParams,
}: PageProps<"/admin/reservations">) {
  const params = await searchParams;
  const q =
    typeof params.q === "string"
      ? params.q
          .toUpperCase()
          .replace(/[^A-Z0-9-]/g, "")
          .slice(0, 32)
      : "";
  const status = statuses.includes(params.status as ReservationStatus)
    ? (params.status as ReservationStatus)
    : "";
  const type = typeof params.type === "string" ? params.type.slice(0, 64) : "";
  const from = isDate(params.from) ? `${params.from}T00:00:00+08:00` : "";
  const to = isDate(params.to)
    ? new Date(
        Date.parse(`${params.to}T00:00:00+08:00`) + 86_400_000,
      ).toISOString()
    : "";
  const page = Math.max(
    1,
    Math.min(
      1000,
      Number.parseInt(
        typeof params.page === "string" ? params.page : "1",
        10,
      ) || 1,
    ),
  );
  const pageSize = 50;
  const [{ supabase, roles }, settings] = await Promise.all([
    requireStaff(["administrator", "reservation_manager"]),
    getBusinessSettings(),
  ]);
  let query = supabase
    .from("reservations")
    .select(
      "id,reservation_reference,customer_id,reservation_type,requested_at,party_size,customer_phone,reservation_status,created_at",
    )
    .order("requested_at", { ascending: false });
  if (q) query = query.ilike("reservation_reference", `%${q}%`);
  if (status) query = query.eq("reservation_status", status);
  if (type) query = query.eq("reservation_type", type);
  if (from) query = query.gte("requested_at", from);
  if (to) query = query.lt("requested_at", to);
  const { data: reservations, error } = await query.range(
    (page - 1) * pageSize,
    page * pageSize - 1,
  );
  const pageUrl = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({
      q,
      status,
      type,
      from: isDate(params.from) ? params.from : "",
      to: isDate(params.to) ? params.to : "",
    }))
      if (value) next.set(key, value);
    next.set("page", String(target));
    return `/admin/reservations?${next.toString()}`;
  };

  return (
    <AdminShell title="Reservations" roles={roles}>
      <form method="get" className="filter-bar">
        <label className="field-label">
          Reference
          <input name="q" defaultValue={q} maxLength={32} placeholder="RS-…" />
        </label>
        <label className="field-label">
          Status
          <select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Type
          <select name="type" defaultValue={type}>
            <option value="">All types</option>
            {settings.reservation_types.map((reservationType) => (
              <option key={reservationType.id} value={reservationType.id}>
                {reservationType.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Date from
          <input
            type="date"
            name="from"
            defaultValue={isDate(params.from) ? params.from : ""}
          />
        </label>
        <label className="field-label">
          Date through
          <input
            type="date"
            name="to"
            defaultValue={isDate(params.to) ? params.to : ""}
          />
        </label>
        <button className="button button-small">Search & filter</button>
        <Link className="text-link" href="/admin/reservations">
          Clear
        </Link>
      </form>
      {error && (
        <p className="form-error" role="alert">
          Reservations could not be loaded. Verify the database migration and
          staff access.
        </p>
      )}
      {!error && reservations?.length ? (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Requested for</th>
                  <th>Party</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td>{reservation.reservation_reference}</td>
                    <td>
                      <span title={reservation.customer_id}>
                        {reservation.customer_id.slice(0, 8)}
                      </span>
                      {reservation.customer_phone && (
                        <small className="table-subline">
                          {reservation.customer_phone}
                        </small>
                      )}
                    </td>
                    <td>
                      {settings.reservation_types.find(
                        (row) => row.id === reservation.reservation_type,
                      )?.label ?? reservation.reservation_type}
                    </td>
                    <td>{formatDateTime(reservation.requested_at)}</td>
                    <td>{reservation.party_size ?? "—"}</td>
                    <td>
                      <span className="status-badge">
                        {reservation.reservation_status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={`/admin/reservations/${reservation.id}`}
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>Page {page}</span>
            {page > 1 && (
              <Link
                className="button button-small button-secondary"
                href={pageUrl(page - 1)}
              >
                Previous
              </Link>
            )}
            {reservations.length === pageSize && (
              <Link className="button button-small" href={pageUrl(page + 1)}>
                Next
              </Link>
            )}
          </div>
        </>
      ) : !error ? (
        <div className="empty-state">
          <h2>No matching reservations</h2>
          <p>Try another reference, date range, type, or status.</p>
        </div>
      ) : null}
    </AdminShell>
  );
}
