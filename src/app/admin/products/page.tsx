import Link from "next/link";
import type { Metadata } from "next";
import { AdminActionForm } from "@/components/admin-action-form";
import { AdminShell } from "@/components/admin-shell";
import { saveCategoryAction, saveProductAction } from "@/app/actions/shop";
import { requireStaff } from "@/lib/auth";
import { formatPhp } from "@/lib/money";

export const metadata: Metadata = { title: "Menu and products" };

export default async function AdminProductsPage() {
  const { supabase, roles } = await requireStaff(["administrator", "menu_manager"]);
  const [{ data: products, error }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("categories").select("*").order("sort_order").order("name"),
  ]);
  return (
    <AdminShell title="Menu & products" roles={roles}>
      <div className="content-card">
        <h2>Add a product</h2>
        <AdminActionForm
          action={saveProductAction}
          submitLabel="Add product"
          className="form-stack"
        >
          <label className="field-label">
            Product name
            <input name="name" required minLength={2} maxLength={120} />
          </label>
          <label className="field-label">
            URL slug
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="classic-halo-halo"
            />
          </label>
          <label className="field-label">
            Category
            <select name="category_id">
              <option value="">Uncategorized</option>
              {(categories ?? []).map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Description
            <textarea name="description" rows={3} maxLength={2000} />
          </label>
          <label className="field-label">
            Price in centavos
            <input
              type="number"
              name="price_cents"
              required
              min={0}
              max={10000000}
              step={1}
            />
          </label>
          <label className="field-label">
            Menu sort order
            <input
              type="number"
              name="sort_order"
              defaultValue="0"
              min={0}
              max={10000}
              step={1}
            />
          </label>
          <label className="field-label">
            Product photo
            <input
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp,image/avif"
            />
            <small>JPEG, PNG, WebP, or AVIF. Up to 5 MB.</small>
          </label>
          <div className="check-row">
            <label>
              <input type="checkbox" name="is_active" /> Show on public menu
            </label>
            <label>
              <input type="checkbox" name="is_available" /> Available to order
            </label>
            <label>
              <input type="checkbox" name="is_featured" /> Feature on homepage
            </label>
          </div>
        </AdminActionForm>
      </div>
      <div className="content-card">
        <h2>Products</h2>
        {error && <p className="form-error">Products could not be loaded.</p>}
        {products?.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Menu</th>
                  <th>Availability</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      {product.name}
                      <small className="table-subline">/{product.slug}</small>
                    </td>
                    <td>
                      {categories?.find(
                        (category) => category.id === product.category_id,
                      )?.name ?? "—"}
                    </td>
                    <td>{formatPhp(product.price_cents)}</td>
                    <td>{product.is_active ? "Visible" : "Hidden"}</td>
                    <td>
                      {product.is_available ? "Available" : "Unavailable"}
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={`/admin/products/${product.id}`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !error ? (
          <p>No menu products have been added.</p>
        ) : null}
      </div>
      <div className="content-card">
        <h2>Categories</h2>
        <div className="category-list">
          {(categories ?? []).map((category) => (
            <details key={category.id}>
              <summary>
                {category.name} {category.is_active ? "· active" : "· hidden"}
              </summary>
              <AdminActionForm
                action={saveCategoryAction}
                submitLabel="Save category"
                className="form-stack"
              >
                <input type="hidden" name="id" value={category.id} />
                <label className="field-label">
                  Name
                  <input name="name" defaultValue={category.name} required />
                </label>
                <label className="field-label">
                  Slug
                  <input
                    name="slug"
                    defaultValue={category.slug}
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  />
                </label>
                <label className="field-label">
                  Description
                  <input
                    name="description"
                    defaultValue={category.description ?? ""}
                    maxLength={500}
                  />
                </label>
                <label className="field-label">
                  Sort order
                  <input
                    type="number"
                    name="sort_order"
                    defaultValue={category.sort_order}
                    min={0}
                    max={10000}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={category.is_active}
                  />{" "}
                  Active
                </label>
              </AdminActionForm>
            </details>
          ))}
        </div>
        <h3>Add category</h3>
        <AdminActionForm
          action={saveCategoryAction}
          submitLabel="Add category"
          className="form-grid"
        >
          <label className="field-label">
            Name
            <input name="name" required minLength={2} maxLength={100} />
          </label>
          <label className="field-label">
            Slug
            <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          </label>
          <label className="field-label">
            Sort order
            <input
              type="number"
              name="sort_order"
              defaultValue="0"
              min="0"
              max="10000"
            />
          </label>
          <label className="field-label">
            Description
            <input name="description" maxLength={500} />
          </label>
          <label>
            <input type="checkbox" name="is_active" /> Active
          </label>
        </AdminActionForm>
      </div>
    </AdminShell>
  );
}
