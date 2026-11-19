import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ChevronDown, ChevronRight, FolderOpen, Plus, Tag, Tags } from "lucide-react";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/shop";
import { AdminActionForm } from "@/components/admin-action-form";
import { AdminDeleteAction } from "@/components/admin-delete-action";
import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Menu categories" };

export default async function AdminCategoriesPage() {
  const { supabase, roles } = await requireStaff(["administrator", "menu_manager"]);
  const [categoryResult, productsResult] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.from("products").select("id,category_id"),
  ]);
  const categories = categoryResult.data ?? [];
  const counts = new Map<string, number>();
  for (const product of productsResult.data ?? []) {
    if (product.category_id) counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
  }

  return (
    <AdminShell hideHeading title="Categories" roles={roles}>
      <div className="admin-catalog-page">
        <nav aria-label="Breadcrumb" className="admin-breadcrumb"><Link href="/admin">Overview</Link><ChevronRight aria-hidden="true" size={14} /><Link href="/admin/products">Menu &amp; products</Link><ChevronRight aria-hidden="true" size={14} /><span>Categories</span></nav>
        <header className="admin-catalog-header admin-category-page-header">
          <div className="admin-catalog-title-wrap"><span className="admin-page-icon"><Tags aria-hidden="true" size={24} /></span><div><span className="admin-section-eyebrow">Menu organization</span><h1>Categories</h1><p>Group products into simple, easy-to-browse sections.</p></div></div>
          <div className="admin-catalog-header-actions"><Link className="admin-secondary-action" href="/admin/products"><ArrowLeft aria-hidden="true" size={17} />Products</Link><Link className="admin-primary-action" href="/admin/products/categories/new"><Plus aria-hidden="true" size={17} />Add category</Link></div>
        </header>
        {categoryResult.error && <p className="admin-inline-notice is-error" role="alert">Categories could not be loaded. Check the Supabase connection and menu access policy.</p>}
        {productsResult.error && <p className="admin-inline-notice is-error" role="status">Product counts are temporarily unavailable.</p>}
        {categories.length ? (
          <section className="admin-category-list" aria-label="Product categories">
            {categories.map((category) => (
              <details className="admin-category-card" key={category.id}>
                <summary>
                  <span className="admin-category-symbol"><Tag aria-hidden="true" size={19} /></span>
                  <span className="admin-category-summary-copy"><strong>{category.name}</strong><small>{category.description || "No description added"}</small></span>
                  <span className={`admin-category-status ${category.is_active ? "is-active" : "is-inactive"}`}><i />{category.is_active ? "Active" : "Inactive"}</span>
                  <span className="admin-category-count">{productsResult.error ? "—" : counts.get(category.id) ?? 0}<small>products</small></span>
                  <ChevronDown aria-hidden="true" className="admin-category-chevron" size={18} />
                </summary>
                <div className="admin-category-expanded">
                  <div className="admin-category-products-note"><FolderOpen aria-hidden="true" size={16} /><span>{productsResult.error ? "Associated products could not be counted." : `${counts.get(category.id) ?? 0} associated ${(counts.get(category.id) ?? 0) === 1 ? "product" : "products"}`}</span></div>
                  <div className="admin-category-edit-layout">
                    <AdminActionForm action={saveCategoryAction} submitLabel="Save category" buttonClassName="admin-primary-action" className="admin-category-edit-form">
                      <input name="id" type="hidden" value={category.id} />
                      <label className="field-label">Name<input defaultValue={category.name} maxLength={100} minLength={2} name="name" required /></label>
                      <label className="field-label">Slug<input defaultValue={category.slug} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
                      <label className="field-label">Sort order<input defaultValue={category.sort_order} max={10000} min={0} name="sort_order" type="number" /></label>
                      <label className="field-label">Description<input defaultValue={category.description ?? ""} maxLength={500} name="description" /></label>
                      <label className="admin-category-checkbox"><input defaultChecked={category.is_active} name="is_active" type="checkbox" /><span><strong>Active on public menu</strong><small>Display the category to customers.</small></span></label>
                    </AdminActionForm>
                    <div className="admin-category-row-actions"><AdminDeleteAction action={deleteCategoryAction} fieldName="category_id" id={category.id} itemName={category.name} /></div>
                  </div>
                </div>
              </details>
            ))}
          </section>
        ) : !categoryResult.error ? (
          <section className="admin-inventory-empty"><Tag aria-hidden="true" size={32} /><strong>No categories yet</strong><span>Create a category, then assign products to it in the catalog.</span><Link className="admin-primary-action" href="/admin/products/categories/new"><Plus aria-hidden="true" size={16} />Add category</Link></section>
        ) : null}
      </div>
    </AdminShell>
  );
}
