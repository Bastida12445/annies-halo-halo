"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAppBaseUrl } from "@/lib/config";
import { requireCustomer } from "@/lib/auth";
import { safeInternalRedirect } from "@/lib/redirects";
import {
  emailSchema,
  customerProfileSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/types/database";

export type ActionState = { error?: string; success?: string };

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function registerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    full_name: text(formData, "full_name"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    password_confirmation: text(formData, "password_confirmation"),
    terms: formData.get("terms") === "on" ? "on" : "",
    privacy: formData.get("privacy") === "on" ? "on" : "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  let destination = "/account";
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone || null,
          terms_accepted_at: new Date().toISOString(),
          privacy_acknowledged_at: new Date().toISOString(),
        },
        emailRedirectTo: `${getAppBaseUrl()}/auth/callback?next=${encodeURIComponent(safeInternalRedirect(text(formData, "next")))}`,
      },
    });
    if (error) return { error: "We could not complete registration. Check your details and try again." };
    if (!data.session) {
      return {
        error:
          "Email confirmation is still enabled in Supabase. Turn off Confirm email in Authentication settings, then try again.",
      };
    }
    const requested = safeInternalRedirect(text(formData, "next"));
    destination = requested.startsWith("/admin") ? "/account" : requested;
  } catch {
    return { error: "Account registration is not available until Supabase is configured." };
  }
  redirect(destination);
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: text(formData, "email"), password: text(formData, "password") });
  if (!parsed.success) return { error: "Enter a valid email and password." };
  let destination = "/account";
  try {
    const supabase = await createClient();
    const { data: auth, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !auth.user) return { error: "The email or password is incorrect." };

    const { data: staffRows, error: staffError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.user.id);
    if (staffError) return { error: "We could not load your account access. Please try again." };

    const roles = new Set<StaffRole>((staffRows ?? []).map((row) => row.role));
    if (roles.has("administrator")) destination = "/admin";
    else if (roles.has("order_manager")) destination = "/admin/orders";
    else if (roles.has("menu_manager")) destination = "/admin/products";
    else if (roles.has("reservation_manager")) destination = "/admin/reservations";
    else {
      const requested = safeInternalRedirect(text(formData, "next"));
      destination = requested.startsWith("/admin") ? "/account" : requested;
    }
  } catch {
    return { error: "Sign in is not available until Supabase is configured." };
  }
  redirect(destination);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function forgotPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse({ email: text(formData, "email") });
  if (!parsed.success) return { error: "Enter a valid email address." };
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${getAppBaseUrl()}/auth/callback?next=/reset-password`,
    });
  } catch {
    // Keep the response identical so account existence is not disclosed.
  }
  return { success: "If the address is registered, a password reset link will be sent." };
}

export async function resetPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordSchema.safeParse({
    password: text(formData, "password"),
    confirmation: text(formData, "confirmation"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the new password." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { error: "The password link is invalid or expired. Request a new link." };
  } catch {
    return { error: "The password link is invalid or expired. Request a new link." };
  }
  redirect("/login?reset=success");
}

export async function updateProfileAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireCustomer("/account/profile");
  const submittedDeliveryAddress = formData.has("default_delivery_address");
  const parsed = customerProfileSchema.safeParse({
    full_name: text(formData, "full_name"),
    phone: text(formData, "phone"),
    default_delivery_address: text(formData, "default_delivery_address"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your profile details." };
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      ...(submittedDeliveryAddress
        ? { default_delivery_address: parsed.data.default_delivery_address || null }
        : {}),
    })
    .eq("id", user.id);
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204") {
      return { error: "Profile settings are being set up. Please try again later." };
    }
    return { error: "Profile could not be updated. Please try again." };
  }
  revalidatePath("/account");
  revalidatePath("/account/profile");
  revalidatePath("/checkout");
  return { success: "Your profile settings have been saved." };
}

export async function requestProfileEmailChangeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireCustomer("/account/profile");
  const parsed = emailSchema.safeParse({ email: text(formData, "email") });
  if (!parsed.success) return { error: "Enter a valid email address." };
  if (parsed.data.email === user.email?.toLowerCase()) {
    return { error: "Enter an email address different from your current one." };
  }

  try {
    const { error } = await supabase.auth.updateUser(
      { email: parsed.data.email },
      { emailRedirectTo: `${getAppBaseUrl()}/auth/callback?next=/account/profile` },
    );
    if (error) return { error: "We could not start the email change. Check the address and try again." };
  } catch {
    return { error: "We could not start the email change. Check the address and try again." };
  }
  revalidatePath("/account/profile");
  return { success: "Check your new email address and follow its confirmation link to finish the change." };
}

export async function requestProfilePasswordResetAction(
  _state: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _state;
  void _formData;
  const { supabase, user } = await requireCustomer("/account/profile");
  if (!user.email) return { error: "Add a verified email address before resetting your password." };

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${getAppBaseUrl()}/auth/callback?next=/reset-password`,
    });
    if (error) return { error: "We could not send a reset link. Please try again later." };
  } catch {
    return { error: "We could not send a reset link. Please try again later." };
  }
  return { success: "If password reset is available, a secure link will arrive in your email." };
}

export async function resendVerificationAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse({ email: text(formData, "email") });
  if (!parsed.success) return { error: "Enter a valid email address." };
  try {
    const supabase = await createClient();
    await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: { emailRedirectTo: `${getAppBaseUrl()}/auth/callback?next=/account` },
    });
  } catch {
    // Return a generic response whether or not the account exists.
  }
  return { success: "If verification can be resent, a new link will arrive by email." };
}
