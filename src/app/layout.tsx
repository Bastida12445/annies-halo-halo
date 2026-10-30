import type { Metadata, Viewport } from "next";
import { CartProvider } from "@/components/cart-provider";
import { LanguageProvider } from "@/components/language-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBusinessSettings } from "@/lib/business";
import { getCurrentUserForNavigation } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
  title: {
    default: "Annie’s Halo Halo | Loreto, Agusan del Sur",
    template: "%s | Annie’s Halo Halo",
  },
  description:
    "Browse the menu and find Annie’s Halo Halo in Loreto, Agusan del Sur.",
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: "Annie’s Halo Halo",
    title: "Annie’s Halo Halo",
    description:
      "Browse the menu and find Annie’s Halo Halo in Loreto, Agusan del Sur.",
  },
};

export const viewport: Viewport = {
  themeColor: "#6d3e91",
  colorScheme: "light",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, settings] = await Promise.all([
    getCurrentUserForNavigation(),
    getBusinessSettings(),
  ]);

  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <CartProvider isAuthenticated={Boolean(user)}>
            <SiteHeader
              user={user}
              businessName={settings.business_name}
            />
            <main id="main-content">{children}</main>
            <SiteFooter settings={settings} />
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
