import Link from "next/link";
import type { Metadata } from "next";
import { Clock3, MapPin, Sparkles } from "lucide-react";
import { T } from "@/components/language-provider";
import { getBusinessSettings } from "@/lib/business";

export const metadata: Metadata = {
  title: "Our story",
  description: "Meet Annie’s Halo Halo from your customer dashboard.",
};

export default async function CustomerStoryPage() {
  const settings = await getBusinessSettings();

  return (
    <section className="customer-account-page customer-story-page">
      <div className="customer-story-hero">
        <span className="eyebrow"><T en="Our story" fil="Ang aming kuwento" /></span>
        <h1><T en="A little sweetness in Loreto" fil="Muntiling tamis sa Loreto" /></h1>
        <p>{settings.short_description}</p>
      </div>

      <div className="customer-story-layout">
        <article className="content-card customer-story-copy">
          <Sparkles size={22} aria-hidden="true" />
          <h2><T en="Made for everyday merienda" fil="Para sa merienda sa araw-araw" /></h2>
          <p className="lead">
            <T
              en="Halo-halo turns a simple merienda into a small moment to slow down: cool sweetness, familiar flavors, and something good to share."
              fil="Ginagawang munting pahinga ng halo-halo ang simpleng merienda: malamig na tamis, pamilyar na lasa, at pagkaing masarap pagsaluhan."
            />
          </p>
          <p>
            <T
              en="Annie’s Halo Halo is here in Loreto for everyday cravings and catch-ups. Stop by, choose a favorite, and make a little room in your day for merienda."
              fil="Narito ang Annie’s Halo Halo sa Loreto para sa pang-araw-araw na cravings at kuwentuhan. Pumili ng paborito at maglaan ng kaunting oras para sa merienda."
            />
          </p>
          <p>
            <T
              en="We’re glad to be part of the neighborhood, one cup and one shared table at a time."
              fil="Masaya kaming maging bahagi ng komunidad, isang tasa at salu-salo sa bawat pagkakataon."
            />
          </p>
          <Link className="button" href="/account/menu">
            <T en="Explore the menu" fil="Tingnan ang menu" />
          </Link>
        </article>

        <aside className="content-card customer-story-location">
          <span className="eyebrow"><T en="Visit us" fil="Bisitahin kami" /></span>
          <h2>{settings.business_name}</h2>
          <p className="customer-story-address">
            <MapPin size={18} aria-hidden="true" />
            <span>{settings.address}</span>
          </p>
          {settings.business_hours && (
            <p className="customer-story-hours">
              <Clock3 size={18} aria-hidden="true" />
              <span>
                <strong><T en="Business hours" fil="Oras ng negosyo" /></strong>
                <br />
                {settings.business_hours}
              </span>
            </p>
          )}
          <a
            className="button button-secondary"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
            target="_blank"
            rel="noreferrer"
          >
            <T en="Open map" fil="Buksan ang mapa" />
          </a>
        </aside>
      </div>
    </section>
  );
}
