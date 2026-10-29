import type { Json } from "@/types/database";

export function getSnapshotOptions(value: Json): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const snapshot = value as Record<string, Json | undefined>;
  const values: string[] = [];
  if (typeof snapshot.variant_name === "string" && snapshot.variant_name) values.push(snapshot.variant_name);
  if (Array.isArray(snapshot.addons)) {
    for (const addon of snapshot.addons) {
      if (addon && typeof addon === "object" && !Array.isArray(addon) && typeof addon.name === "string") values.push(`+ ${addon.name}`);
    }
  }
  return values;
}
