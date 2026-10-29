import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarDays, CircleUserRound, Clock3, ShoppingBag } from "lucide-react";
import { T } from "@/components/language-provider";
import { hasStaffRole, requireCustomer } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/config";
import { formatDateTime, formatPhp } from "@/lib/money";
import type { OrderStatus, ReservationStatus } from "@/types/database";

export const metadata: Metadata = { title: "My account" };

const orderStatusLabels: Record<OrderStatus, [string, string]> = {
  pending_confirmation: ["Pending confirmation", "Pending kumpirmasyon"],
  confirmed: ["Confirmed", "Kumpirmado"],
  preparing: ["Being prepared", "Inihahanda"],
  ready_for_pickup: ["Ready for pickup", "Handa nang kunin"],
  out_for_delivery: ["Out for delivery", "Ipinapadala na"],
  completed: ["Completed", "Tapos na"],
  cancelled: ["Cancelled", "Nakansela"],
};

const reservationStatusLabels: Record<ReservationStatus, [string, string]> = {
  pending: ["Pending", "Pending"],
  confirmed: ["Confirmed", "Kumpirmado"],
  rejected: ["Declined", "Tinanggihan"],
  cancelled: ["Cancelled", "Nakansela"],
  completed: ["Completed", "Tapos na"],
  no_show: ["Missed", "Hindi napuntahan"],
};

const paymentStatusLabels: Record<string, [string, string]> = {
  unpaid: ["Unpaid", "Hindi pa bayad"],
  pending: ["Payment pending", "Naghihintay ng bayad"],
  paid: ["Paid", "Bayad na"],
  failed: ["Payment failed", "Nabigo ang bayad"],
  expired: ["Payment expired", "Nag-expire ang bayad"],
  refunded: ["Refunded", "Na-refund"],
};

