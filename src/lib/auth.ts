import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/config";
import type { StaffRole } from "@/types/database";

export async function getCurrentUserForNavigation() {
  if (!getSupabaseConfig()) return null;
  const supabase = await createClient();
  // Display only. Proxy refreshes the session; protected code verifies claims separately.
  const { data, error } = await supabase.auth.getSession();
  const email = data.session?.user.email;
  return error || typeof email !== "string" ? null : { email };
}

export async function getCurrentUser() {
  if (!getSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

const getVerifiedUserContext = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || typeof claims?.sub !== "string") return null;
  return {
    supabase,
    user: {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : undefined,
      user_metadata: claims.user_metadata ?? {},
    },
  };
});

export async function requireUser(returnTo = "/account") {
  if (!getSupabaseConfig()) redirect("/setup");
  const context = await getVerifiedUserContext();
  if (!context) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return context;
}

type UserContext = Awaited<ReturnType<typeof requireUser>>;

const getRolesForUser = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  return {
    roles: error ? [] : (data ?? []).map((entry) => entry.role),
    failed: Boolean(error),
  };
});

export async function requireCustomer(returnTo = "/account") {
  const context = await requireUser(returnTo);
  const staff = await getRolesForUser(context.user.id);
  if (staff.failed) redirect("/forbidden");
  if (staff.roles.includes("administrator")) redirect("/admin");
  return context;
}

export async function hasStaffRole(roles: StaffRole[], context?: UserContext) {
  const { supabase, user } = context ?? (await requireUser("/admin"));
  const { roles: userRoles, failed } = await getRolesForUser(user.id);
  return {
    authorized: !failed && userRoles.some((role) => roles.includes(role)),
    supabase,
    user,
    roles: userRoles,
  };
}

export async function requireStaff(roles: StaffRole[] = ["administrator"]) {
  const result = await hasStaffRole(roles);
  if (!result.authorized) redirect("/forbidden");
  return { supabase: result.supabase, user: result.user, roles: result.roles };
}
