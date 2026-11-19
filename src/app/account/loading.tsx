import { CalendarDays, ShoppingBag } from "lucide-react";

export default function CustomerDashboardLoading() {
  return (
    <section aria-label="Loading customer dashboard" aria-busy="true" className="customer-dashboard customer-dashboard-loading">
      <div className="customer-loading-hero customer-skeleton" />
      <div className="customer-summary-grid">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="customer-loading-summary customer-skeleton" key={index} />
        ))}
      </div>
      <div className="customer-activity-grid">
        <section className="customer-activity-panel">
          <h2><ShoppingBag aria-hidden="true" size={19} />Recent orders</h2>
          <div className="customer-loading-row customer-skeleton" />
          <div className="customer-loading-row customer-skeleton" />
        </section>
        <section className="customer-activity-panel">
          <h2><CalendarDays aria-hidden="true" size={19} />Upcoming reservations</h2>
          <div className="customer-loading-reservation customer-skeleton" />
        </section>
      </div>
      <span className="sr-only">Loading your customer dashboard…</span>
    </section>
  );
}
