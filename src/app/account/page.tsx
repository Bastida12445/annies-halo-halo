import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Heart,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { T } from "@/components/language-provider";
import { hasStaffRole, requireCustomer } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/config";
import { formatDateTime, formatPhp } from "@/lib/money";
import type { OrderStatus, ReservationStatus } from "@/types/database";

export const metadata: Metadata = { title: "Customer dashboard" };

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

const localFoodPhotos = {
  halo: "/images/customer-dashboard/halo-halo-hero.jpg",
  ube: "/images/customer-dashboard/purple-smoothie.jpg",
  flan: "/images/customer-dashboard/leche-flan.jpg",
  mango: "/images/customer-dashboard/mango-graham-dessert.jpg",
} as const;

function foodPhotoFor(name: string) {
  const normalized = name.toLocaleLowerCase();
  if (normalized.includes("ube") || normalized.includes("milkshake") || normalized.includes("shake")) return localFoodPhotos.ube;
  if (normalized.includes("flan")) return localFoodPhotos.flan;
  if (normalized.includes("mango")) return localFoodPhotos.mango;
  return localFoodPhotos.halo;
}

export default async function AccountPage() {
  if (!getSupabaseConfig())
    return (
      <section className="customer-account-page">
        <div className="form-shell">
          <h1><T en="Account setup is not complete" fil="Hindi pa kumpleto ang account setup" /></h1>
          <p className="muted"><T en="Supabase Auth is not configured yet." fil="Hindi pa naka-configure ang Supabase Auth." /></p>
        </div>
      </section>
    );

  const { supabase, user } = await requireCustomer("/account");
  const now = new Date().toISOString();
  const [profileResult, ordersResult, reservationsCountResult, upcomingResult, favoriteResult, staff] = await Promise.all([
    supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle(),
    supabase
      .from("orders")
      .select("id,order_reference,order_status,payment_status,total_cents,created_at", { count: "exact" })
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", user.id),
    supabase
      .from("reservations")
      .select("id,reservation_reference,reservation_type,requested_at,party_size,reservation_status")
      .eq("customer_id", user.id)
      .gte("requested_at", now)
      .in("reservation_status", ["pending", "confirmed"])
      .order("requested_at", { ascending: true })
      .limit(3),
    supabase.rpc("get_customer_favorite_menu"),
    hasStaffRole(
      ["administrator", "order_manager", "menu_manager", "reservation_manager"],
      { supabase, user },
    ),
  ]);

  const orders = ordersResult.data ?? [];
  const orderIds = orders.map((order) => order.id);
  const orderItemsResult = orderIds.length
    ? await supabase
        .from("order_items")
        .select("id,order_id,product_id,item_name_snapshot,unit_price_cents,quantity,line_total_cents")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
    : null;

  const productIds = [...new Set((orderItemsResult?.data ?? []).flatMap((item) => item.product_id ? [item.product_id] : []))];
  const resolvedProducts = productIds.length
    ? await supabase.from("products").select("id,image_path").in("id", productIds)
    : null;
  const productImageById = new Map(
    (resolvedProducts?.data ?? []).flatMap((product) => product.image_path
      ? [[product.id, supabase.storage.from("menu").getPublicUrl(product.image_path).data.publicUrl] as const]
      : []),
  );
  const itemsByOrder = new Map<string, NonNullable<typeof orderItemsResult>["data"]>();
  for (const item of orderItemsResult?.data ?? []) {
    itemsByOrder.set(item.order_id, [...(itemsByOrder.get(item.order_id) ?? []), item]);
  }

  const fullName = profileResult.data?.full_name?.trim() || user.email?.split("@")[0] || "there";
  const favorite = favoriteResult.data?.[0]?.item_name ?? null;
  const staffHref = staff.roles.includes("order_manager")
    ? "/admin/orders"
    : staff.roles.includes("menu_manager")
      ? "/admin/products"
      : "/admin/reservations";
  const hasReadError = Boolean(
    profileResult.error || ordersResult.error || reservationsCountResult.error ||
    upcomingResult.error || orderItemsResult?.error || favoriteResult.error,
  );

  return (
    <section className="customer-dashboard">
      <section className="customer-welcome-hero" aria-labelledby="customer-welcome-title">
        <div className="customer-welcome-copy">
          <span className="customer-welcome-kicker"><Sparkles aria-hidden="true" size={14} /><T en="Welcome back" fil="Maligayang pagbabalik" /></span>
          <h1 id="customer-welcome-title"><T en="Hello" fil="Kamusta" />, {fullName}!</h1>
          <p><T en="Ready for your next delicious treat?" fil="Handa ka na ba sa susunod mong masarap na merienda?" /></p>
          <div className="customer-welcome-actions">
            <Link className="customer-primary-action" href="/account/menu">
              <ShoppingBag aria-hidden="true" size={18} />
              <T en="Order now" fil="Umorder na" />
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <Link className="customer-secondary-action" href="/reservations/new">
              <CalendarDays aria-hidden="true" size={18} />
              <T en="Make reservation" fil="Magpa-reserve" />
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
        </div>
        <div className="customer-welcome-photo" aria-hidden="true">
          <Image
            alt=""
            className="customer-hero-food-image"
            fill
            preload
            sizes="(max-width: 720px) 100vw, (max-width: 1100px) 42vw, 540px"
            src={localFoodPhotos.halo}
          />
          <span className="customer-hero-photo-label">Annie&apos;s Halo Halo</span>
        </div>
      </section>

      {hasReadError && (
        <p className="customer-data-notice" role="status">
          <T en="Some account details could not be refreshed. Open your order or reservation history to check the latest information." fil="Hindi na-refresh ang ilang detalye. Buksan ang history ng order o reservation para makita ang pinakabagong impormasyon." />
        </p>
      )}

      <div className="customer-summary-grid">
        <Link className="customer-summary-card" href="/account/orders">
          <span className="customer-summary-icon"><ShoppingBag aria-hidden="true" size={24} /></span>
          <span className="customer-summary-copy">
            <span className="customer-summary-label"><T en="Total orders" fil="Kabuuang order" /></span>
            <strong>{ordersResult.error ? "—" : ordersResult.count ?? 0}</strong>
          </span>
          <span className="customer-summary-side-icon"><Sparkles aria-hidden="true" size={22} /></span>
        </Link>
        <Link className="customer-summary-card" href="/account/reservations">
          <span className="customer-summary-icon"><CalendarDays aria-hidden="true" size={24} /></span>
          <span className="customer-summary-copy">
            <span className="customer-summary-label"><T en="Reservations" fil="Mga reservation" /></span>
            <strong>{reservationsCountResult.error ? "—" : reservationsCountResult.count ?? 0}</strong>
          </span>
          <span className="customer-summary-side-icon"><CalendarDays aria-hidden="true" size={22} /></span>
        </Link>
        <Link className="customer-summary-card customer-favorite-card" href="/account/menu">
          <span className="customer-summary-icon"><Star aria-hidden="true" size={25} fill="currentColor" /></span>
          <span className="customer-summary-copy">
            <span className="customer-summary-label"><T en="Favorite menu" fil="Paboritong menu" /></span>
            <strong>{favorite ?? <T en="No favorite yet" fil="Wala pang paborito" />}</strong>
            <small>{favorite ? <T en="Your most ordered treat" fil="Pinaka-madalas mong order" /> : <T en="Place an order to find yours" fil="Umorder para malaman ang paborito mo" />}</small>
          </span>
          <Heart aria-hidden="true" className="customer-favorite-heart" size={23} />
        </Link>
      </div>

      <div className="customer-activity-grid">
        <section className="customer-activity-panel" aria-labelledby="recent-orders-title">
          <header className="customer-activity-header">
            <h2 id="recent-orders-title"><ShoppingBag aria-hidden="true" size={21} /><T en="Recent orders" fil="Mga bagong order" /></h2>
            <Link href="/account/orders"><T en="View all" fil="Tingnan lahat" /><ArrowRight aria-hidden="true" size={16} /></Link>
          </header>
          {ordersResult.error ? (
            <div className="customer-dashboard-empty"><ShoppingBag aria-hidden="true" size={34} /><strong><T en="Orders are temporarily unavailable" fil="Pansamantalang hindi available ang mga order" /></strong><span><T en="Please refresh or try again in a moment." fil="I-refresh o subukan ulit maya-maya." /></span></div>
          ) : orders.length ? (
            <ul className="customer-recent-orders">
              {orders.map((order) => {
                const items = itemsByOrder.get(order.id) ?? [];
                const firstItem = items[0];
                const itemName = firstItem?.item_name_snapshot || order.order_reference;
                const photo = firstItem?.product_id ? productImageById.get(firstItem.product_id) : null;
                const statusLabel = orderStatusLabels[order.order_status];
                return (
                  <li key={order.id}>
                    <Link className="customer-order-photo" href={`/account/orders/${order.id}`} aria-label={`${itemName}, order ${order.order_reference}`}>
                      <Image
                        alt={photo ? `${itemName} from Annie's menu` : `Dessert menu photograph; the exact item image is unavailable for ${itemName}`}
                        className="customer-order-thumbnail"
                        fill
                        sizes="78px"
                        src={photo || foodPhotoFor(itemName)}
                        unoptimized={Boolean(photo)}
                      />
                    </Link>
                    <div className="customer-order-info">
                      <Link href={`/account/orders/${order.id}`} className="customer-order-name">{itemName}</Link>
                      <span className="customer-order-price">
                        {firstItem ? `${formatPhp(firstItem.line_total_cents)} · ${firstItem.quantity} ${firstItem.quantity === 1 ? "pc" : "pcs"}` : order.order_reference}
                        {items.length > 1 && <span> · +{items.length - 1} more</span>}
                      </span>
                    </div>
                    <span className={`customer-order-status customer-order-status-${order.order_status}`}>
                      <T en={statusLabel[0]} fil={statusLabel[1]} />
                    </span>
                    <span className="customer-order-date"><CalendarDays aria-hidden="true" size={15} />{formatDateTime(order.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="customer-dashboard-empty">
              <span className="customer-empty-illustration"><ShoppingBag aria-hidden="true" size={32} /><Sparkles aria-hidden="true" size={16} /></span>
              <strong><T en="Your first merienda is waiting" fil="Naghihintay ang una mong merienda" /></strong>
              <span><T en="Your order updates will appear here." fil="Dito lalabas ang mga update ng order mo." /></span>
              <Link className="customer-empty-button" href="/account/menu"><T en="Explore the menu" fil="Tingnan ang menu" /><ArrowRight aria-hidden="true" size={16} /></Link>
            </div>
          )}
        </section>

        <section className="customer-activity-panel" aria-labelledby="upcoming-reservations-title">
          <header className="customer-activity-header">
            <h2 id="upcoming-reservations-title"><CalendarDays aria-hidden="true" size={21} /><T en="Upcoming reservations" fil="Mga paparating na reservation" /></h2>
            <Link href="/account/reservations"><T en="View all" fil="Tingnan lahat" /><ArrowRight aria-hidden="true" size={16} /></Link>
          </header>
          {upcomingResult.error ? (
            <div className="customer-dashboard-empty"><CalendarDays aria-hidden="true" size={34} /><strong><T en="Reservations are temporarily unavailable" fil="Pansamantalang hindi available ang reservation" /></strong><span><T en="Please refresh or try again in a moment." fil="I-refresh o subukan ulit maya-maya." /></span></div>
          ) : upcomingResult.data?.length ? (
            <ul className="customer-upcoming-list">
              {upcomingResult.data.map((reservation) => {
                const statusLabel = reservationStatusLabels[reservation.reservation_status];
                return (
                  <li key={reservation.id}>
                    <span className="customer-reservation-date-icon"><CalendarDays aria-hidden="true" size={23} /></span>
                    <div className="customer-reservation-info">
                      <Link href={`/account/reservations/${reservation.reservation_reference}`} className="customer-reservation-name">{reservation.reservation_type}</Link>
                      <span><Clock3 aria-hidden="true" size={14} />{formatDateTime(reservation.requested_at)}</span>
                      <small>{reservation.party_size ? <T en={`${reservation.party_size} guests`} fil={`${reservation.party_size} katao`} /> : <T en="Table reservation" fil="Reservation ng mesa" />}</small>
                    </div>
                    <span className={`customer-reservation-status customer-reservation-status-${reservation.reservation_status}`}><T en={statusLabel[0]} fil={statusLabel[1]} /></span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="customer-dashboard-empty customer-reservation-empty">
              <span className="customer-calendar-illustration"><CalendarDays aria-hidden="true" size={66} /><Clock3 aria-hidden="true" size={28} /></span>
              <strong><T en="No upcoming reservations" fil="Wala pang paparating na reservation" /></strong>
              <span><T en="Book a table and enjoy your favorite treats!" fil="Magpa-reserve ng mesa at tikman ang mga paborito mo!" /></span>
              <Link className="customer-empty-button" href="/reservations/new"><CalendarDays aria-hidden="true" size={17} /><T en="Make a reservation" fil="Magpa-reserve" /></Link>
            </div>
          )}
        </section>
      </div>

      {staff.authorized && (
        <div className="customer-staff-link">
          <Link className="text-link" href={staffHref}><T en="Open staff workspace" fil="Buksan ang staff workspace" /><ArrowRight aria-hidden="true" size={14} /></Link>
        </div>
      )}
    </section>
  );
}
