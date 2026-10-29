import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getAppBaseUrl();
  const routes = [
    "",
    "/menu",
    "/about",
    "/contact",
    "/ordering-guide",
    "/reservations",
    "/privacy",
    "/terms",
    "/refund-policy",
    "/reservation-policy",
  ];
  return routes.map((route) => ({
    url: new URL(route, origin).toString(),
    changeFrequency: route === "/menu" ? "daily" : "monthly",
    priority: route === "" ? 1 : route === "/menu" ? 0.9 : 0.6,
  }));
}
