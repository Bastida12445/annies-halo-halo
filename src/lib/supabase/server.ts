import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig, requireSupabaseConfig } from "@/lib/config";
import type { Database } from "@/types/database";

export async function createClient() {
  const { url, publishableKey } = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies. The Proxy refreshes sessions on requests.
        }
      },
    },
  });
}

export async function createOptionalClient() {
  const config = getSupabaseConfig();
  if (!config) return null;

  // Public catalog and business settings use public RLS policies. Avoid loading
  // customer auth cookies for these reads so public pages stay independent of auth.
  return createSupabaseClient<Database>(config.url, config.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
