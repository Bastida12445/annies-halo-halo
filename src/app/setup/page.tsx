import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Application setup" };

export default function SetupPage() {
  const configured = Boolean(getSupabaseConfig());
  return (
    <section className="section container">
      <div className="form-shell">
        <span className="eyebrow">Application setup</span>
        <h1>
          {configured
            ? "Database setup may be incomplete"
            : "Connect the business database"}
        </h1>
        <p className="muted">
          {configured
            ? "Supabase credentials are present. Apply the migration and create the first administrator to enable staff pages."
            : "Add the Supabase project URL and publishable key to .env.local, then apply the database migration. Setup steps are in the project README."}
        </p>
        <div className="button-row">
          <Link className="button" href="/menu">
            Browse the menu
          </Link>
          <Link className="button button-secondary" href="/login">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
