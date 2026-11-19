import Link from "next/link";
import { ArrowLeft, Tag } from "lucide-react";
import { saveCategoryAction } from "@/app/actions/shop";
import { AdminActionForm } from "@/components/admin-action-form";
import type { Category } from "@/types/database";

export function AdminCategoryForm({ category }: { category?: Category }) {
  const editing = Boolean(category);
  return (
    <section className="admin-product-editor-card">
      <div className="admin-editor-heading">
        <span className="admin-editor-icon"><Tag aria-hidden="true" size={22} /></span>
        <div><h2>{editing ? "Category details" : "Add a category"}</h2><p>{editing ? "Update the label and how this category appears on the menu." : "Create a category to keep your menu organized."}</p></div>
      </div>
      <AdminActionForm action={saveCategoryAction} submitLabel={editing ? "Save category" : "Add category"} buttonClassName="admin-primary-action" className="admin-product-form">
        {category && <input type="hidden" name="id" value={category.id} />}
        <div className="admin-product-field-grid">
          <label className="field-label">Category name<input name="name" defaultValue={category?.name ?? ""} required minLength={2} maxLength={100} placeholder="e.g. Halo-Halo" /></label>
          <label className="field-label">URL slug<input name="slug" defaultValue={category?.slug ?? ""} required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="halo-halo" /></label>
          <label className="field-label">Sort order<input name="sort_order" type="number" defaultValue={category?.sort_order ?? 0} min={0} max={10000} /></label>
          <label className="field-label">Description<textarea name="description" defaultValue={category?.description ?? ""} rows={3} maxLength={500} placeholder="Optional category description." /></label>
        </div>
        <fieldset className="admin-product-options admin-category-options">
          <legend>Visibility</legend>
          <label><input type="checkbox" name="is_active" defaultChecked={category?.is_active ?? false} /><span><strong>Active on the public menu</strong><small>Customers can browse products in this category.</small></span></label>
        </fieldset>
        <div className="admin-form-actions"><Link className="admin-secondary-action" href="/admin/products/categories"><ArrowLeft aria-hidden="true" size={16} />Cancel</Link></div>
      </AdminActionForm>
    </section>
  );
}
