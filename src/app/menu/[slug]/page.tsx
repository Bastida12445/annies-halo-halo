import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { T } from "@/components/language-provider";
import { createOptionalClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/config";

export async function generateMetadata({
  params,
}: PageProps<"/menu/[slug]">): Promise<Metadata> {
  if (!getSupabaseConfig()) return { title: "Menu item" };
  const { slug } = await params;
  const supabase = await createOptionalClient();
  const { data } = await supabase!
    .from("products")
    .select("name,description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return {
    title: data?.name ?? "Menu item",
    description: data?.description ?? undefined,
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/menu/[slug]">) {
  const { slug } = await params;
  const supabase = await createOptionalClient();
  if (!supabase)
    return (
      <section className="section container">
        <div className="form-shell">
          <h1>
            <T en="Menu setup is in progress" fil="Inaayos pa ang menu" />
          </h1>
          <p className="muted">
            <T
              en="Supabase is not configured yet."
              fil="Hindi pa naka-configure ang Supabase."
            />
          </p>
        </div>
      </section>
    );
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!product) notFound();
  const [{ data: variants }, { data: assignments }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id,name,price_adjustment_cents")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("product_addon_assignments")
      .select("addon_id")
      .eq("product_id", product.id),
  ]);
  const addonIds = (assignments ?? []).map((item) => item.addon_id);
  const { data: addons } = addonIds.length
    ? await supabase
        .from("product_addons")
        .select("id,name,description,price_cents")
        .in("id", addonIds)
        .eq("is_active", true)
        .order("name")
    : { data: [] };
  return (
    <ProductDetail
      product={product}
      variants={variants ?? []}
      addons={addons ?? []}
    />
  );
}
