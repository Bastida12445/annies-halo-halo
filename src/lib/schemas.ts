import { z } from "zod";

const phone = z
  .string()
  .trim()
  .max(32)
  .transform((value) => value || "")
  .refine((value) => !value || /^[+\d][\d\s().-]{6,30}$/.test(value), {
    message: "Enter a valid contact number.",
  });

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2).max(120),
    phone,
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(10).max(128),
    password_confirmation: z.string(),
    terms: z.literal("on", { error: "Please accept the Terms of Service." }),
    privacy: z.literal("on", { error: "Please acknowledge the Privacy Policy." }),
  })
  .refine((value) => value.password === value.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords do not match.",
  });

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const customerProfileSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone,
  default_delivery_address: z.string().trim().max(500),
});

export const qrPaymentReferenceSchema = z.object({
  reference: z.string().trim().min(4).max(80).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Enter a valid transfer reference."),
});

export const emailSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

export const passwordSchema = z
  .object({ password: z.string().min(10).max(128), confirmation: z.string() })
  .refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
    message: "Passwords do not match.",
  });

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  addonIds: z.array(z.string().uuid()).max(12).default([]),
  quantity: z.number().int().min(1).max(20),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(30),
  fulfillmentMethod: z.enum(["pickup", "delivery"]),
  deliveryAddress: z.string().trim().max(500).optional().default(""),
  serviceArea: z.string().trim().max(120).optional().default(""),
  phone: phone,
  notes: z.string().trim().max(1000).optional().default(""),
  paymentMethod: z.enum(["cash_on_pickup", "cash_on_delivery", "paymongo", "gcash_qr", "paymaya_qr"]),
  idempotencyKey: z.string().uuid(),
  expectedTotalCents: z.number().int().min(0).max(10_000_000),
});

export const reservationSchema = z.object({
  type: z.string().trim().min(1).max(64),
  requestedAt: z.string().datetime({ offset: true }),
  partySize: z.number().int().min(1).max(40).nullable(),
  phone: phone,
  notes: z.string().trim().max(1000).optional().default(""),
  termsAccepted: z.literal(true, { error: "Please agree to the reservation terms." }),
});

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(2000).optional().default(""),
  price_cents: z.coerce.number().int().min(0).max(10_000_000),
  image_path: z.string().trim().max(500).regex(/^(?:products\/[A-Za-z0-9._-]+)?$/, "Choose a valid uploaded image path.").optional().default(""),
  sort_order: z.coerce.number().int().min(0).max(10_000).default(0),
  is_active: z.coerce.boolean().default(false),
  is_available: z.coerce.boolean().default(false),
  is_featured: z.coerce.boolean().default(false),
});

