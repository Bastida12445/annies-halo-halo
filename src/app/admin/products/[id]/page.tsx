import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AdminActionForm } from "@/components/admin-action-form";
import { AddonAssignmentToggle } from "@/components/addon-assignment-toggle";
import { AdminProductForm } from "@/components/admin-product-form";
import { AdminShell } from "@/components/admin-shell";
import {
  assignAddonAction,
  saveAddonAction,
  saveVariantAction,
} from "@/app/actions/shop";
import { requireStaff } from "@/lib/auth";
import { formatPhp } from "@/lib/money";

export const metadata: Metadata = { title: "Edit menu product" };

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const { supabase, roles } = await requireStaff(["administrator", "menu_manager"]);
  const [
    { data: product },
    { data: categories },
    { data: variants },
    { data: addons },
    { data: assignments },
  ] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("name"),
    supabase.from("product_addons").select("*").order("name"),
    supabase
      .from("product_addon_assignments")
      .select("addon_id")
      .eq("product_id", id),
  ]);
  if (!product) notFound();
  const attached = new Set((assignments ?? []).map((item) => item.addon_id));
  return (
    <AdminShell hideHeading title={`Edit ${product.name}`} roles={roles}>
      <div className="admin-catalog-page">
        <nav aria-label="Breadcrumb" className="admin-breadcrumb"><Link href="/admin">Overview</Link><ChevronRight aria-hidden="true" size={14} /><Link href="/admin/products">Menu &amp; products</Link><ChevronRight aria-hidden="true" size={14} /><span>Edit product</span></nav>
        <AdminProductForm categories={categories ?? []} product={product} imageUrl={product.image_path ? supabase.storage.from("menu").getPublicUrl(product.image_path).data.publicUrl : null} />
      </div>
      <div className="content-card">
        <h2>Size and serving options</h2>
        {variants?.length ? (
          <div className="category-list">
            {variants.map((variant) => (
              <details key={variant.id}>
                <summary>
                  {variant.name} · {formatPhp(variant.price_adjustment_cents)}{" "}
                  adjustment · {variant.is_active ? "active" : "hidden"}
                </summary>
                <AdminActionForm
                  action={saveVariantAction}
                  submitLabel="Save option"
                  className="form-grid"
                >
                  <input type="hidden" name="id" value={variant.id} />
                  <input type="hidden" name="product_id" value={product.id} />
                  <label className="field-label">
                    Option name
                    <input
                      name="name"
                      defaultValue={variant.name}
                      required
                      maxLength={100}
                    />
                  </label>
                  <label className="field-label">
                    Price adjustment in centavos
                    <input
                      name="price_adjustment_cents"
                      type="number"
                      required
                      min={-10000000}
                      max={10000000}
                      step={1}
                      defaultValue={variant.price_adjustment_cents}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={variant.is_active}
                    />{" "}
                    Active on menu
                  </label>
                </AdminActionForm>
              </details>
            ))}
          </div>
        ) : (
          <p>No variants yet.</p>
        )}
        <h3>Add an option</h3>
        <AdminActionForm
          action={saveVariantAction}
          submitLabel="Add option"
          className="form-grid"
        >
          <input type="hidden" name="product_id" value={product.id} />
          <label className="field-label">
            Option name
            <input
              name="name"
              required
              maxLength={100}
              placeholder="Regular, Large"
            />
          </label>
          <label className="field-label">
            Price adjustment in centavos
            <input
              name="price_adjustment_cents"
              type="number"
              required
              min={-10000000}
              max={10000000}
              step={1}
              defaultValue="0"
            />
          </label>
          <label>
            <input type="checkbox" name="is_active" /> Active on menu
          </label>
        </AdminActionForm>
      </div>
      <div className="content-card">
        <h2>Add-ons</h2>
        {addons?.length ? (
          <div className="addon-admin-list">
            {addons.map((addon) => (
              <form action={assignAddonAction} key={addon.id}>
                <input type="hidden" name="product_id" value={product.id} />
                <input type="hidden" name="addon_id" value={addon.id} />
                <label>
                  <AddonAssignmentToggle assigned={attached.has(addon.id)} />{" "}
                  {addon.name} · {formatPhp(addon.price_cents)}{" "}
                  {addon.is_active ? "" : "(hidden globally)"}
                </label>
              </form>
            ))}
          </div>
        ) : (
          <p>No add-ons have been added.</p>
        )}
        <h3>Manage add-ons</h3>
        <div className="category-list">
          {(addons ?? []).map((addon) => (
            <details key={addon.id}>
              <summary>
                {addon.name} · {formatPhp(addon.price_cents)}
                {attached.has(addon.id) ? " · assigned to this product" : ""}
              </summary>
              <AdminActionForm
                action={saveAddonAction}
                submitLabel="Save add-on"
                className="form-grid"
              >
                <input type="hidden" name="id" value={addon.id} />
                <label className="field-label">
                  Name
                  <input
                    name="name"
                    defaultValue={addon.name}
                    required
                    maxLength={100}
                  />
                </label>
                <label className="field-label">
                  Price in centavos
                  <input
                    type="number"
                    name="price_cents"
                    defaultValue={addon.price_cents}
                    required
                    min={0}
                    max={10000000}
                    step={1}
                  />
                </label>
                <label className="field-label">
                  Description
                  <input
                    name="description"
                    defaultValue={addon.description ?? ""}
                    maxLength={500}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={addon.is_active}
                  />{" "}
                  Active on menu
                </label>
              </AdminActionForm>
            </details>
          ))}
        </div>
        <h3>Create an add-on for this product</h3>
        <AdminActionForm
          action={saveAddonAction}
          submitLabel="Add add-on"
          className="form-grid"
        >
          <input type="hidden" name="product_ids" value={product.id} />
          <label className="field-label">
            Name
            <input name="name" required maxLength={100} />
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
            Description
            <input name="description" maxLength={500} />
          </label>
          <label>
            <input type="checkbox" name="is_active" /> Active on menu
          </label>
        </AdminActionForm>
      </div>
    </AdminShell>
  );
}
