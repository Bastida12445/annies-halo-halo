import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { AdminActionForm } from "@/components/admin-action-form";
import { changeReservationStatusAction } from "@/app/actions/shop";
import { requireStaff } from "@/lib/auth";
import { formatDateTime } from "@/lib/money";
import type { ReservationStatus } from "@/types/database";

export const metadata: Metadata = { title: "Manage reservation" };
const nextStatuses: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["cancelled", "completed", "no_show"],
  rejected: [],
  cancelled: [],
  completed: [],
  no_show: [],
};

export default async function AdminReservationDetail({
  params,
}: PageProps<"/admin/reservations/[id]">) {
  const { id } = await params;
  const { supabase, roles } = await requireStaff([
    "administrator",
    "reservation_manager",
  ]);
  const { data: reservation } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!reservation) notFound();
  const [{ data: customer }, { data: history }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,phone")
      .eq("id", reservation.customer_id)
      .maybeSingle(),
    supabase
      .from("reservation_status_history")
      .select("*")
      .eq("reservation_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const statuses = nextStatuses[reservation.reservation_status];
  return (
    <AdminShell title={`Reservation ${reservation.reservation_reference}`} roles={roles}>
      <div className="content-card">
        <h2>Request details</h2>
        <p>
          <strong>Customer:</strong>{" "}
          {customer?.full_name || "Name not available"}
        </p>
        <p>
          <strong>Customer ID:</strong> {reservation.customer_id}
        </p>
        <p>
          <strong>Contact:</strong>{" "}
          {reservation.customer_phone || customer?.phone || "Not provided"}
        </p>
        <p>
          <strong>Type:</strong> {reservation.reservation_type}
        </p>
        <p>
          <strong>Requested:</strong> {formatDateTime(reservation.requested_at)}
        </p>
        <p>
          <strong>Party size:</strong>{" "}
          {reservation.party_size ?? "Not required"}
        </p>
        <p>
          <strong>Notes:</strong> {reservation.customer_notes || "None"}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span className="status-badge">{reservation.reservation_status}</span>
        </p>
      </div>
      <div className="content-card">
        <h2>Update status</h2>
        {statuses.length ? (
          <AdminActionForm
            action={changeReservationStatusAction}
            submitLabel="Save status"
            className="form-stack"
          >
            <input type="hidden" name="reservation_id" value={reservation.id} />
            <label className="field-label">
              Next status
              <select name="new_status" required>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Staff note
              <textarea name="note" maxLength={500} rows={3} />
            </label>
          </AdminActionForm>
        ) : (
          <p>This reservation is in a final status.</p>
        )}
      </div>
      <div className="content-card">
        <h2>Status history</h2>
        {history?.length ? (
          <ol className="history-list">
            {history.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.new_status.replaceAll("_", " ")}</strong> ·{" "}
                {formatDateTime(entry.created_at)}
                {entry.note && <p>{entry.note}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p>No history is available.</p>
        )}
      </div>
    </AdminShell>
  );
}