export const businessSettingsSchema = z.object({
  business_name: z.string().trim().min(2).max(160),
  short_description: z.string().trim().max(500),
  brand_story: z.string().trim().max(2000),
  address: z.string().trim().max(300),
  phone: z.string().trim().max(32).refine((value) => !value || /^[+\d][\d\s().-]{6,30}$/.test(value), "Enter a valid contact number."),
  email: z.string().trim().max(254).refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email address."),
  business_hours: z.string().trim().max(1000),
  social_links: z.array(z.object({
    label: z.string().trim().min(1).max(60),
    url: z.string().url().refine((value) => value.startsWith("https://"), "Social links must use HTTPS."),
  })).max(10),
  estimated_preparation_minutes: z.number().int().min(1).max(1440).nullable(),
  estimated_delivery_minutes: z.number().int().min(1).max(1440).nullable(),
  minimum_order_cents: z.number().int().min(0).max(10_000_000),
  pickup_enabled: z.boolean(),
  delivery_enabled: z.boolean(),
  delivery_areas: z.array(
    z.object({
      name: z.string().trim().min(2).max(120),
      fee_cents: z.number().int().min(0).max(100_000),
      minimum_order_cents: z.number().int().min(0).max(10_000_000).default(0),
    }),
  ).max(100),
  payment_methods: z.array(
    z.enum(["cash_on_pickup", "cash_on_delivery", "paymongo", "gcash_qr", "paymaya_qr"]),
  ).max(5).refine((methods) => new Set(methods).size === methods.length, "Choose each payment method once."),
  gcash_qr_image_path: z.string().trim().regex(/^qrs\/gcash-[a-f0-9-]{36}\.(?:png|jpe?g|webp)$/i).nullable(),
  paymaya_qr_image_path: z.string().trim().regex(/^qrs\/paymaya-[a-f0-9-]{36}\.(?:png|jpe?g|webp)$/i).nullable(),
  announcement: z.string().trim().max(500),
  reservations_enabled: z.boolean(),
  reservation_types: z.array(
    z.object({
      id: z.string().trim().min(2).max(64).regex(/^[a-z0-9_-]+$/),
      label: z.string().trim().min(2).max(120),
      enabled: z.boolean(),
      capacity: z.number().int().min(1).max(500).nullable(),
      max_advance_days: z.number().int().min(1).max(365),
      party_size_required: z.boolean(),
      min_lead_hours: z.number().int().min(0).max(720).default(0),
      minimum_party_size: z.number().int().min(1).max(40).default(1),
      maximum_party_size: z.number().int().min(1).max(40).default(40),
    }),
  ).max(20),
  reservation_slots: z.array(z.object({
    type_id: z.string().trim().min(2).max(64),
    starts_at: z.string().datetime({ offset: true }),
    capacity: z.number().int().min(1).max(500),
  })).max(500),
  reservation_cancellation_cutoff_hours: z.number().int().min(0).max(720),
  policy_copy: z.object({
    privacy: z.object({ en: z.string().trim().max(5000), fil: z.string().trim().max(5000) }),
    terms: z.object({ en: z.string().trim().max(5000), fil: z.string().trim().max(5000) }),
    refund: z.object({ en: z.string().trim().max(5000), fil: z.string().trim().max(5000) }),
    ordering: z.object({ en: z.string().trim().max(5000), fil: z.string().trim().max(5000) }),
    reservation: z.object({ en: z.string().trim().max(5000), fil: z.string().trim().max(5000) }),
  }),
}).superRefine((value, context) => {
  const uniqueNames = new Set<string>();
  value.delivery_areas.forEach((area, index) => {
    const normalized = area.name.toLowerCase();
    if (uniqueNames.has(normalized)) context.addIssue({ code: "custom", path: ["delivery_areas", index, "name"], message: "Delivery area names must be unique." });
    uniqueNames.add(normalized);
  });
  const typeIds = new Set<string>();
  value.reservation_types.forEach((type, index) => {
    if (typeIds.has(type.id)) context.addIssue({ code: "custom", path: ["reservation_types", index, "id"], message: "Reservation type IDs must be unique." });
    typeIds.add(type.id);
  });
  const slotKeys = new Set<string>();
  value.reservation_slots.forEach((slot, index) => {
    if (!typeIds.has(slot.type_id)) context.addIssue({ code: "custom", path: ["reservation_slots", index, "type_id"], message: "Each reservation time slot needs a configured type." });
    const key = `${slot.type_id}:${slot.starts_at}`;
    if (slotKeys.has(key)) context.addIssue({ code: "custom", path: ["reservation_slots", index, "starts_at"], message: "Reservation time slots must be unique." });
    slotKeys.add(key);
  });
  if (value.pickup_enabled && !value.payment_methods.some((method) => method === "cash_on_pickup" || method === "paymongo" || method === "gcash_qr" || method === "paymaya_qr")) context.addIssue({ code: "custom", path: ["payment_methods"], message: "Enable a pickup payment method before enabling pickup orders." });
  if (value.delivery_enabled && value.delivery_areas.length === 0) context.addIssue({ code: "custom", path: ["delivery_areas"], message: "Add a delivery area before enabling delivery." });
  if (value.delivery_enabled && !value.payment_methods.some((method) => method === "cash_on_delivery" || method === "paymongo" || method === "gcash_qr" || method === "paymaya_qr")) context.addIssue({ code: "custom", path: ["payment_methods"], message: "Enable a delivery payment method before enabling delivery orders." });
  if (!value.delivery_enabled && value.payment_methods.includes("cash_on_delivery")) context.addIssue({ code: "custom", path: ["payment_methods"], message: "Enable delivery before selecting cash on delivery." });
  if (!value.pickup_enabled && value.payment_methods.includes("cash_on_pickup")) context.addIssue({ code: "custom", path: ["payment_methods"], message: "Enable pickup before selecting cash on pickup." });
  if (value.payment_methods.includes("gcash_qr") && !value.gcash_qr_image_path) context.addIssue({ code: "custom", path: ["gcash_qr_image_path"], message: "Upload the GCash QR image before enabling GCash QR payments." });
  if (value.payment_methods.includes("paymaya_qr") && !value.paymaya_qr_image_path) context.addIssue({ code: "custom", path: ["paymaya_qr_image_path"], message: "Upload the Maya / PayMaya QR image before enabling those payments." });
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;
