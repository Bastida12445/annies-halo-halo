import Image from "next/image";
import { AdminActionForm } from "@/components/admin-action-form";
import { saveBusinessSettingsSectionAction } from "@/app/actions/shop";
import type { BusinessSettings } from "@/lib/business";
import { getPaymentQrImageUrl } from "@/lib/payment-qr";
import type { ReactNode } from "react";

function SectionForm({
  section,
  submitLabel = "Save settings",
  children,
}: {
  section: string;
  submitLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="content-card">
      <AdminActionForm
        action={saveBusinessSettingsSectionAction}
        submitLabel={submitLabel}
        className="form-stack"
      >
        <input type="hidden" name="section" value={section} />
        {children}
      </AdminActionForm>
    </div>
  );
}

export function BusinessSettingsForm({ settings }: { settings: BusinessSettings }) {
  return (
    <SectionForm section="business">
      <label className="field-label">
        Business name
        <input name="business_name" defaultValue={settings.business_name} required maxLength={160} />
      </label>
      <label className="field-label">
        Short description
        <textarea name="short_description" defaultValue={settings.short_description} maxLength={500} rows={2} />
      </label>
      <label className="field-label">
        About the business
        <textarea name="brand_story" defaultValue={settings.brand_story} maxLength={2000} rows={5} />
      </label>
      <label className="field-label">
        Address
        <input name="address" defaultValue={settings.address} maxLength={300} />
      </label>
      <div className="form-grid">
        <label className="field-label">
          Phone
          <input name="phone" defaultValue={settings.phone} maxLength={32} />
        </label>
        <label className="field-label">
          Email
          <input type="email" name="email" defaultValue={settings.email} maxLength={254} />
        </label>
      </div>
      <label className="field-label">
        Business hours
        <textarea name="business_hours" defaultValue={settings.business_hours} maxLength={1000} rows={4} placeholder="Enter the hours confirmed by the owner" />
        <small>These are shown as entered. Do not enter hours that have not been confirmed.</small>
      </label>
      <label className="field-label">
        Social links (JSON)
        <textarea name="social_links" defaultValue={JSON.stringify(settings.social_links, null, 2)} rows={5} spellCheck={false} />
        <small>Use verified public links, for example [{`{"label":"Facebook","url":"https://www.facebook.com/your-page"}`}].</small>
      </label>
      <label className="field-label">
        Announcement
        <textarea name="announcement" defaultValue={settings.announcement} maxLength={500} rows={2} />
      </label>
    </SectionForm>
  );
}

