import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { AdminCategoryForm } from "@/components/admin-category-form";
import { AdminShell } from "@/components/admin-shell";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Add a menu category" };

export default async function NewCategoryPage() {
  const { roles } = await requireStaff(["administrator", "menu_manager"]);
  return (
    <AdminShell hideHeading title="Add category" roles={roles}>
      <div className="admin-catalog-page">
        <nav aria-label="Breadcrumb" className="admin-breadcrumb"><Link href="/admin">Overview</Link><ChevronRight aria-hidden="true" size={14} /><Link href="/admin/products">Menu &amp; products</Link><ChevronRight aria-hidden="true" size={14} /><Link href="/admin/products/categories">Categories</Link><ChevronRight aria-hidden="true" size={14} /><span>Add category</span></nav>
        <AdminCategoryForm />
      </div>
    </AdminShell>
  );
}