export default async function AccountPage() {
  if (!getSupabaseConfig())
    return (
      <section className="customer-account-page">
        <div className="form-shell">
          <h1>
            <T en="Account setup is not complete" fil="Hindi pa kumpleto ang account setup" />
          </h1>
          <p className="muted">
            <T en="Supabase Auth is not configured yet." fil="Hindi pa naka-configure ang Supabase Auth." />
          </p>
        </div>
      </section>
    );

  const { supabase, user } = await requireCustomer("/account");
  const [profileResult, ordersResult, reservationsResult, staff] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,phone")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id,order_reference,order_status,payment_status,total_cents,created_at", { count: "exact" })
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("reservations")
      .select("id,reservation_reference,reservation_type,requested_at,party_size,reservation_status,created_at", { count: "exact" })
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    hasStaffRole(
      ["administrator", "order_manager", "menu_manager", "reservation_manager"],
      { supabase, user },
    ),
  ]);

  const profile = profileResult.data;
  const orders = ordersResult.data ?? [];
  const reservations = reservationsResult.data ?? [];
  const fullName = profile?.full_name?.trim() || "";
  const phone = profile?.phone?.trim() || "";
  const email = user.email ?? "";
  const completionFields = [Boolean(fullName), Boolean(email), Boolean(phone)];
  const completionPercent = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100,
  );
  const staffHref = staff.roles.includes("order_manager")
    ? "/admin/orders"
    : staff.roles.includes("menu_manager")
      ? "/admin/products"
      : "/admin/reservations";

  return (
    <section className="customer-dashboard">
      <div className="customer-dashboard-hero">
        <div className="customer-dashboard-intro">
          <span className="eyebrow"><T en="Customer account" fil="Account ng customer" /></span>
          <h1>
            <T en="Welcome" fil="Maligayang pagdating" />{fullName ? `, ${fullName}` : ""}
          </h1>
          <p><T en="Your orders, reservations, and account details in one place." fil="Nasa iisang lugar ang iyong mga order, reservation, at detalye ng account." /></p>
        </div>
        <div className="customer-dashboard-actions">
          <Link className="button" href="/menu">
            <ShoppingBag size={17} aria-hidden="true" />
            <T en="Browse menu" fil="Tingnan ang menu" />
          </Link>
          <Link className="button button-secondary" href="/reservations">
            <CalendarDays size={17} aria-hidden="true" />
            <T en="Make a reservation" fil="Magpa-reserve" />
          </Link>
        </div>
      </div>

      {(ordersResult.error || reservationsResult.error || profileResult.error) && (
        <p className="form-notice" role="status">
          <T en="Some account details could not be refreshed. You can still open your full order and reservation history." fil="Hindi na-refresh ang ilang detalye. Maaari mo pa ring buksan ang buong history ng order at reservation." />
        </p>
      )}

      <div className="account-grid customer-dashboard-metrics">
        <Link className="metric-card customer-metric-link" href="/account/orders">
          <span><T en="All orders" fil="Lahat ng order" /></span>
          <strong>{ordersResult.count ?? 0}</strong>
          <small><T en="View your order history" fil="Tingnan ang history ng order" /> <ArrowRight size={14} aria-hidden="true" /></small>
        </Link>
        <Link className="metric-card customer-metric-link" href="/account/reservations">
          <span><T en="Reservations" fil="Mga reservation" /></span>
          <strong>{reservationsResult.count ?? 0}</strong>
          <small><T en="View your reservation requests" fil="Tingnan ang reservation request" /> <ArrowRight size={14} aria-hidden="true" /></small>
        </Link>
        <div className="metric-card customer-email-metric">
          <span><T en="Signed in as" fil="Naka-log in bilang" /></span>
          <strong title={email}>{email || "—"}</strong>
          <small><T en="Your account email" fil="Email ng account mo" /></small>
        </div>
      </div>

      <div className="customer-dashboard-panels">
        <section className="content-card customer-dashboard-panel">
          <div className="customer-panel-heading">
            <div>
              <span className="eyebrow"><T en="Order activity" fil="Aktibidad ng order" /></span>
              <h2><T en="Recent orders" fil="Mga bagong order" /></h2>
            </div>
            <Link className="text-link" href="/account/orders"><T en="See all" fil="Tingnan lahat" /></Link>
          </div>
          {ordersResult.error ? (
            <p className="muted"><T en="Orders are temporarily unavailable." fil="Pansamantalang hindi available ang mga order." /></p>
          ) : orders.length ? (
            <ul className="customer-activity-list">
              {orders.map((order) => (
                <li key={order.id}>
                  <div className="customer-activity-main">
                    <Link href={`/account/orders/${order.id}`} className="customer-activity-title">{order.order_reference}</Link>
                    <span>{formatDateTime(order.created_at)}</span>
                    <span className="status-badge">
                      <T en={orderStatusLabels[order.order_status][0]} fil={orderStatusLabels[order.order_status][1]} />
                    </span>
                  </div>
                  <div className="customer-activity-side">
                    <strong>{formatPhp(order.total_cents)}</strong>
                    <small className={order.payment_status === "paid" ? "payment-label payment-label-success" : "payment-label"}>
                      <T en={(paymentStatusLabels[order.payment_status] ?? [order.payment_status, order.payment_status])[0]} fil={(paymentStatusLabels[order.payment_status] ?? [order.payment_status, order.payment_status])[1]} />
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="customer-empty-panel">
              <ShoppingBag size={22} aria-hidden="true" />
              <p><strong><T en="Your first merienda is waiting." fil="Naghihintay ang una mong merienda." /></strong><br /><T en="Your order updates will show here." fil="Dito lalabas ang mga update ng order mo." /></p>
              <Link className="text-link" href="/menu"><T en="Explore the menu" fil="Tingnan ang menu" /> <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          )}
        </section>

        <section className="content-card customer-dashboard-panel">
          <div className="customer-panel-heading">
            <div>
              <span className="eyebrow"><T en="Plan your visit" fil="Planuhin ang pagbisita" /></span>
              <h2><T en="Recent reservations" fil="Mga bagong reservation" /></h2>
            </div>
            <Link className="text-link" href="/account/reservations"><T en="See all" fil="Tingnan lahat" /></Link>
          </div>
          {reservationsResult.error ? (
            <p className="muted"><T en="Reservations are temporarily unavailable." fil="Pansamantalang hindi available ang reservation." /></p>
          ) : reservations.length ? (
            <ul className="customer-activity-list">
              {reservations.map((reservation) => (
                <li key={reservation.id}>
                  <div className="customer-activity-main">
                    <Link href={`/account/reservations/${reservation.reservation_reference}`} className="customer-activity-title">{reservation.reservation_type}</Link>
                    <span>{reservation.reservation_reference}</span>
                    <span className="customer-date-line"><Clock3 size={13} aria-hidden="true" /> {formatDateTime(reservation.requested_at)}</span>
                  </div>
                  <div className="customer-activity-side">
                    {reservation.party_size && <strong><T en={`${reservation.party_size} guests`} fil={`${reservation.party_size} katao`} /></strong>}
                    <small className="status-badge">
                      <T en={reservationStatusLabels[reservation.reservation_status][0]} fil={reservationStatusLabels[reservation.reservation_status][1]} />
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="customer-empty-panel">
              <CalendarDays size={22} aria-hidden="true" />
              <p><strong><T en="Planning a visit?" fil="May planong bumisita?" /></strong><br /><T en="Your reservation updates will show here." fil="Dito lalabas ang mga update ng reservation mo." /></p>
              <Link className="text-link" href="/reservations"><T en="View reservation options" fil="Tingnan ang reservation" /> <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          )}
        </section>
      </div>

      <section className="content-card customer-profile-card">
        <div className="customer-profile-icon"><CircleUserRound size={23} aria-hidden="true" /></div>
        <div className="customer-profile-copy">
          <span className="eyebrow"><T en="Profile settings" fil="Settings ng profile" /></span>
          <h2><T en="Keep your details up to date" fil="Panatilihing updated ang detalye mo" /></h2>
          <p>{phone || <T en="Add a phone number to make order follow-up easier." fil="Magdagdag ng numero para mas madaling makipag-ugnayan tungkol sa order." />}</p>
          <Link className="text-link" href="/account/profile"><T en="Manage professional profile" fil="Pamahalaan ang professional profile" /> <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        <div className="profile-completion" aria-label={`${completionPercent}% profile complete`}>
          <div className="profile-completion-label"><strong>{completionPercent}%</strong><span><T en="profile complete" fil="kumpleto ang profile" /></span></div>
          <div className="profile-progress-track" role="progressbar" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${completionPercent}%` }} />
          </div>
        </div>
      </section>

      {staff.authorized && (
        <div className="customer-staff-link">
          <Link className="text-link" href={staffHref}>
            <T en="Open staff workspace" fil="Buksan ang staff workspace" /> <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}
