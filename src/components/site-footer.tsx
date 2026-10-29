import Link from "next/link";
import { MapPin } from "lucide-react";
import { T } from "@/components/language-provider";
import type { BusinessSettings } from "@/lib/business";

export function SiteFooter({ settings }: { settings: BusinessSettings }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <span className="brand-mark brand-mark-light" aria-hidden="true">
            A
          </span>
          <div>
            <strong>{settings.business_name}</strong>
            <p>{settings.short_description}</p>
          </div>
        </div>
        <div>
          <h2>
            <T en="Explore" fil="Tuklasin" />
          </h2>
          <Link href="/menu">
            <T en="Menu" fil="Menu" />
          </Link>
          <Link href="/ordering-guide">
            <T en="How to order" fil="Paano umorder" />
          </Link>
          <Link href="/reservations">
            <T en="Reservations" fil="Reserbasyon" />
          </Link>
        </div>
        <div>
          <h2>
            <T en="Visit & contact" fil="Lokasyon at contact" />
          </h2>
          <p className="footer-location">
            <MapPin size={16} aria-hidden="true" />
            {settings.address}
          </p>
          {settings.phone && (
            <a href={`tel:${settings.phone}`}>{settings.phone}</a>
          )}
          {settings.email && (
            <a href={`mailto:${settings.email}`}>{settings.email}</a>
          )}
        </div>
        <div>
          <h2>
            <T en="Policies" fil="Mga patakaran" />
          </h2>
          <Link href="/privacy">
            <T en="Privacy" fil="Privacy" />
          </Link>
          <Link href="/terms">
            <T en="Terms" fil="Mga tuntunin" />
          </Link>
          <Link href="/refund-policy">
            <T en="Refund policy" fil="Patakaran sa refund" />
          </Link>
          <Link href="/reservation-policy">
            <T en="Reservation policy" fil="Patakaran sa reserbasyon" />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {settings.business_name}
        </span>
        <span>
          <T
            en="Made for the Loreto community."
            fil="Para sa komunidad ng Loreto."
          />
        </span>
      </div>
    </footer>
  );
}
