import Link from "next/link";
import type { Metadata } from "next";
import { Eye, FolderOpen, Package, Plus, ShoppingBag, Sparkles, Star, Tags } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { AdminProductTable, type AdminProductRow } from "@/components/admin-product-table";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Menu and products" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const params = await searchParams;
  const { supabase, roles } = await requireStaff(["administrator", "menu_manager"]);
  const [productResult, categoryResult] = await Promise.all([
    supabase.from("products").select("*").order("updated_at", { ascending: false }),
    supabase.from("categories").select("id,name").order("sort_order").order("name"),
  ]);
  const products = productResult.data ?? [];
  const categories = categoryResult.data ?? [];
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const rows: AdminProductRow[] = products.map((product) => ({
    ...product,
    categoryName: product.category_id ? categoryMap.get(product.category_id) ?? null : null,
    imageUrl: product.image_path
      ? supabase.storage.from("menu").getPublicUrl(product.image_path).data.publicUrl
      : null,
  }));
  const stats = [
    { label: "Total products", value: productResult.error ? "—" : products.length.toLocaleString("en-PH"), detail: "Menu items in your catalog", icon: Package, tone: "purple" },
    { label: "Active on menu", value: productResult.error ? "—" : products.filter((item) => item.is_active).length.toLocaleString("en-PH"), detail: "Visible to customers", icon: Eye, tone: "blue" },
    { label: "Available to order", value: productResult.error ? "—" : products.filter((item) => item.is_available).length.toLocaleString("en-PH"), detail: "Can be added to a cart", icon: ShoppingBag, tone: "green" },
    { label: "Featured products", value: productResult.error ? "—" : products.filter((item) => item.is_featured).length.toLocaleString("en-PH"), detail: "Highlighted on the homepage", icon: Star, tone: "pink" },
  ];

  return (
    <AdminShell hideHeading title="Menu & products" roles={roles}>
      <div className="admin-catalog-page">
        <header className="admin-catalog-header">
          <div className="admin-catalog-title-wrap">
            <span className="admin-page-icon"><FolderOpen aria-hidden="true" size={25} /></span>
            <div><span className="admin-section-eyebrow">Storefront catalog</span><h1>Menu &amp; products</h1><p>Manage your products, categories, pricing, and menu availability.</p></div>
          </div>
          <div className="admin-catalog-header-actions">
            <Link className="admin-secondary-action" href="/admin/products/categories"><Tags aria-hidden="true" size={17} />Categories</Link>
            <Link className="admin-primary-action" href="/admin/products/new"><Plus aria-hidden="true" size={17} />Add product</Link>
          </div>
        </header>

        {params.saved === "product" && <p className="admin-inline-notice is-success" role="status"><Sparkles aria-hidden="true" size={16} />Product added to your catalog.</p>}
        {productResult.error && <p className="admin-inline-notice is-error" role="alert">Products could not be loaded. Check the Supabase connection and menu access policy.</p>}
        {categoryResult.error && <p className="admin-inline-notice is-error" role="alert">Categories could not be loaded. You can still edit products without changing their category.</p>}

        <section className="admin-product-stats" aria-label="Product statistics">
          {stats.map(({ label, value, detail, icon: Icon, tone }) => (
            <article className="admin-product-stat" key={label}><span className={`admin-product-stat-icon is-${tone}`}><Icon aria-hidden="true" size={21} /></span><span className="admin-product-stat-copy"><small>{label}</small><strong>{value}</strong><span>{detail}</span></span></article>
          ))}
        </section>

        <AdminProductTable categories={categories} initialSearch={typeof params.q === "string" ? params.q : ""} products={rows} />
      </div>
    </AdminShell>
  );
}
