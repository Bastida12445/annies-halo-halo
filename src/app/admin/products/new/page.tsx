import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { AdminProductForm } from "@/components/admin-product-form";
import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Add a menu product" };

export default async function NewProductPage() {
  const { supabase, roles } = await requireStaff(["administrator", "menu_manager"]);
  const { data: categories, error } = await supabase.from("categories").select("*").order("sort_order").order("name");
  return (
    <AdminShell hideHeading title="Add product" roles={roles}>
      <div className="admin-catalog-page">
        <nav aria-label="Breadcrumb" className="admin-breadcrumb"><Link href="/admin">Overview</Link><ChevronRight aria-hidden="true" size={14} /><Link href="/admin/products">Menu &amp; products</Link><ChevronRight aria-hidden="true" size={14} /><span>Add product</span></nav>
        {error && <p className="admin-inline-notice is-error" role="alert">Category options could not be loaded. You can still save this item without a category.</p>}
        <AdminProductForm categories={categories ?? []} />
      </div>
    </AdminShell>
  );
}
