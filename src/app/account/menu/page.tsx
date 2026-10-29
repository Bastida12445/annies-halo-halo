import type { Metadata } from "next";
import { MenuGrid } from "@/components/menu-grid";
import { T } from "@/components/language-provider";
import { getMenuData } from "@/lib/data";

export const metadata: Metadata = {
  title: "Menu",
  description: "Browse Annie’s Halo Halo menu from your customer dashboard.",
};

export default async function CustomerMenuPage() {
  const menu = await getMenuData();

  return (
    <section className="customer-account-page customer-menu-page">
      <span className="eyebrow"><T en="Annie’s Halo Halo" fil="Annie’s Halo Halo" /></span>
      <h1><T en="The menu" fil="Ang menu" /></h1>
      <p className="customer-page-intro">
        <T en="Browse the current menu, explore available options, and add a treat to your cart." fil="Tingnan ang kasalukuyang menu, piliin ang available na opsyon, at magdagdag ng paborito sa cart." />
      </p>

      {menu.failed && (
        <p className="form-notice" role="status">
          <T en="The menu could not load right now. Please try again shortly." fil="Hindi ma-load ang menu ngayon. Subukan ulit maya-maya." />
        </p>
      )}
      {!menu.configured && (
        <p className="form-notice" role="status">
          <T en="The online menu is still being set up." fil="Inaayos pa ang online menu." />
        </p>
      )}
      {menu.configured && !menu.failed && menu.products.length === 0 ? (
        <div className="empty-state customer-menu-empty">
          <h2><T en="The menu is being prepared" fil="Inihahanda pa ang menu" /></h2>
          <p><T en="There are no published products yet. Please check back soon." fil="Wala pang nailalathalang produkto. Balikan kami sa susunod." /></p>
        </div>
      ) : menu.products.length > 0 ? (
        <MenuGrid
          products={menu.products}
          categories={menu.categories}
          productsWithOptions={menu.productsWithOptions}
          basePath="/account/menu"
        />
      ) : null}
    </section>
  );
}