export function OrderingSettingsForm({
  settings,
  paymongoChannels,
}: {
  settings: BusinessSettings;
  paymongoChannels: string[];
}) {
  const gcashQrUrl = getPaymentQrImageUrl(settings.gcash_qr_image_path);
  const paymayaQrUrl = getPaymentQrImageUrl(settings.paymaya_qr_image_path);

  return (
    <SectionForm section="ordering">
      <p className="form-notice">
        Configure fulfillment and payment methods together. Checkout validates that each enabled order type has a matching payment method.
      </p>
      <div className="form-grid">
        <label className="field-label">
          Minimum order in centavos
          <input type="number" name="minimum_order_cents" defaultValue={settings.minimum_order_cents} min={0} max={10000000} step={1} required />
        </label>
        <label className="field-label">
          Estimated preparation minutes
          <input type="number" name="estimated_preparation_minutes" defaultValue={settings.estimated_preparation_minutes ?? ""} min={1} max={1440} step={1} />
          <small>Leave blank until confirmed.</small>
        </label>
        <label className="field-label">
          Estimated delivery minutes
          <input type="number" name="estimated_delivery_minutes" defaultValue={settings.estimated_delivery_minutes ?? ""} min={1} max={1440} step={1} />
          <small>Leave blank until confirmed.</small>
        </label>
      </div>
      <div className="check-row">
        <label><input type="checkbox" name="pickup_enabled" defaultChecked={settings.pickup_enabled} /> Enable pickup</label>
        <label><input type="checkbox" name="delivery_enabled" defaultChecked={settings.delivery_enabled} /> Enable delivery</label>
      </div>
      <label className="field-label">
        Delivery areas (JSON)
        <textarea name="delivery_areas" defaultValue={JSON.stringify(settings.delivery_areas, null, 2)} rows={7} spellCheck={false} />
        <small>Example: [{`{"name":"Confirmed area","fee_cents":0,"minimum_order_cents":0}`}]. Use [] when delivery is disabled.</small>
      </label>
      <fieldset className="option-fieldset">
        <legend className="field-label">Payment methods</legend>
        <div className="check-row">
          <label>
            <input type="checkbox" name="payment_methods" value="cash_on_pickup" defaultChecked={settings.payment_methods.includes("cash_on_pickup")} /> Cash on pickup
          </label>
          <label>
            <input type="checkbox" name="payment_methods" value="cash_on_delivery" defaultChecked={settings.payment_methods.includes("cash_on_delivery")} /> Cash on delivery
          </label>
          {paymongoChannels.length > 0 && (
            <label>
              <input type="checkbox" name="payment_methods" value="paymongo" defaultChecked={settings.payment_methods.includes("paymongo")} /> PayMongo hosted checkout ({paymongoChannels.join(", ")})
            </label>
          )}
          <label>
            <input type="checkbox" name="payment_methods" value="gcash_qr" defaultChecked={settings.payment_methods.includes("gcash_qr")} /> GCash QR (staff verified)
          </label>
          <label>
            <input type="checkbox" name="payment_methods" value="paymaya_qr" defaultChecked={settings.payment_methods.includes("paymaya_qr")} /> Maya / PayMaya QR (staff verified)
          </label>
        </div>
      </fieldset>
      <fieldset className="qr-settings-fieldset">
        <legend className="field-label">Wallet QR codes</legend>
        <p className="field-help">Upload the receive QR shown in your wallet app. Customers pay the order total and submit their transaction reference; staff must verify the transfer before marking it paid.</p>
        <div className="qr-settings-grid">
          <div className="qr-settings-card">
            <strong>GCash receive QR</strong>
            {gcashQrUrl ? <Image src={gcashQrUrl} alt="Current GCash receive QR" width={220} height={220} unoptimized /> : <p className="muted">No GCash QR uploaded yet.</p>}
            <label className="field-label" htmlFor="gcash_qr_file">Upload or replace GCash QR</label>
            <input id="gcash_qr_file" type="file" name="gcash_qr_file" accept="image/png,image/jpeg,image/webp" />
            {settings.gcash_qr_image_path && <label className="check-row"><input type="checkbox" name="remove_gcash_qr" /> Remove the active GCash QR</label>}
          </div>
          <div className="qr-settings-card">
            <strong>Maya / PayMaya receive QR</strong>
            {paymayaQrUrl ? <Image src={paymayaQrUrl} alt="Current Maya / PayMaya receive QR" width={220} height={220} unoptimized /> : <p className="muted">No Maya QR uploaded yet.</p>}
            <label className="field-label" htmlFor="paymaya_qr_file">Upload or replace Maya QR</label>
            <input id="paymaya_qr_file" type="file" name="paymaya_qr_file" accept="image/png,image/jpeg,image/webp" />
            {settings.paymaya_qr_image_path && <label className="check-row"><input type="checkbox" name="remove_paymaya_qr" /> Remove the active Maya QR</label>}
          </div>
        </div>
        <small>Images must be PNG, JPG, or WebP and no larger than 5 MB. QR files already used by pending orders are retained when replaced or removed.</small>
      </fieldset>
      {paymongoChannels.length === 0 && (
        <p className="field-help">PayMongo appears here after its server secret, webhook secret, service role key, and approved channel list are configured.</p>
      )}
    </SectionForm>
  );
}

export function ReservationSettingsForm({ settings }: { settings: BusinessSettings }) {
  return (
    <SectionForm section="reservations">
      <label>
        <input type="checkbox" name="reservations_enabled" defaultChecked={settings.reservations_enabled} /> Enable reservation requests
      </label>
      <label className="field-label">
        Customer cancellation cutoff (hours)
        <input type="number" name="reservation_cancellation_cutoff_hours" defaultValue={settings.reservation_cancellation_cutoff_hours} min={0} max={720} step={1} required />
        <small>Customers can cancel pending requests until this many hours before the requested time.</small>
      </label>
      <label className="field-label">
        Reservation types (JSON)
        <textarea name="reservation_types" defaultValue={JSON.stringify(settings.reservation_types, null, 2)} rows={10} spellCheck={false} />
        <small>Each type has id, label, enabled, capacity, max_advance_days, party_size_required, min_lead_hours, minimum_party_size, and maximum_party_size.</small>
      </label>
      <label className="field-label">
        Reservation time slots (JSON)
        <textarea name="reservation_slots" defaultValue={JSON.stringify(settings.reservation_slots, null, 2)} rows={8} spellCheck={false} />
        <small>Each slot has type_id, starts_at (ISO date/time with timezone), and capacity. Capacity counts guests when party size is required, otherwise it counts requests.</small>
      </label>
    </SectionForm>
  );
}

export function PolicySettingsForm({ settings }: { settings: BusinessSettings }) {
  return (
    <SectionForm section="policies">
      <p className="form-notice">Saved wording replaces the default draft shown to customers. Review the English and Filipino versions before publishing.</p>
      {(
        [
          ["privacy", "Privacy"],
          ["terms", "Terms"],
          ["refund", "Refund and cancellation"],
          ["ordering", "Ordering guide"],
          ["reservation", "Reservation policy"],
        ] as const
      ).map(([key, label]) => (
        <fieldset className="policy-editor" key={key}>
          <legend>{label}</legend>
          <label className="field-label">
            English
            <textarea name={`${key}_en`} defaultValue={settings.policy_copy[key].en} rows={4} maxLength={5000} />
          </label>
          <label className="field-label">
            Filipino
            <textarea name={`${key}_fil`} defaultValue={settings.policy_copy[key].fil} rows={4} maxLength={5000} />
          </label>
        </fieldset>
      ))}
    </SectionForm>
  );
}
