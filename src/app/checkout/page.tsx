import Link from "next/link";
import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";
import { T } from "@/components/language-provider";
import { requireUser } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/business";
import { getSupabaseConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  if (!getSupabaseConfig()) {
    return (
      <section className="section container">
        <div className="form-shell">
          <span className="eyebrow">
            <T en="Order online" fil="Umorder online" />
          </span>
          <h1>
            <T
              en="Checkout setup is not complete"
              fil="Hindi pa tapos ang checkout setup"
            />
          </h1>
          <p className="form-intro">
            <T
              en="Connect Supabase and configure an order fulfillment method and payment method before orders can be submitted."
              fil="Ikonekta ang Supabase at i-configure ang paraan ng pagtanggap at pagbabayad bago makapagsumite ng order."
            />
          </p>
          <Link className="button button-secondary" href="/cart">
            <T en="Back to cart" fil="Bumalik sa cart" />
          </Link>
        </div>
      </section>
    );
  }

  const { supabase, user } = await requireUser("/checkout");
  const [profileResult, settings] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,phone,default_delivery_address")
      .eq("id", user.id)
      .maybeSingle(),
    getBusinessSettings(),
  ]);
  let profile = profileResult.data;
  if (profileResult.error?.code === "42703" || profileResult.error?.code === "PGRST204") {
    const legacyProfile = await supabase
      .from("profiles")
      .select("full_name,phone")
      .eq("id", user.id)
      .maybeSingle();
    profile = legacyProfile.data
      ? { ...legacyProfile.data, default_delivery_address: null }
      : null;
  }
  const anyFulfillment =
    settings.pickup_enabled ||
    (settings.delivery_enabled && settings.delivery_areas.length > 0);
  const anyPayment = settings.payment_methods.length > 0;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">
            <T en="Order online" fil="Umorder online" />
          </span>
          <h1>
            <T en="Checkout" fil="Checkout" />
          </h1>
          <p>
            <T
              en="Review fulfillment details and the current estimated total before placing your order."
              fil="Suriin ang detalye ng order at tinatayang kabuuan bago isumite."
            />
          </p>
        </div>
      </section>
      <section className="section container">
        {!anyFulfillment || !anyPayment ? (
          <div className="form-shell">
            <h2>
              <T
                en="Orders are not available yet"
                fil="Hindi pa available ang order"
              />
            </h2>
            <p className="muted">
              <T
                en="The shop must enable at least one fulfillment method and a supported payment method in its settings. Your cart is saved in this browser."
                fil="Dapat paganahin ng tindahan ang paraan ng pagtanggap at suportadong paraan ng bayad. Naka-save pa rin ang cart sa browser na ito."
              />
            </p>
            <Link className="button button-secondary" href="/cart">
              <T en="Back to cart" fil="Bumalik sa cart" />
            </Link>
          </div>
        ) : (
          <div className="checkout-layout">
            <div>
              <CheckoutForm
                settings={settings}
                name={profile?.full_name ?? user.user_metadata.full_name ?? ""}
                phone={profile?.phone ?? user.user_metadata.phone ?? ""}
                defaultDeliveryAddress={profile?.default_delivery_address ?? ""}
              />
            </div>
            <aside className="content-card checkout-aside">
              <h2>
                <T en="Before you submit" fil="Bago isumite" />
              </h2>
              <p>
                <T
                  en="An order request is not confirmed until the shop reviews it."
                  fil="Hindi kumpirmado ang order hangga’t hindi ito sinusuri ng tindahan."
                />
              </p>
              {settings.estimated_preparation_minutes && (
                <p>
                  <T
                    en={`Estimated preparation time: ${settings.estimated_preparation_minutes} minutes.`}
                    fil={`Tinatayang paghahanda: ${settings.estimated_preparation_minutes} minuto.`}
                  />
                </p>
              )}
              {settings.estimated_delivery_minutes && (
                <p>
                  <T
                    en={`Estimated delivery time: ${settings.estimated_delivery_minutes} minutes after preparation.`}
                    fil={`Tinatayang delivery: ${settings.estimated_delivery_minutes} minuto pagkatapos ihanda.`}
                  />
                </p>
              )}
              <p className="field-help">
                <T
                  en="If an item or price has changed, the server will stop the request so you can review it again."
                  fil="Kung nagbago ang produkto o presyo, ihihinto ng server ang request para masuri mo itong muli."
                />
              </p>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}
