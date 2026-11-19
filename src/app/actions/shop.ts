"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer, requireUser } from "@/lib/auth";
import { clearBusinessSettingsCache, parseBusinessSettings } from "@/lib/business";
import { clearAdminBusinessSettingsCache } from "@/lib/admin-settings";
import { clearMenuDataCache } from "@/lib/data";
import { checkoutSchema, qrPaymentReferenceSchema, reservationSchema } from "@/lib/schemas";
import type { Json, OrderStatus, ReservationStatus, StaffRole } from "@/types/database";
import { requireStaff } from "@/lib/auth";
import { categorySchema, productSchema, businessSettingsSchema } from "@/lib/schemas";
import { getOrCreatePayMongoCheckout } from "@/lib/paymongo-orders";
import { expirePayMongoCheckoutSession } from "@/lib/paymongo";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isQrPaymentMethod } from "@/lib/payment-qr";
import { getPayMongoConfig } from "@/lib/paymongo-config";

export type ShopActionState = { error?: string; success?: string };

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function jsonField(formData: FormData, name: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text(formData, name)) as unknown };
  } catch {
    return { ok: false };
  }
}

export async function placeOrderAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase, user } = await requireUser("/checkout");
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(text(formData, "items"));
  } catch {
    return { error: "Your cart could not be read. Return to your cart and try again." };
  }
  const parsed = checkoutSchema.safeParse({
    items: rawItems,
    fulfillmentMethod: text(formData, "fulfillment_method"),
    deliveryAddress: text(formData, "delivery_address"),
    serviceArea: text(formData, "service_area"),
    phone: text(formData, "phone"),
    notes: text(formData, "notes"),
    paymentMethod: text(formData, "payment_method"),
    paymongoChannels: (() => {
      try {
        const raw = text(formData, "paymongo_channels");
        return raw ? JSON.parse(raw) as unknown : [];
      } catch {
        return null;
      }
    })(),
    idempotencyKey: text(formData, "idempotency_key"),
    expectedTotalCents: Number(text(formData, "expected_total_cents")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your order details." };

  const order = parsed.data;
  if (order.paymentMethod === "paymongo") {
    const paymongo = getPayMongoConfig();
    if (!paymongo || order.paymongoChannels.length === 0 || order.paymongoChannels.some((channel) => !paymongo.channels.includes(channel))) {
      return { error: "That online payment option is not currently enabled. Choose another payment method or contact the shop." };
    }
  } else if (order.paymongoChannels.length > 0) {
    return { error: "The selected payment option does not match the submitted checkout details." };
  }
  const rpcStartedAt = Date.now();
  const { data, error } = await supabase.rpc("place_order", {
    p_items: order.items as unknown as Json,
    p_fulfillment_method: order.fulfillmentMethod,
    p_delivery_address: order.deliveryAddress || null,
    p_service_area: order.serviceArea || null,
    p_phone: order.phone || null,
    p_notes: order.notes || null,
    p_payment_method: order.paymentMethod,
    p_idempotency_key: order.idempotencyKey,
    p_expected_total_cents: order.expectedTotalCents,
  });
  if (error) {
    const message = error.message.toLowerCase();
    console.error("place_order RPC failed", {
      code: error.code,
      message: error.message.slice(0, 240),
      durationMs: Date.now() - rpcStartedAt,
    });
    if (message.includes("price_changed")) {
      return { error: "A menu price or order option changed. Review the updated cart and confirm again." };
    }
    if (message.includes("unavailable") || message.includes("disabled")) {
      return { error: "That product or order option is currently unavailable." };
    }
    if (message.includes("service_area") || message.includes("minimum_order")) {
      return { error: "Check the delivery area and minimum order requirements." };
    }
    if (message.includes("payment_method")) {
      return { error: "That payment method is not currently enabled." };
    }
    if (["57014", "55P03", "40P01", "40001"].includes(error.code)) {
      return { error: "Checkout took too long because the order service is busy. Your cart is unchanged; please try again." };
    }
    if (message.includes("orders_not_configured")) {
      return { error: "Online ordering is not fully configured yet. Please contact the shop." };
    }
    return { error: "We could not place your order. Check the details and try again." };
  }
  const created = data?.[0];
  if (!created) return { error: "We could not confirm your order. Check your order history before retrying." };
  revalidatePath("/account/orders");
  if (order.paymentMethod === "paymongo") {
    let checkoutUrl = "";
    try {
      checkoutUrl = await getOrCreatePayMongoCheckout(
        supabase,
        user.id,
        created.order_id,
        order.paymongoChannels.length ? order.paymongoChannels : undefined,
      );
    } catch (error) {
      revalidatePath(`/account/orders/${created.order_id}`);
      const state = error instanceof Error && error.message.includes("awaiting_webhook") ? "processing" : error instanceof Error && error.message.includes("session_expired") ? "expired" : "retry";
      redirect(`/account/orders/${encodeURIComponent(created.order_id)}?payment=${state}`);
    }
    redirect(checkoutUrl);
  }
  if (isQrPaymentMethod(order.paymentMethod)) {
    redirect(`/order/payment/${encodeURIComponent(created.order_reference)}`);
  }
  redirect(`/order/confirmation/${encodeURIComponent(created.order_reference)}`);
}

export async function submitQrPaymentReferenceAction(
  _state: ShopActionState,
  formData: FormData,
): Promise<ShopActionState> {
  const { supabase, user } = await requireCustomer("/account/orders");
  const orderId = text(formData, "order_id");
  const parsed = qrPaymentReferenceSchema.safeParse({
    reference: text(formData, "reference"),
  });
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !parsed.success) {
    return { error: parsed.success ? "Choose a valid order." : parsed.error.issues[0]?.message ?? "Enter a valid transfer reference." };
  }
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("order_reference")
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (orderError || !order) {
    return { error: "We could not find that order. Check your order history and try again." };
  }
  const { error } = await supabase.rpc("submit_qr_payment_reference", {
    p_order_id: orderId,
    p_reference: parsed.data.reference,
  });
  if (error) {
    if (error.message.includes("payment_reference_already_used")) {
      return { error: "That transfer reference has already been submitted. Check it and try again." };
    }
    if (error.message.includes("qr_payment_not_pending")) {
      return { error: "This QR payment is no longer awaiting a reference." };
    }
    return { error: "The transfer reference could not be saved. Check the order status and try again." };
  }
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/order/confirmation/${encodeURIComponent(order.order_reference)}`);
  redirect(`/order/confirmation/${encodeURIComponent(order.order_reference)}`);
}

export async function startPayMongoPaymentAction(formData: FormData): Promise<never> {
  const { supabase, user } = await requireCustomer("/account/orders");
  const orderId = text(formData, "order_id");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) redirect("/account/orders");
  let checkoutUrl = "";
  try {
    checkoutUrl = await getOrCreatePayMongoCheckout(supabase, user.id, orderId);
  } catch (error) {
    const state = error instanceof Error && error.message.includes("awaiting_webhook") ? "processing" : error instanceof Error && error.message.includes("session_expired") ? "expired" : "retry";
    redirect(`/account/orders/${encodeURIComponent(orderId)}?payment=${state}`);
  }
  redirect(checkoutUrl);
}

export async function requestReservationAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase } = await requireUser("/reservations/new");
  const rawPartySize = text(formData, "party_size");
  const parsed = reservationSchema.safeParse({
    type: text(formData, "type"),
    requestedAt: text(formData, "requested_at"),
    partySize: rawPartySize ? Number(rawPartySize) : null,
    phone: text(formData, "phone"),
    notes: text(formData, "notes"),
    termsAccepted: formData.get("reservation_terms") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your reservation details." };
  const reservation = parsed.data;
  const { data, error } = await supabase.rpc("request_reservation", {
    p_type: reservation.type,
    p_requested_at: reservation.requestedAt,
    p_party_size: reservation.partySize,
    p_phone: reservation.phone || null,
    p_notes: reservation.notes || null,
    p_terms_accepted: reservation.termsAccepted,
  });
  if (error || !data?.[0]) {
    return { error: "Reservations are unavailable for that time. Choose another configured option or contact the business." };
  }
  revalidatePath("/account/reservations");
  redirect(`/account/reservations/${encodeURIComponent(data[0].reservation_reference)}`);
}

export async function saveProductAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase } = await requireStaff(["administrator", "menu_manager"]);
  const uploaded = formData.get("image");
  let imagePath = text(formData, "image_path").trim();
  let oldImagePath = "";
  const productId = text(formData, "id");
  if (productId) {
    const { data: oldProduct } = await supabase.from("products").select("image_path").eq("id", productId).maybeSingle();
    oldImagePath = oldProduct?.image_path ?? "";
  }
  if (uploaded instanceof File && uploaded.size > 0) {
    if (uploaded.size > 5 * 1024 * 1024) return { error: "Choose an image smaller than 5 MB." };
    const bytes = new Uint8Array(await uploaded.arrayBuffer());
    const mimeTypes: Record<string, { extension: string; valid: (data: Uint8Array) => boolean }> = {
      "image/jpeg": { extension: "jpg", valid: (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff },
      "image/png": { extension: "png", valid: (data) => data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 },
      "image/webp": { extension: "webp", valid: (data) => String.fromCharCode(...data.slice(0, 4)) === "RIFF" && String.fromCharCode(...data.slice(8, 12)) === "WEBP" },
      "image/avif": { extension: "avif", valid: (data) => String.fromCharCode(...data.slice(4, 12)).includes("ftyp") && /avif|avis/.test(String.fromCharCode(...data.slice(8, 20))) },
    };
    const format = mimeTypes[uploaded.type];
    if (!format || !format.valid(bytes)) return { error: "Use a valid JPEG, PNG, WebP, or AVIF image." };
    imagePath = `products/${crypto.randomUUID()}.${format.extension}`;
    const { error: uploadError } = await supabase.storage.from("menu").upload(imagePath, bytes, {
      contentType: uploaded.type,
      upsert: false,
      cacheControl: "31536000",
    });
    if (uploadError) return { error: "The product image could not be uploaded." };
  }
  const parsed = productSchema.safeParse({
    id: productId || undefined,
    category_id: text(formData, "category_id") || null,
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    description: text(formData, "description"),
    price_cents: text(formData, "price_cents"),
    image_path: imagePath,
    sort_order: text(formData, "sort_order"),
    is_active: formData.get("is_active") === "on",
    is_available: formData.get("is_available") === "on",
    is_featured: formData.get("is_featured") === "on",
  });
  if (!parsed.success) {
    if (uploaded instanceof File && imagePath.startsWith("products/")) await supabase.storage.from("menu").remove([imagePath]);
    return { error: parsed.error.issues[0]?.message ?? "Check the product details." };
  }
  const { id: savedId, ...values } = parsed.data;
  const product = {
    ...values,
    description: values.description || null,
    image_path: values.image_path || null,
  };
  const query = savedId
    ? supabase.from("products").update(product).eq("id", savedId)
    : supabase.from("products").insert(product);
  const { error } = await query;
  if (error) {
    if (uploaded instanceof File && imagePath.startsWith("products/")) await supabase.storage.from("menu").remove([imagePath]);
    return { error: "Product could not be saved. Check its slug and category." };
  }
  if (oldImagePath && oldImagePath !== imagePath && !/^https?:\/\//i.test(oldImagePath)) {
    await supabase.storage.from("menu").remove([oldImagePath]);
  }
  revalidatePath("/menu");
  revalidatePath("/admin/products");
  clearMenuDataCache();
  if (!savedId) redirect("/admin/products?saved=product");
  return { success: "Product saved." };
}

export async function deleteProductAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase } = await requireStaff(["administrator", "menu_manager"]);
  const productId = text(formData, "product_id");
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return { error: "Choose a valid product." };
  const { data: product, error: loadError } = await supabase
    .from("products")
    .select("id,name,image_path")
    .eq("id", productId)
    .maybeSingle();
  if (loadError || !product) return { error: "That product could not be found." };
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { error: "Product could not be deleted. Its sales history remains protected." };
  if (product.image_path?.startsWith("products/")) {
    await supabase.storage.from("menu").remove([product.image_path]);
  }
  revalidatePath("/menu");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  clearMenuDataCache();
  return { success: `${product.name} was deleted.` };
}

export async function changeOrderStatusAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase } = await requireUser("/admin/orders");
  const id = text(formData, "order_id");
  const status = text(formData, "new_status") as OrderStatus;
  const allowed: OrderStatus[] = [
    "pending_confirmation", "confirmed", "preparing", "ready_for_pickup",
    "out_for_delivery", "completed", "cancelled",
  ];
  if (!/^[0-9a-f-]{36}$/i.test(id) || !allowed.includes(status)) return { error: "Choose a valid order status." };
  if (status === "cancelled") {
    const { data: order } = await supabase.from("orders").select("id,order_reference,payment_method,payment_status").eq("id", id).maybeSingle();
    if (order?.payment_method === "paymongo" && order.payment_status === "pending") {
      const { data: payment } = await supabase.from("payments").select("provider_session_id,status").eq("order_id", id).eq("provider", "paymongo").maybeSingle();
      if (payment?.provider_session_id && payment.status === "pending") {
        let expiry: "expired" | "paid";
        try {
          expiry = await expirePayMongoCheckoutSession(payment.provider_session_id, order.order_reference);
        } catch {
          return { error: "The PayMongo session could not be safely cancelled. Check its status and try again." };
        }
        if (expiry === "paid") return { error: "PayMongo reports a completed payment. Review the payment before cancelling the order." };
        const service = createServiceRoleClient();
        if (!service) return { error: "Payment cancellation could not be recorded. Contact an administrator." };
        const { error } = await service.rpc("mark_paymongo_session_expired", { p_order_id: id, p_session_id: payment.provider_session_id });
        if (error) return { error: "The PayMongo session expired but its status could not be saved. Contact an administrator." };
      }
    }
  }
  const { error } = await supabase.rpc("change_order_status", {
    p_order_id: id,
    p_new_status: status,
    p_note: text(formData, "note").slice(0, 500) || null,
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  return error ? { error: "The order could not move to that status. It may have changed or the transition may not be allowed." } : { success: "Order status updated." };
}

export async function recordManualPaymentCollectedAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase } = await requireUser("/admin/orders");
  const orderId = text(formData, "order_id");
  const confirmed = formData.get("cash_received") === "on" || formData.get("payment_verified") === "on";
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !confirmed) {
    return { error: "Confirm that the full payment was received and verified." };
  }
  const { error } = await supabase.rpc("record_manual_payment_collected", {
    p_order_id: orderId,
    p_note: text(formData, "note").slice(0, 300) || null,
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return error
    ? { error: "Payment could not be recorded. Check the order, submitted reference, and payment status." }
    : { success: formData.get("payment_verified") === "on" ? "QR payment verified and recorded." : "Cash payment recorded." };
}

export async function changeReservationStatusAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase } = await requireUser("/admin/reservations");
  const id = text(formData, "reservation_id");
  const status = text(formData, "new_status") as ReservationStatus;
  const allowed: ReservationStatus[] = ["pending", "confirmed", "rejected", "cancelled", "completed", "no_show"];
  if (!/^[0-9a-f-]{36}$/i.test(id) || !allowed.includes(status)) return { error: "Choose a valid reservation status." };
  const { error } = await supabase.rpc("change_reservation_status", {
    p_reservation_id: id,
    p_new_status: status,
    p_note: text(formData, "note").slice(0, 500) || null,
  });
  revalidatePath("/admin/reservations");
  revalidatePath(`/admin/reservations/${id}`);
  return error ? { error: "The reservation could not move to that status. It may have changed or the transition may not be allowed." } : { success: "Reservation status updated." };
}

export async function saveBusinessSettingsSectionAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase, user } = await requireStaff(["administrator"]);
  const section = text(formData, "section");
  const { data: current, error: loadError } = await supabase
    .from("business_settings")
    .select("config")
    .eq("id", true)
    .maybeSingle();
  if (loadError) return { error: "Current business settings could not be loaded. Nothing was changed." };

  const currentSettings = parseBusinessSettings(current?.config);
  if (
    section !== "ordering" &&
    current?.config &&
    typeof current.config === "object" &&
    !Array.isArray(current.config) &&
    Array.isArray(current.config.payment_methods)
  ) {
    currentSettings.payment_methods = current.config.payment_methods.filter(
      (method): method is (typeof currentSettings.payment_methods)[number] =>
        method === "cash_on_pickup" || method === "cash_on_delivery" || method === "paymongo",
    );
  }
  const numericField = (name: string) => {
    const value = text(formData, name).trim();
    return value ? Number(value) : Number.NaN;
  };
  let patch: Record<string, unknown>;

  if (section === "business") {
    const socialLinks = jsonField(formData, "social_links");
    if (!socialLinks.ok) return { error: "Social links must be valid JSON. Use [] when there are no links." };
    patch = {
      business_name: text(formData, "business_name"),
      short_description: text(formData, "short_description"),
      brand_story: text(formData, "brand_story"),
      address: text(formData, "address"),
      phone: text(formData, "phone"),
      email: text(formData, "email"),
      business_hours: text(formData, "business_hours"),
      social_links: socialLinks.value,
      announcement: text(formData, "announcement"),
    };
  } else if (section === "ordering") {
    const deliveryAreas = jsonField(formData, "delivery_areas");
    if (!deliveryAreas.ok) return { error: "Delivery areas must be valid JSON. Use [] when delivery is disabled." };
    const paymentMethods = formData
      .getAll("payment_methods")
      .filter((value): value is string => typeof value === "string");

    patch = {
      minimum_order_cents: numericField("minimum_order_cents"),
      estimated_preparation_minutes: text(formData, "estimated_preparation_minutes").trim()
        ? numericField("estimated_preparation_minutes")
        : null,
      estimated_delivery_minutes: text(formData, "estimated_delivery_minutes").trim()
        ? numericField("estimated_delivery_minutes")
        : null,
      pickup_enabled: formData.get("pickup_enabled") === "on",
      delivery_enabled: formData.get("delivery_enabled") === "on",
      delivery_areas: deliveryAreas.value,
      payment_methods: paymentMethods,
      gcash_qr_image_path: currentSettings.gcash_qr_image_path,
      paymaya_qr_image_path: currentSettings.paymaya_qr_image_path,
    };
  } else if (section === "reservations") {
    const reservationTypes = jsonField(formData, "reservation_types");
    const reservationSlots = jsonField(formData, "reservation_slots");
    if (!reservationTypes.ok || !reservationSlots.ok) {
      return { error: "Reservation types and time slots must be valid JSON. Use [] when they are empty." };
    }
    patch = {
      reservations_enabled: formData.get("reservations_enabled") === "on",
      reservation_cancellation_cutoff_hours: numericField("reservation_cancellation_cutoff_hours"),
      reservation_types: reservationTypes.value,
      reservation_slots: reservationSlots.value,
    };
  } else if (section === "policies") {
    patch = {
      policy_copy: {
        privacy: { en: text(formData, "privacy_en"), fil: text(formData, "privacy_fil") },
        terms: { en: text(formData, "terms_en"), fil: text(formData, "terms_fil") },
        refund: { en: text(formData, "refund_en"), fil: text(formData, "refund_fil") },
        ordering: { en: text(formData, "ordering_en"), fil: text(formData, "ordering_fil") },
        reservation: { en: text(formData, "reservation_en"), fil: text(formData, "reservation_fil") },
      },
    };
  } else {
    return { error: "Choose a valid settings section." };
  }

  const parsed = businessSettingsSchema.safeParse({ ...currentSettings, ...patch });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the business settings." };
  }
  const { error } = await supabase.from("business_settings").upsert({
    id: true,
    config: parsed.data as unknown as Json,
    updated_by: user.id,
  });
  if (error) {
    return { error: "Business settings could not be saved." };
  }
  clearBusinessSettingsCache();
  clearAdminBusinessSettingsCache();
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidatePath(`/admin/settings/${section}`);
  return { success: "Settings saved." };
}

export async function saveCategoryAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase } = await requireStaff(["administrator", "menu_manager"]);
  const parsed = categorySchema.safeParse({
    id: text(formData, "id") || undefined,
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    description: text(formData, "description"),
    sort_order: text(formData, "sort_order"),
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) {
    return { error: "Enter a category name and a lowercase hyphenated slug." };
  }
  const { id, ...parsedValues } = parsed.data;
  const values = { ...parsedValues, description: parsedValues.description || null };
  const { error } = id
    ? await supabase.from("categories").update(values).eq("id", id)
    : await supabase.from("categories").insert(values);
  if (error) return { error: "Category could not be saved. Its slug may already be in use." };
  revalidatePath("/menu");
  revalidatePath("/admin/products");
  clearMenuDataCache();
  return { success: id ? "Category updated." : "Category added." };
}

export async function deleteCategoryAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase } = await requireStaff(["administrator", "menu_manager"]);
  const categoryId = text(formData, "category_id");
  if (!/^[0-9a-f-]{36}$/i.test(categoryId)) return { error: "Choose a valid category." };
  const { data: category, error: loadError } = await supabase
    .from("categories")
    .select("id,name")
    .eq("id", categoryId)
    .maybeSingle();
  if (loadError || !category) return { error: "That category could not be found." };
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { error: "Category could not be deleted. Try again or contact an administrator." };
  revalidatePath("/menu");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/categories");
  clearMenuDataCache();
  return { success: `${category.name} was deleted. Its products remain in the menu as uncategorized.` };
}

export async function saveVariantAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase } = await requireUser("/admin/products");
  const productId = text(formData, "product_id");
  const name = text(formData, "name").trim();
  const id = text(formData, "id");
  const adjustment = Number(text(formData, "price_adjustment_cents"));
  if (!/^[0-9a-f-]{36}$/i.test(productId) || name.length < 1 || name.length > 100 || !Number.isInteger(adjustment) || Math.abs(adjustment) > 10_000_000) return { error: "Check the option name and price adjustment." };
  const values = { product_id: productId, name, price_adjustment_cents: adjustment, is_active: formData.get("is_active") === "on" };
  const { error } = id
    ? await supabase.from("product_variants").update(values).eq("id", id).eq("product_id", productId)
    : await supabase.from("product_variants").insert(values);
  if (error) return { error: "Option could not be saved. Its name may already exist for this product." };
  revalidatePath("/admin/products");
  clearMenuDataCache();
  revalidatePath("/menu");
  return { success: id ? "Option updated." : "Option added." };
}

export async function saveAddonAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase } = await requireUser("/admin/products");
  const name = text(formData, "name").trim();
  const addonId = text(formData, "id");
  const description = text(formData, "description").trim();
  const price = Number(text(formData, "price_cents"));
  if (name.length < 1 || name.length > 100 || description.length > 500 || !Number.isInteger(price) || price < 0 || price > 10_000_000) return { error: "Check the add-on name, description, and price." };
  const values = { name, description: description || null, price_cents: price, is_active: formData.get("is_active") === "on" };
  let savedAddonId = addonId;
  if (addonId) {
    const { error } = await supabase.from("product_addons").update(values).eq("id", addonId);
    if (error) return { error: "Add-on could not be updated. Its name may already be in use." };
  } else {
    const { data, error } = await supabase.from("product_addons").insert(values).select("id").single();
    if (error || !data) return { error: "Add-on could not be added. Its name may already be in use." };
    savedAddonId = data.id;
  }
  const productIds = formData.getAll("product_ids").filter((value): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value));
  if (productIds.length) {
    const { error: assignmentError } = await supabase.from("product_addon_assignments").upsert(productIds.map((product_id) => ({ product_id, addon_id: savedAddonId })), { onConflict: "product_id,addon_id", ignoreDuplicates: true });
    if (assignmentError) return { error: "Add-on saved, but it could not be assigned to every selected product." };
  }
  revalidatePath("/menu", "layout");
  revalidatePath("/admin/products");
  clearMenuDataCache();
  return { success: addonId ? "Add-on updated." : "Add-on saved." };
}

export async function assignAddonAction(formData: FormData) {
  const { supabase } = await requireUser("/admin/products");
  const productId = text(formData, "product_id");
  const addonId = text(formData, "addon_id");
  if (!/^[0-9a-f-]{36}$/i.test(productId) || !/^[0-9a-f-]{36}$/i.test(addonId)) return;
  if (formData.get("assigned") === "on") {
    await supabase.from("product_addon_assignments").upsert({ product_id: productId, addon_id: addonId });
  } else {
    await supabase.from("product_addon_assignments").delete().eq("product_id", productId).eq("addon_id", addonId);
  }
  clearMenuDataCache();
  revalidatePath("/menu", "layout");
  revalidatePath("/admin/products");
}

export async function assignStaffRoleAction(_state: ShopActionState, formData: FormData): Promise<ShopActionState> {
  const { supabase } = await requireUser("/admin/staff");
  const email = text(formData, "email").trim().toLowerCase();
  const role = text(formData, "role") as StaffRole;
  const roles: StaffRole[] = ["administrator", "order_manager", "menu_manager", "reservation_manager"];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !roles.includes(role)) return { error: "Enter an existing account email and valid role." };
  const { error } = await supabase.rpc("assign_staff_role", { p_email: email, p_role: role, p_enabled: formData.get("enabled") === "on" });
  if (error) return { error: "Role could not be changed. Confirm that the account exists and you are an administrator." };
  revalidatePath("/admin/staff");
  return { success: "Staff access updated." };
}

export async function cancelOrderAction(formData: FormData) {
  const { supabase, user } = await requireCustomer("/account/orders");
  const id = text(formData, "order_id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const { data: order } = await supabase.from("orders").select("id,order_reference,order_status,customer_id,payment_method,payment_status").eq("id", id).maybeSingle();
  if (!order || order.customer_id !== user.id || order.order_status !== "pending_confirmation") return;
  if (order.payment_method === "paymongo" && order.payment_status === "paid") redirect(`/account/orders/${encodeURIComponent(id)}?payment=paid`);
  if (isQrPaymentMethod(order.payment_method) && order.payment_status === "paid") redirect(`/account/orders/${encodeURIComponent(id)}?payment=paid`);
  if (order.payment_method === "paymongo" && order.payment_status === "pending") {
    const { data: payment } = await supabase.from("payments").select("provider_session_id,status").eq("order_id", id).eq("provider", "paymongo").maybeSingle();
    if (payment?.provider_session_id && payment.status === "pending") {
      let expiry: "expired" | "paid";
      try {
        expiry = await expirePayMongoCheckoutSession(payment.provider_session_id, order.order_reference);
      } catch {
        redirect(`/account/orders/${encodeURIComponent(id)}?payment=processing`);
      }
      if (expiry === "paid") redirect(`/account/orders/${encodeURIComponent(id)}?payment=paid`);
      const service = createServiceRoleClient();
      if (!service) redirect(`/account/orders/${encodeURIComponent(id)}?payment=processing`);
      const { error } = await service.rpc("mark_paymongo_session_expired", { p_order_id: id, p_session_id: payment.provider_session_id });
      if (error) redirect(`/account/orders/${encodeURIComponent(id)}?payment=processing`);
    }
  }
  const { error } = await supabase.rpc("change_order_status", {
    p_order_id: order.id,
    p_new_status: "cancelled",
    p_note: "Customer cancellation request",
  });
  if (error) redirect(`/account/orders/${encodeURIComponent(id)}?payment=processing`);
  revalidatePath("/account/orders");
}

export async function cancelReservationAction(formData: FormData) {
  const { supabase, user } = await requireCustomer("/account/reservations");
  const id = text(formData, "reservation_id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const { data: reservation } = await supabase
    .from("reservations")
    .select("id,customer_id,reservation_status")
    .eq("id", id)
    .maybeSingle();
  if (!reservation || reservation.customer_id !== user.id || reservation.reservation_status !== "pending") return;
  await supabase.rpc("change_reservation_status", {
    p_reservation_id: id,
    p_new_status: "cancelled",
    p_note: "Customer cancellation request",
  });
  revalidatePath("/account/reservations");
}

export async function requireStaffRole(role: StaffRole[]) {
  return requireStaff(role);
}
