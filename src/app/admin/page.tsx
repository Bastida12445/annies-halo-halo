import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Clock3,
  ClipboardList,
  CreditCard,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
  Utensils,
  Zap,
} from "lucide-react";
import { AdminSalesChart } from "@/components/admin-sales-chart";
import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, formatPhp } from "@/lib/money";

export const metadata: Metadata = { title: "Admin overview" };

const ranges = [
  { id: "7d", label: "7D", days: 6, bucket: "day" },
  { id: "30d", label: "30D", days: 29, bucket: "day" },
  { id: "3m", label: "3M", days: 89, bucket: "week" },
  { id: "1y", label: "1Y", days: 364, bucket: "month" },
] as const;

function dateStart(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00+08:00`);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function dateEndExclusive(value: string | string[] | undefined) {
  const start = dateStart(value);
  return start ? new Date(Date.parse(start) + 86_400_000).toISOString() : null;
}

function photoForProduct(name: string) {
  const normalized = name.toLocaleLowerCase();
  if (normalized.includes("ube") || normalized.includes("shake")) return "/images/customer-dashboard/purple-smoothie.jpg";
  if (normalized.includes("flan")) return "/images/customer-dashboard/leche-flan.jpg";
  if (normalized.includes("mango")) return "/images/customer-dashboard/mango-graham-dessert.jpg";
  return "/images/customer-dashboard/halo-halo-hero.jpg";
}

function activityTitle(action: string) {
  const known: Record<string, string> = {
    "order.created": "New order received",
    "order.status_changed": "Order status updated",
    "payment.cash_collected": "Payment recorded",
    "payment.qr_verified": "QR payment verified",
    "payment.qr_reference_submitted": "Payment reference submitted",
    "reservation.created": "New reservation request",
    "reservation.status_changed": "Reservation updated",
    "product.created": "Menu item added",
    "product.updated": "Menu item updated",
  };
  return known[action] ?? action.split(/[._]/).filter(Boolean).map((word) => `${word[0]?.toUpperCase()}${word.slice(1)}`).join(" ");
}

function activityIcon(action: string) {
  if (action.startsWith("reservation.")) return CalendarDays;
  if (action.startsWith("payment.")) return CreditCard;
  if (action.startsWith("product.")) return Package;
  return ShoppingBag;
}

function activityDetail(entry: {
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: unknown;
}) {
  const details = entry.details && typeof entry.details === "object"
    ? entry.details as Record<string, unknown>
    : {};
  const reference = typeof details.reference === "string"
    ? details.reference
    : typeof details.order_reference === "string"
      ? details.order_reference
      : null;
  const entityId = entry.entity_id ? entry.entity_id.slice(0, 8).toUpperCase() : null;
  if (reference) return reference;
  if (entityId) return `${entry.entity_type.replaceAll("_", " ")} · ${entityId}`;
  return entry.entity_type.replaceAll("_", " ");
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const { supabase, roles } = await requireStaff(["administrator"]);
  const now = new Date();
  const nowIso = now.toISOString();
  const requestedRange = typeof params.range === "string" ? params.range : "30d";
  const selectedRange = ranges.find((range) => range.id === requestedRange) ?? ranges[1];
  const hasCustomRange = typeof params.from === "string" || typeof params.to === "string";
  const customFrom = dateStart(params.from);
  const customTo = dateEndExclusive(params.to);
  const presetFrom = new Date(now.getTime() - selectedRange.days * 86_400_000).toISOString();
  const from = hasCustomRange ? customFrom ?? presetFrom : presetFrom;
  const to = hasCustomRange ? customTo ?? nowIso : nowIso;
  const invalidCustomRange = hasCustomRange && Date.parse(from) >= Date.parse(to);
  const queryFrom = invalidCustomRange ? presetFrom : from;
  const queryTo = invalidCustomRange ? nowIso : to;
  const durationDays = Math.max(1, Math.ceil((Date.parse(queryTo) - Date.parse(queryFrom)) / 86_400_000));
  const bucket = hasCustomRange
    ? durationDays > 180 ? "month" : durationDays > 55 ? "week" : "day"
    : selectedRange.bucket;

  const [metricsResult, activityResult, productsCountResult, salesResult, topProductsResult] = await Promise.all([
    supabase.rpc("get_admin_metrics", { p_from: queryFrom, p_to: queryTo }),
    supabase
      .from("audit_logs")
      .select("id,action,entity_type,entity_id,details,created_at")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.rpc("get_admin_sales_series", { p_from: queryFrom, p_to: queryTo, p_bucket: bucket }),
    supabase.rpc("get_admin_top_products", { p_from: queryFrom, p_to: queryTo, p_limit: 4 }),
  ]);
  const stats = metricsResult.data?.[0];
  const salesPoints = salesResult.data ?? [];
  const topProducts = topProductsResult.data ?? [];
  const popularProduct = topProducts[0];
  const popularProductImage = popularProduct?.image_path
    ? supabase.storage.from("menu").getPublicUrl(popularProduct.image_path).data.publicUrl
    : photoForProduct(popularProduct?.product_name ?? "halo-halo");
  const reservationsCount = (stats?.pending_reservations ?? 0) + (stats?.confirmed_reservations ?? 0);
  const hour = Number(new Intl.DateTimeFormat("en-PH", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Manila",
  }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const hasInsightMigrationError = Boolean(salesResult.error || topProductsResult.error);

  return (
    <AdminShell hideHeading title="Overview" roles={roles}>
      <div className="admin-dashboard-page">
        {invalidCustomRange && (
          <p className="admin-dashboard-notice" role="status">The selected date range is invalid. Showing the recent 30-day report instead.</p>
        )}
        {metricsResult.error && (
          <p className="admin-dashboard-notice" role="status">Dashboard totals could not load. Confirm the core Supabase migration is applied.</p>
        )}
        {hasInsightMigrationError && (
          <p className="admin-dashboard-notice" role="status">
            Sales chart and top menu insights need the admin dashboard migration applied in Supabase.
          </p>
        )}

        <div className="admin-dashboard-lead-grid">
          <section className="admin-dashboard-hero">
            <div className="admin-dashboard-hero-copy">
              <span className="admin-dashboard-greeting"><Sparkles aria-hidden="true" size={15} />{greeting}, Admin!</span>
              <h1>Welcome to<br />Annie&apos;s Halo Halo</h1>
              <p>Manage your business, track sales,<br className="admin-hero-desktop-break" /> and serve more sweet moments.</p>
              <Link className="admin-hero-button" href="#sales-overview">View detailed report <ArrowRight aria-hidden="true" size={16} /></Link>
            </div>
            <div className="admin-dashboard-hero-image" aria-hidden="true">
              <Image
                alt=""
                className="admin-dashboard-halo-image"
                fill
                preload
                sizes="(max-width: 980px) 50vw, 720px"
                src="/images/customer-dashboard/halo-halo-hero.jpg"
              />
            </div>
          </section>

          <aside className="admin-quick-actions" aria-labelledby="admin-quick-actions-title">
            <h2 id="admin-quick-actions-title"><Zap aria-hidden="true" size={20} fill="currentColor" />Quick actions</h2>
            <div className="admin-quick-action-grid">
              <Link href="/admin/orders"><ShoppingBag aria-hidden="true" size={24} /><span>Manage<br />orders</span></Link>
              <Link href="/admin/products"><Utensils aria-hidden="true" size={24} /><span>Manage<br />menu</span></Link>
              <Link href="/admin/reservations"><CalendarDays aria-hidden="true" size={24} /><span>View<br />reservations</span></Link>
              <Link href="/admin/settings"><Sparkles aria-hidden="true" size={23} /><span>Business<br />settings</span></Link>
            </div>
          </aside>
        </div>

        <section className="admin-dashboard-kpis" aria-label="Business summary">
          <Link className="admin-kpi-card" href="/admin/orders">
            <span className="admin-kpi-icon"><ShoppingBag aria-hidden="true" size={23} /></span>
            <span className="admin-kpi-copy"><span>Total orders</span><strong>{stats ? stats.total_orders.toLocaleString("en-PH") : "—"}</strong><small>{stats ? `${stats.pending_orders} awaiting confirmation` : "Unavailable"}</small></span>
          </Link>
          <Link className="admin-kpi-card" href="/admin/reservations">
            <span className="admin-kpi-icon"><CalendarDays aria-hidden="true" size={23} /></span>
            <span className="admin-kpi-copy"><span>Active reservations</span><strong>{stats ? reservationsCount.toLocaleString("en-PH") : "—"}</strong><small>{stats ? `${stats.pending_reservations} pending · ${stats.confirmed_reservations} confirmed` : "Unavailable"}</small></span>
          </Link>
          <div className="admin-kpi-card admin-kpi-sales">
            <span className="admin-kpi-icon"><span aria-hidden="true">₱</span></span>
            <span className="admin-kpi-copy"><span>Paid sales</span><strong>{stats ? formatPhp(stats.paid_sales_cents) : "—"}</strong><small><BadgeCheck aria-hidden="true" size={13} /> Verified payments only</small></span>
          </div>
          <Link className="admin-kpi-card admin-kpi-popular" href="/admin/products">
            <span className="admin-kpi-icon"><Star aria-hidden="true" size={24} fill="currentColor" /></span>
            <span className="admin-kpi-copy"><span>Popular menu</span><strong>{topProducts[0]?.product_name ?? "No top item yet"}</strong><small>{topProducts[0] ? `${topProducts[0].items_sold.toLocaleString("en-PH")} sold in this period` : "Paid order data will appear here"}</small></span>
            <span className="admin-popular-photo"><Image alt={popularProduct?.image_path ? popularProduct.product_name : popularProduct ? `Dessert photo; exact product image unavailable for ${popularProduct.product_name}` : "Dessert menu photo"} className="admin-popular-photo-image" fill sizes="58px" src={popularProductImage} unoptimized={Boolean(popularProduct?.image_path)} /></span>
          </Link>
        </section>

        <div className="admin-dashboard-main-grid">
          <section className="admin-dashboard-panel admin-sales-panel" id="sales-overview" aria-labelledby="admin-sales-title">
            <header className="admin-dashboard-panel-header">
              <h2 id="admin-sales-title"><ChartNoAxesColumnIncreasing aria-hidden="true" size={22} />Sales overview</h2>
              <nav className="admin-range-pills" aria-label="Sales report period">
                {ranges.map((range) => (
                  <Link
                    aria-current={!hasCustomRange && selectedRange.id === range.id ? "page" : undefined}
                    className={!hasCustomRange && selectedRange.id === range.id ? "is-active" : ""}
                    href={`/admin?range=${range.id}#sales-overview`}
                    key={range.id}
                  >{range.label}</Link>
                ))}
              </nav>
            </header>
            <details className="admin-custom-range" open={hasCustomRange}>
              <summary>Custom dates</summary>
              <form action="/admin" method="get">
                <label>From<input defaultValue={typeof params.from === "string" ? params.from : ""} name="from" type="date" /></label>
                <label>Through<input defaultValue={typeof params.to === "string" ? params.to : ""} name="to" type="date" /></label>
                <button type="submit">Apply</button>
              </form>
            </details>
            {salesResult.error ? (
              <div className="admin-chart-empty"><ChartNoAxesColumnIncreasing aria-hidden="true" size={28} /><span>Run the dashboard insights migration to enable the sales chart.</span></div>
            ) : (
              <AdminSalesChart points={salesPoints} rangeLabel={hasCustomRange ? "Custom range" : selectedRange.label} />
            )}
            <div className="admin-sales-footnote"><BadgeCheck aria-hidden="true" size={14} /> Chart includes paid, non-cancelled orders only.</div>
          </section>

          <section className="admin-dashboard-panel admin-activity-panel" aria-labelledby="admin-activity-title">
            <header className="admin-dashboard-panel-header">
              <h2 id="admin-activity-title"><Clock3 aria-hidden="true" size={21} />Recent activities</h2>
              <Link className="admin-view-all" href="/admin/activity">View all <ArrowRight aria-hidden="true" size={15} /></Link>
            </header>
            {activityResult.error ? (
              <div className="admin-activity-empty">Recent activity is temporarily unavailable.</div>
            ) : activityResult.data?.length ? (
              <ol className="admin-activity-list">
                {activityResult.data.map((entry) => {
                  const Icon = activityIcon(entry.action);
                  return (
                    <li key={entry.id}>
                      <span className="admin-activity-node" />
                      <span className="admin-activity-icon"><Icon aria-hidden="true" size={17} /></span>
                      <span className="admin-activity-copy"><strong>{activityTitle(entry.action)}</strong><small>{activityDetail(entry)} · {formatDateTime(entry.created_at)}</small></span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="admin-activity-empty"><ClipboardList aria-hidden="true" size={30} /><strong>No activity recorded yet</strong><span>Order, reservation, and payment updates will appear here.</span></div>
            )}
          </section>
        </div>

        <div className="admin-dashboard-bottom-grid">
          <section className="admin-dashboard-panel admin-top-products" aria-labelledby="admin-top-products-title">
            <header className="admin-dashboard-panel-header">
              <h2 id="admin-top-products-title"><Star aria-hidden="true" size={20} fill="currentColor" />Top selling products</h2>
              <Link className="admin-view-all" href="/admin/products">Manage menu <ArrowRight aria-hidden="true" size={15} /></Link>
            </header>
            {topProductsResult.error ? (
              <div className="admin-activity-empty">Top products need the dashboard insights migration.</div>
            ) : topProducts.length ? (
              <div className="admin-top-product-grid">
                {topProducts.map((product, index) => {
                  const image = product.image_path
                    ? supabase.storage.from("menu").getPublicUrl(product.image_path).data.publicUrl
                    : photoForProduct(product.product_name);
                  return (
                    <Link className="admin-top-product-card" href="/admin/products" key={`${product.product_id ?? product.product_name}-${index}`}>
                      <span className="admin-product-photo">
                        <Image
                          alt={product.image_path ? product.product_name : `Dessert menu photograph; exact product image unavailable for ${product.product_name}`}
                          className="admin-product-photo-image"
                          fill
                          sizes="(max-width: 680px) 43vw, 200px"
                          src={image}
                          unoptimized={Boolean(product.image_path)}
                        />
                      </span>
                      <span className="admin-product-rank">{index + 1}</span>
                      <strong>{product.product_name}</strong>
                      <small>{product.items_sold.toLocaleString("en-PH")} sold</small>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="admin-activity-empty"><Package aria-hidden="true" size={28} /><strong>No paid orders in this period</strong><span>Best sellers will show after verified payments.</span></div>
            )}
          </section>

          <section className="admin-business-promo">
            <div>
              <span className="admin-promo-eyebrow"><Sparkles aria-hidden="true" size={14} />Annie&apos;s Halo Halo</span>
              <h2>Grow your business<br />one sweet moment at a time.</h2>
              <p>Keep your menu fresh and your guests coming back.</p>
              <Link href="/admin/products">Manage menu <ArrowRight aria-hidden="true" size={15} /></Link>
            </div>
            <Image alt="" className="admin-promo-food" fill sizes="(max-width: 980px) 100vw, 360px" src="/images/customer-dashboard/halo-halo-hero.jpg" />
          </section>
        </div>

        <p className="admin-dashboard-range-note">Reporting period: {formatDateTime(queryFrom)} — {formatDateTime(queryTo)} · Active menu products: {productsCountResult.count ?? 0}</p>
      </div>
    </AdminShell>
  );
}
