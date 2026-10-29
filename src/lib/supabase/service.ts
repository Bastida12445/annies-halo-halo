import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/config";
import { getPayMongoConfig } from "@/lib/paymongo-config";
import type { Database } from "@/types/database";

export function createServiceRoleClient() {
  const supabase = getSupabaseConfig();
  const paymongo = getPayMongoConfig();
  if (!supabase || !paymongo) return null;
  return createClient<Database>(supabase.url, paymongo.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
