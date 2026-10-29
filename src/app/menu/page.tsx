import type { Metadata } from "next";
import { MenuGrid } from "@/components/menu-grid";
import { T } from "@/components/language-provider";
import { getMenuData } from "@/lib/data";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Browse the current Annie’s Halo Halo menu and availability in Loreto, Agusan del Sur.",
};

export default async function MenuPage() {
  const menu = await getMenuData();
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">
            <T en="Annie’s Halo Halo" fil="Annie’s Halo Halo" />
          </span>
          <h1>
            <T en="The menu" fil="Ang menu" />
          </h1>
          <p>
            <T
              en="Browse current items and availability. Prices shown are estimates until checked again at checkout."
              fil="Tingnan ang mga produkto at availability. Muling susuriin ang presyo sa checkout."
            />
          </p>
        </div>
      </section>
      <section className="section container">
        {menu.failed && (
          <div className="form-notice" role="status">
            <T
              en="The menu could not load right now. Please try again shortly."
              fil="Hindi ma-load ang menu sa ngayon. Subukan ulit maya-maya."
            />
          </div>
        )}
        {!menu.configured && (
          <div className="form-notice" role="status">
            <T
              en="The online menu is being set up. Supabase connection details are not configured yet."
              fil="Inaayos pa ang online menu. Hindi pa naka-configure ang koneksyon sa Supabase."
            />
          </div>
        )}
        {menu.configured && !menu.failed && menu.products.length === 0 ? (
          <div className="empty-state">
            <span className="eyebrow">
              <T en="No products listed" fil="Wala pang nakalistang produkto" />
            </span>
            <h2>
              <T en="The menu is being prepared" fil="Inihahanda pa ang menu" />
            </h2>
            <p>
              <T
                en="The shop has not published any products yet. Check back for the current menu."
                fil="Wala pang inilalathalang produkto ang tindahan. Balikan para sa kasalukuyang menu."
              />
            </p>
          </div>
        ) : menu.products.length > 0 ? (
          <MenuGrid
            products={menu.products}
            categories={menu.categories}
            productsWithOptions={menu.productsWithOptions}
          />
        ) : null}
      </section>
    </>
  );
}
