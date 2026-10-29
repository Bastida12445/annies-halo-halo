import { z } from "zod";

const urlSchema = z.string().url();

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) return null;

  const parsedUrl = urlSchema.safeParse(url);
  if (!parsedUrl.success) return null;

  return { url: parsedUrl.data, publishableKey };
}

export function requireSupabaseConfig(): SupabaseConfig {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return config;
}

export function getAppBaseUrl(): string {
  const configured = process.env.APP_BASE_URL;
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "https:" || (parsed.protocol === "http:" && parsed.hostname === "localhost")) return parsed.origin;
    } catch {
      // Fall back to the local origin so an invalid environment value does not break rendering.
    }
  }
  if (process.env.VERCEL_URL && /^[a-z0-9.-]+(?::\d+)?$/i.test(process.env.VERCEL_URL)) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
