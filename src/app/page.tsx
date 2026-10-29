import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { T } from "@/components/language-provider";
import { getBusinessSettings } from "@/lib/business";
import { getMenuData } from "@/lib/data";

export default async function Home() {
  const now = new Date().toISOString();
  const [settings, menu] = await Promise.all([
    getBusinessSettings(),
    getMenuData(),
  ]);
  const featured = menu.products
    .filter((product) => product.is_featured && product.is_available)
    .slice(0, 3);

  return (
    <>
      {settings.announcement && (
        <div className="announcement-bar">
          <div className="container">{settings.announcement}</div>
        </div>
      )}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              <T
                en="Annie’s Halo Halo · Loreto"
                fil="Annie’s Halo Halo · Loreto"
              />
            </span>
            <h1>
              <T en="Make room for a little" fil="Maglaan ng oras para sa" />{" "}
              <span>
                <T en="sweetness." fil="matamis na saya." />
              </span>
            </h1>
            <p className="lead">
              <T
                en="Browse Annie’s Halo Halo menu and find us in Loreto, Agusan del Sur. Create an account before placing an order."
                fil="Tingnan ang menu ng Annie’s Halo Halo at hanapin kami sa Loreto, Agusan del Sur. Gumawa muna ng account bago umorder."
              />
            </p>
            <div className="button-row">
              <Link className="button" href="/menu">
                <T en="Explore the menu" fil="Tingnan ang menu" />
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="button button-secondary" href="/ordering-guide">
                <T en="How ordering works" fil="Paano umorder" />
              </Link>
            </div>
          </div>
          <div
            className="hero-visual"
            aria-label="Annie’s Halo Halo typographic brand illustration"
          >
            <div className="halo-seal" aria-hidden="true">
              <span>
                Annie’s
                <br />
                Halo Halo
              </span>
            </div>
            <div className="hero-note">
              <T
                en="A sweet stop in Loreto"
                fil="Matamis na pahingahan sa Loreto"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="How to get started">
        <div className="container trust-grid">
          <div className="trust-item">
            <ShoppingBag size={21} aria-hidden="true" />
            <div>
              <strong>
                <T en="Browse the menu" fil="Tingnan ang menu" />
              </strong>
              <span>
                <T
                  en="See current items and availability"
                  fil="Tingnan ang kasalukuyang produkto at availability"
                />
              </span>
            </div>
          </div>
          <div className="trust-item">
            <BadgeCheck size={21} aria-hidden="true" />
            <div>
              <strong>
                <T
                  en="Your account, your orders"
                  fil="Iyong account, iyong mga order"
                />
              </strong>
              <span>
                <T
                  en="Sign in before placing an order"
                  fil="Mag-log in bago mag-order"
                />
              </span>
            </div>
          </div>
          <div className="trust-item">
            <MapPin size={21} aria-hidden="true" />
            <div>
              <strong>
                <T en="Find us in Loreto" fil="Hanapin kami sa Loreto" />
              </strong>
              <span>{settings.address}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <T en="From the menu" fil="Mula sa menu" />
            </span>
            <h2>
              <T
                en="A taste of what’s available"
                fil="Tingnan ang mga available"
              />
            </h2>
          </div>
          <Link className="text-link" href="/menu">
            <T en="View the menu" fil="Tingnan ang menu" />{" "}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        {featured.length > 0 ? (
          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                hasOptions={menu.productsWithOptions.includes(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="eyebrow">
              <T en="Menu update in progress" fil="Ina-update pa ang menu" />
            </span>
            <h2>
              <T
                en="Our menu will appear here"
                fil="Dito lalabas ang aming menu"
              />
            </h2>
            <p>
              <T
                en="Products will be shown once the shop has added its current menu and availability. Browse the menu page for updates."
                fil="Lalabas ang mga produkto kapag nailagay na ng tindahan ang kasalukuyang menu at availability."
              />
            </p>
          </div>
        )}
      </section>

      <section className="section-tight container split-section">
        <div>
          <span className="eyebrow">
            <T en="A simple start" fil="Madaling magsimula" />
          </span>
          <h2>
            <T
              en="Find your next merienda."
              fil="Hanapin ang susunod mong merienda."
            />
          </h2>
          <p className="lead">
            <T
              en="Check the live menu first. Ordering, delivery, payment, and reservation choices appear only after the shop has configured them."
              fil="Tingnan muna ang live menu. Lalabas lang ang pagpipilian sa order, delivery, bayad, at reserbasyon kapag na-configure na ng tindahan."
            />
          </p>
          <Link className="button button-secondary" href="/about">
            <T en="About the shop" fil="Tungkol sa tindahan" />
          </Link>
        </div>
        <div className="info-card">
          <span className="eyebrow">
            <T en="Getting started" fil="Paano magsimula" />
          </span>
          <ol className="steps-list">
            <li>
              <span className="step-num">1</span>
              <span>
                <strong>
                  <T en="Browse" fil="Tumingin" />
                </strong>
                <span>
                  <T
                    en="Check products and current availability."
                    fil="Tingnan ang mga produkto at availability."
                  />
                </span>
              </span>
            </li>
            <li>
              <span className="step-num">2</span>
              <span>
                <strong>
                  <T en="Sign in" fil="Mag-log in" />
                </strong>
                <span>
                  <T
                    en="An account is required before order or reservation requests."
                    fil="Kailangan ang account bago mag-order o magpa-reserve."
                  />
                </span>
              </span>
            </li>
            <li>
              <span className="step-num">3</span>
              <span>
                <strong>
                  <T en="Review" fil="Suriin" />
                </strong>
                <span>
                  <T
                    en="Confirm the configured options and prices at checkout."
                    fil="Kumpirmahin ang mga naka-configure na opsyon at presyo sa checkout."
                  />
                </span>
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className="section container">
        <div className="location-card">
          <MapPin size={23} aria-hidden="true" />
          <div>
            <span className="eyebrow">
              <T en="Business location" fil="Lokasyon ng negosyo" />
            </span>
            <h3>{settings.address}</h3>
            {settings.business_hours ? (
              <p className="muted">
                <strong>
                  <T en="Hours" fil="Oras" />:
                </strong>{" "}
                {settings.business_hours}
              </p>
            ) : (
              <p className="muted">
                <T
                  en="Business hours have not been confirmed yet."
                  fil="Wala pang kumpirmadong oras ng negosyo."
                />
              </p>
            )}
            {settings.phone && (
              <p>
                <a href={`tel:${settings.phone}`}>{settings.phone}</a>
              </p>
            )}
            <a
              className="text-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
              target="_blank"
              rel="noreferrer"
            >
              <T en="Open in Google Maps" fil="Buksan sa Google Maps" />
            </a>
          </div>
        </div>
      </section>

      {settings.reservations_enabled &&
        settings.reservation_types.some((type) => type.enabled) &&
        now &&
        settings.reservation_slots.some(
          (slot) => Date.parse(slot.starts_at) > Date.parse(now),
        ) && (
          <section className="section-tight container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  <T en="Plan ahead" fil="Magplano nang maaga" />
                </span>
                <h2>
                  <T
                    en="Reservations are available"
                    fil="May reserbasyon na available"
                  />
                </h2>
              </div>
              <Link className="button button-secondary" href="/reservations">
                <T
                  en="View reservation options"
                  fil="Tingnan ang reservation"
                />
              </Link>
            </div>
          </section>
        )}
    </>
  );
}
