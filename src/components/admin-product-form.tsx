import Link from "next/link";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { saveProductAction } from "@/app/actions/shop";
import { AdminActionForm } from "@/components/admin-action-form";
import { ProductImageUpload } from "@/components/product-image-upload";
import { formatPhp } from "@/lib/money";
import type { Category, Product } from "@/types/database";

export function AdminProductForm({
  categories,
  product,
  imageUrl,
}: {
  categories: Category[];
  product?: Product;
  imageUrl?: string | null;
}) {
  const editing = Boolean(product);
  return (
    <section className="admin-product-editor-card">
      <div className="admin-editor-heading">
        <span className="admin-editor-icon"><ImagePlus aria-hidden="true" size={22} /></span>
        <div><h2>{editing ? "Product details" : "Add a product"}</h2><p>{editing ? "Keep your menu item, price, and availability up to date." : "Fill in the details to add a new menu item."}</p></div>
      </div>
      <AdminActionForm action={saveProductAction} submitLabel="Save product" buttonClassName="admin-primary-action" className="admin-product-form">
        {product && <input name="id" type="hidden" value={product.id} />}
        <input name="image_path" type="hidden" value={product?.image_path ?? ""} />
        <div className="admin-product-field-grid">
          <label className="field-label">
            Product name
            <input name="name" defaultValue={product?.name ?? ""} required minLength={2} maxLength={120} placeholder="e.g. Halo-Halo Classic" />
          </label>
          <label className="field-label">
            Price in centavos
            <span className="admin-price-input-wrap"><span aria-hidden="true">₱</span><input name="price_cents" type="number" defaultValue={product?.price_cents ?? ""} required min={0} max={10000000} step={1} placeholder="e.g. 9500" /></span>
            <small>{product ? `Current price: ${formatPhp(product.price_cents)}` : "₱95.00 is entered as 9500 centavos."}</small>
          </label>
          <label className="field-label">
            URL slug
            <input name="slug" defaultValue={product?.slug ?? ""} required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="classic-halo-halo" />
          </label>
          <label className="field-label">
            Menu sort order
            <input name="sort_order" type="number" defaultValue={product?.sort_order ?? 0} min={0} max={10000} step={1} />
          </label>
          <label className="field-label">
            Category
            <select name="category_id" defaultValue={product?.category_id ?? ""}>
              <option value="">Uncategorized</option>
              {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="field-label admin-description-field">
            Description
            <textarea name="description" defaultValue={product?.description ?? ""} rows={3} maxLength={2000} placeholder="Describe what makes this treat special." />
          </label>
        </div>

        <fieldset className="admin-product-options">
          <legend>Menu settings</legend>
          <label><input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? false} /><span><strong>Show on public menu</strong><small>Customers can see this product.</small></span></label>
          <label><input type="checkbox" name="is_available" defaultChecked={product?.is_available ?? false} /><span><strong>Available to order</strong><small>Customers can add it to an order.</small></span></label>
          <label><input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} /><span><strong>Feature on homepage</strong><small>Highlight this item on the storefront.</small></span></label>
        </fieldset>

        <div className="admin-product-photo-section">
          <div className="admin-product-photo-heading"><h3>Product photo</h3><span>Optional</span></div>
          <ProductImageUpload currentImageUrl={imageUrl} />
        </div>

        <div className="admin-form-actions">
          <Link className="admin-secondary-action" href="/admin/products"><ArrowLeft aria-hidden="true" size={16} />Cancel</Link>
        </div>
      </AdminActionForm>
    </section>
  );
}
