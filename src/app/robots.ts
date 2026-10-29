import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const origin = getAppBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/account/",
        "/checkout",
        "/cart",
        "/order/",
        "/login",
        "/register",
        "/reset-password",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
