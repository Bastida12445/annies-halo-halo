import { requireStaff } from "@/lib/auth";
import {
  defaultBusinessSettings,
  parseBusinessSettings,
  type BusinessSettings,
} from "@/lib/business";

const ADMIN_SETTINGS_CACHE_TTL_MS = 5_000;
let settingsCache: { settings: BusinessSettings; expiresAt: number } | null = null;
let settingsRequest: Promise<{ settings: BusinessSettings; error: boolean }> | null = null;
let settingsVersion = 0;

export function clearAdminBusinessSettingsCache() {
  settingsVersion += 1;
  settingsCache = null;
  settingsRequest = null;
}

async function readAdminBusinessSettings(
  supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"],
) {
  if (settingsCache && settingsCache.expiresAt > Date.now()) {
    return { settings: settingsCache.settings, error: false };
  }
  if (settingsRequest) return settingsRequest;

  const version = settingsVersion;
  const request = (async () => {
    const { data, error } = await supabase
      .from("business_settings")
      .select("config")
      .eq("id", true)
      .maybeSingle();
    return {
      settings: error ? defaultBusinessSettings : parseBusinessSettings(data?.config),
      error: Boolean(error),
    };
  })();
  const sharedRequest = request.then((result) => {
    if (version === settingsVersion && !result.error) {
      settingsCache = {
        settings: result.settings,
        expiresAt: Date.now() + ADMIN_SETTINGS_CACHE_TTL_MS,
      };
    }
    return result;
  }).finally(() => {
    if (version === settingsVersion) settingsRequest = null;
  });
  settingsRequest = sharedRequest;
  return sharedRequest;
}

export async function loadAdminBusinessSettings() {
  const { supabase, roles } = await requireStaff(["administrator"]);
  const result = await readAdminBusinessSettings(supabase);

  return {
    roles,
    settings: result.settings,
    error: result.error,
  };
}
