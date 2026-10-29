import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { T } from "@/components/language-provider";
import { getBusinessSettings } from "@/lib/business";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Annie’s Halo Halo in Loreto, Agusan del Sur.",
};

export default async function AboutPage() {
  const settings = await getBusinessSettings();
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Annie’s Halo Halo</span>
          <h1>
            <T
              en="A local shop in Loreto"
              fil="Isang lokal na tindahan sa Loreto"
            />
          </h1>
          <p>{settings.short_description}</p>
        </div>
      </section>
      <section className="section container split-section">
        <div>
          <span className="eyebrow">
            <T en="Our story" fil="Ang aming kuwento" />
          </span>
          <h2>
            <T
              en="Made for a little everyday sweetness."
              fil="Para sa tamis ng bawat araw."
            />
          </h2>
          {settings.brand_story ? (
            <p className="lead">{settings.brand_story}</p>
          ) : (
            <p className="lead">
              <T
                en="The shop’s story and photos have not been provided yet. We will share details here once the owner adds them."
                fil="Wala pang ibinigay na kuwento o larawan tungkol sa tindahan. Ilalagay ito rito kapag naibigay na ng may-ari."
              />
            </p>
          )}
        </div>
        <div className="info-card">
          <span className="eyebrow">
            <T en="Find us" fil="Hanapin kami" />
          </span>
          <h2>{settings.business_name}</h2>
          <p className="muted">{settings.address}</p>
          <div className="location-card">
            <MapPin size={20} aria-hidden="true" />
            <span>{settings.address}</span>
          </div>
          <div className="button-row">
            <a
              className="button button-secondary"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
              target="_blank"
              rel="noreferrer"
            >
              <T en="Open in Google Maps" fil="Buksan sa Google Maps" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
