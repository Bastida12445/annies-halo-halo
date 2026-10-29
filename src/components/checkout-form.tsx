"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { placeOrderAction, type ShopActionState } from "@/app/actions/shop";
import { useCart } from "@/components/cart-provider";
import { T } from "@/components/language-provider";
import { formatPhp } from "@/lib/money";
import type { BusinessSettings } from "@/lib/business";

const initialState: ShopActionState = {};

export function CheckoutForm({
  settings,
  name,
  phone,
  defaultDeliveryAddress,
}: {
  settings: BusinessSettings;
  name: string;
  phone: string;
  defaultDeliveryAddress: string;
}) {
  const cart = useCart();
  const [state, action, pending] = useActionState(
    placeOrderAction,
    initialState,
  );
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(
    settings.pickup_enabled ? "pickup" : "delivery",
  );
  const [serviceArea, setServiceArea] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const idempotencyRef = useRef<HTMLInputElement>(null);

  const selectedArea = settings.delivery_areas.find(
    (area) => area.name === serviceArea,
  );
  const fee = fulfillment === "delivery" ? (selectedArea?.fee_cents ?? 0) : 0;
  const estimatedTotal = cart.totalCents + fee;
  const allowedPaymentMethods = settings.payment_methods.filter((method) =>
    fulfillment === "pickup"
      ? method === "cash_on_pickup" || method === "paymongo" || method === "gcash_qr" || method === "paymaya_qr"
      : method === "cash_on_delivery" || method === "paymongo" || method === "gcash_qr" || method === "paymaya_qr",
  );
  const hasManualQrPayment = allowedPaymentMethods.some(
    (method) => method === "gcash_qr" || method === "paymaya_qr",
  );
  const defaultPaymentMethod = allowedPaymentMethods[0] ?? "";
  const items = useMemo(
    () =>
      JSON.stringify(
        cart.lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          addonIds: line.addons.map((addon) => addon.id),
          quantity: line.quantity,
        })),
      ),
    [cart.lines],
  );

  if (cart.lines.length === 0)
    return (
      <div className="empty-state">
        <h2>
          <T en="Your cart is empty" fil="Walang laman ang cart" />
        </h2>
        <p>
          <T
            en="Add an item from the menu before checkout."
            fil="Magdagdag muna ng produkto mula sa menu."
          />
        </p>
      </div>
    );

  const canDeliver =
    settings.delivery_enabled &&
    settings.delivery_areas.length > 0 &&
    Boolean(selectedArea);
  const canPickup = settings.pickup_enabled;
  const fulfillingAllowed = fulfillment === "pickup" ? canPickup : canDeliver;
  const paymentAvailable = allowedPaymentMethods.length > 0;
  const belowMinimum = cart.totalCents < settings.minimum_order_cents;

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(event) => {
        const idempotencyInput = idempotencyRef.current;
        if (!idempotencyInput) {
          event.preventDefault();
          return;
        }
        if (!idempotencyInput.value) {
          event.preventDefault();
          if (!window.crypto?.getRandomValues) return;
          idempotencyInput.value =
            window.crypto.randomUUID?.() ?? createIdempotencyKey();
          queueMicrotask(() => formRef.current?.requestSubmit());
        }
      }}
    >
      <input type="hidden" name="items" value={items} />
      <input
        ref={idempotencyRef}
        type="hidden"
        name="idempotency_key"
        defaultValue=""
      />
      <input type="hidden" name="expected_total_cents" value={estimatedTotal} />
      <div className="content-card">
        <h2>
          <T en="Fulfillment" fil="Pagtanggap ng order" />
        </h2>
        {name && (
          <p className="field-help">
            <T en="Ordering as" fil="Umorder bilang" /> {name}
          </p>
        )}
        <div className="field">
          <label htmlFor="fulfillment">
            <T
              en="How would you like to receive your order?"
              fil="Paano mo gustong matanggap ang order?"
            />
          </label>
          <select
            id="fulfillment"
            name="fulfillment_method"
            value={fulfillment}
            onChange={(event) =>
              setFulfillment(event.target.value as "pickup" | "delivery")
            }
          >
            <option value="pickup" disabled={!canPickup}>
              <T en="Pickup" fil="Pickup" />
              {!canPickup ? " — unavailable" : ""}
            </option>
            <option
              value="delivery"
              disabled={
                !settings.delivery_enabled ||
                settings.delivery_areas.length === 0
              }
            >
              <T en="Delivery" fil="Delivery" />
              {!settings.delivery_enabled ||
              settings.delivery_areas.length === 0
                ? " — unavailable"
                : ""}
            </option>
          </select>
        </div>
        {fulfillment === "delivery" && (
          <>
            <div className="field">
              <label htmlFor="service_area">
                <T en="Delivery area" fil="Delivery area" />
              </label>
              <select
                id="service_area"
                name="service_area"
                value={serviceArea}
                onChange={(event) => setServiceArea(event.target.value)}
                required
              >
                <option value="">
                  <T
                    en="Select an available area"
                    fil="Pumili ng available na lugar"
                  />
                </option>
                {settings.delivery_areas.map((area) => (
                  <option key={area.name} value={area.name}>
                    {area.name} — {formatPhp(area.fee_cents)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="delivery_address">
                <T en="Delivery address" fil="Delivery address" />
              </label>
              <textarea
                id="delivery_address"
                name="delivery_address"
                maxLength={500}
                defaultValue={defaultDeliveryAddress}
                required
              />
            </div>
            {selectedArea &&
              cart.totalCents < selectedArea.minimum_order_cents && (
                <p className="form-notice">
                  <T
                    en={`This area has a minimum order of ${formatPhp(selectedArea.minimum_order_cents)}.`}
                    fil={`May minimum order na ${formatPhp(selectedArea.minimum_order_cents)} para sa lugar na ito.`}
                  />
                </p>
              )}
          </>
        )}
        <div className="field">
          <label htmlFor="phone">
            <T en="Contact number" fil="Numero ng telepono" />
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            maxLength={32}
            defaultValue={phone}
            autoComplete="tel"
          />
        </div>
        <div className="field">
          <label htmlFor="notes">
            <T en="Order notes (optional)" fil="Tala sa order (opsyonal)" />
          </label>
          <textarea id="notes" name="notes" maxLength={1000} />
        </div>
      </div>

      <div className="content-card">
        <h2>
          <T en="Payment" fil="Pagbabayad" />
        </h2>
        {paymentAvailable ? (
          <div className="field">
            <label htmlFor="payment_method">
              <T en="Payment method" fil="Paraan ng pagbabayad" />
            </label>
            <select
              id="payment_method"
              name="payment_method"
              defaultValue={defaultPaymentMethod}
            >
              {allowedPaymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method === "cash_on_pickup" ? (
                    <T en="Cash on pickup" fil="Cash sa pickup" />
                  ) : method === "cash_on_delivery" ? (
                    <T en="Cash on delivery" fil="Cash sa delivery" />
                  ) : method === "paymongo" ? (
                    <T en={`Pay online with PayMongo (${settings.paymongo_payment_methods.join(", ")})`} fil={`Magbayad online gamit ang PayMongo (${settings.paymongo_payment_methods.join(", ")})`} />
                  ) : method === "gcash_qr" ? (
                    <T en="GCash QR payment" fil="Bayad gamit ang GCash QR" />
                  ) : (
                    <T en="Maya / PayMaya QR payment" fil="Bayad gamit ang Maya / PayMaya QR" />
                  )}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="form-notice">
            <T
              en="No payment method is enabled for this fulfillment option. Contact the shop while it finishes setup."
              fil="Walang naka-enable na paraan ng bayad para sa pagpipiliang ito. Makipag-ugnayan sa tindahan habang inaayos pa ito."
            />
          </p>
        )}
        {settings.payment_methods.includes("paymongo") && (
          <p className="field-help">
            <T en="PayMongo hosts its secure payment page. This website never receives your card or wallet credentials." fil="Nasa PayMongo ang secure na pahina ng bayad. Hindi nakikita ng website na ito ang detalye ng card o wallet mo." />
          </p>
        )}
        {hasManualQrPayment && (
          <p className="form-notice">
            <T en="For QR payments, scan the code shown after placing your order, pay the exact total, and submit your transfer reference. The shop will verify payment before marking it paid." fil="Para sa QR payment, i-scan ang code pagkatapos mag-order, bayaran ang eksaktong total, at isumite ang transfer reference. Beripikahin muna ng tindahan ang bayad bago markahang bayad na." />
          </p>
        )}
      </div>

      <div className="cart-summary">
        <div className="summary-line">
          <span>
            <T en="Estimated subtotal" fil="Tinatayang subtotal" />
          </span>
          <strong>{formatPhp(cart.totalCents)}</strong>
        </div>
        <div className="summary-line">
          <span>
            <T en="Delivery fee" fil="Delivery fee" />
          </span>
          <strong>{formatPhp(fee)}</strong>
        </div>
        <div className="summary-line summary-total">
          <span>
            <T en="Estimated total" fil="Tinatayang kabuuan" />
          </span>
          <strong>{formatPhp(estimatedTotal)}</strong>
        </div>
        {settings.minimum_order_cents > 0 && (
          <p className="field-help">
            <T
              en={`Minimum order: ${formatPhp(settings.minimum_order_cents)} before delivery fees.`}
              fil={`Minimum na order: ${formatPhp(settings.minimum_order_cents)} bago ang delivery fee.`}
            />
          </p>
        )}
        <p className="field-help">
          <T
            en="The server recalculates this total. If a price or availability changed, you’ll review the updated cart before placing the order."
            fil="Muling kakalkulahin ng server ang kabuuan. Kung nagbago ang presyo o availability, susuriin mo muna ang cart bago umorder."
          />
        </p>
        <p className="field-help">
          <T
            en="By placing an order, you agree to the ordering terms and acknowledge the privacy policy."
            fil="Sa pag-order, sumasang-ayon ka sa mga tuntunin ng order at kinikilala ang patakaran sa privacy."
          />{" "}
          <Link className="text-link" href="/terms">
            <T en="Terms" fil="Mga tuntunin" />
          </Link>{" "}
          ·{" "}
          <Link className="text-link" href="/privacy">
            <T en="Privacy" fil="Privacy" />
          </Link>
        </p>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        {belowMinimum && (
          <p className="form-notice">
            <T
              en="The cart is below the shop’s minimum order amount."
              fil="Mas mababa sa minimum order ng tindahan ang laman ng cart."
            />
          </p>
        )}
        {fulfillment === "delivery" &&
          selectedArea &&
          cart.totalCents < selectedArea.minimum_order_cents && (
            <p className="form-notice">
              <T
                en="The cart is below this area’s minimum order amount."
                fil="Mas mababa sa minimum order ng lugar na ito ang laman ng cart."
              />
            </p>
          )}
        <button
          className="button form-submit"
          type="submit"
          disabled={
            pending ||
            !fulfillingAllowed ||
            !paymentAvailable ||
            !cart.lines.length ||
            belowMinimum ||
            (fulfillment === "delivery" &&
              cart.totalCents < (selectedArea?.minimum_order_cents ?? 0))
          }
        >
          {pending ? (
            <T en="Submitting order…" fil="Isinusumite ang order…" />
          ) : (
            <T en="Place order" fil="Ilagay ang order" />
          )}
        </button>
      </div>
    </form>
  );
}

function createIdempotencyKey() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
