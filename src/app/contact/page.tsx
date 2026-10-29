import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { T } from "@/components/language-provider";
import { getBusinessSettings } from "@/lib/business";

export const metadata: Metadata = {
  title: "Contact",
  description: "Find Annie’s Halo Halo in Loreto, Agusan del Sur.",
};

export default async function ContactPage() {
  const settings = await getBusinessSettings();
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">
            <T en="Get in touch" fil="Makipag-ugnayan" />
          </span>
          <h1>
            <T en="Contact & location" fil="Contact at lokasyon" />
          </h1>
          <p>
            <T
              en="Visit the shop in Loreto, Agusan del Sur. Contact details appear here once the owner confirms them."
              fil="Bisitahin ang tindahan sa Loreto, Agusan del Sur. Ilalagay dito ang contact kapag kinumpirma na ng may-ari."
            />
          </p>
        </div>
      </section>
      <section className="section container">
        <div className="split-section">
          <div className="info-card">
            <h2>
              <T en="Find the shop" fil="Hanapin ang tindahan" />
            </h2>
            <p className="location-card">
              <MapPin size={20} aria-hidden="true" />
              {settings.address}
            </p>
            <a
              className="button"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
              target="_blank"
              rel="noreferrer"
            >
              <T en="Open in Google Maps" fil="Buksan sa Google Maps" />
            </a>
          </div>
          <div className="info-card">
            <h2>
              <T en="Contact details" fil="Mga detalye ng contact" />
            </h2>
            {settings.phone ? (
              <p>
                <Phone size={17} aria-hidden="true" />{" "}
                <a href={`tel:${settings.phone}`}>{settings.phone}</a>
              </p>
            ) : (
              <p className="muted">
                <T
                  en="A phone number has not been confirmed yet."
                  fil="Wala pang kumpirmadong numero ng telepono."
                />
              </p>
            )}
            {settings.email ? (
              <p>
                <Mail size={17} aria-hidden="true" />{" "}
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </p>
            ) : (
              <p className="muted">
                <T
                  en="An email address has not been confirmed yet."
                  fil="Wala pang kumpirmadong email address."
                />
              </p>
            )}
            {settings.business_hours ? (
              <p>
                <strong>
                  <T en="Business hours" fil="Oras ng negosyo" />
                </strong>
                <br />
                {settings.business_hours}
              </p>
            ) : (
              <p className="field-help">
                <T
                  en="Business hours have not been confirmed yet."
                  fil="Wala pang kumpirmadong oras ng negosyo."
                />
              </p>
            )}
            {settings.social_links.length > 0 && (
              <>
                <h3>
                  <T en="Social media" fil="Social media" />
                </h3>
                {settings.social_links.map((link) => (
                  <p key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                    </a>
                  </p>
                ))}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
