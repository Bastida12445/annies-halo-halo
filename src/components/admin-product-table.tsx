"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Image as ImageIcon, Search, SlidersHorizontal, Star } from "lucide-react";
import { deleteProductAction } from "@/app/actions/shop";
import { AdminDeleteAction } from "@/components/admin-delete-action";
import { formatPhp } from "@/lib/money";
import type { Product } from "@/types/database";

export type AdminProductRow = Product & {
  categoryName: string | null;
  imageUrl: string | null;
};

const pageSize = 8;

export function AdminProductTable({ products, categories, initialSearch = "" }: {
  products: AdminProductRow[];
  categories: { id: string; name: string }[];
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(0);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return products
      .filter((product) => !query || `${product.name} ${product.slug} ${product.categoryName ?? ""}`.toLocaleLowerCase().includes(query))
      .filter((product) => category === "all" || product.category_id === category)
      .filter((product) => availability === "all" || (availability === "available" ? product.is_available : !product.is_available))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name, "en");
        if (sort === "price-low") return a.price_cents - b.price_cents || a.name.localeCompare(b.name, "en");
        if (sort === "price-high") return b.price_cents - a.price_cents || a.name.localeCompare(b.name, "en");
        return b.updated_at.localeCompare(a.updated_at);
      });
  }, [availability, category, products, search, sort]);

  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const shown = visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const first = visible.length ? currentPage * pageSize + 1 : 0;
  const last = Math.min((currentPage + 1) * pageSize, visible.length);

  return (
    <section className="admin-inventory-card" aria-labelledby="products-title">
      <div className="admin-inventory-heading">
        <div><span className="admin-section-eyebrow">Menu catalog</span><h2 id="products-title">Products <span>{products.length}</span></h2></div>
        <label className="admin-sort-select"><span>Sort</span><select aria-label="Sort products" onChange={(event) => setSort(event.target.value)} value={sort}><option value="updated">Recently updated</option><option value="name">Name A–Z</option><option value="price-low">Price low to high</option><option value="price-high">Price high to low</option></select></label>
      </div>
      <div className="admin-product-filters">
        <label className="admin-search-field"><Search aria-hidden="true" size={18} /><span className="sr-only">Search products</span><input onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search products or categories..." value={search} /></label>
        <label className="admin-filter-select"><SlidersHorizontal aria-hidden="true" size={16} /><span className="sr-only">Filter by category</span><select onChange={(event) => { setCategory(event.target.value); setPage(0); }} value={category}><option value="all">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="admin-filter-select"><span className="sr-only">Filter by availability</span><select onChange={(event) => { setAvailability(event.target.value); setPage(0); }} value={availability}><option value="all">All availability</option><option value="available">Available</option><option value="unavailable">Unavailable</option></select></label>
      </div>

      {products.length === 0 ? (
        <div className="admin-inventory-empty"><ImageIcon aria-hidden="true" size={32} /><strong>No products yet</strong><span>Add your first menu item to start building the catalog.</span><Link className="admin-primary-action" href="/admin/products/new">Add product</Link></div>
      ) : visible.length === 0 ? (
        <div className="admin-inventory-empty"><Search aria-hidden="true" size={29} /><strong>No matching products</strong><span>Change the search or filters to see more items.</span><button className="admin-secondary-action" onClick={() => { setSearch(""); setCategory("all"); setAvailability("all"); setPage(0); }} type="button">Clear filters</button></div>
      ) : (
        <>
          <div className="admin-products-table-wrap">
            <table className="admin-products-table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Menu visibility</th><th>Availability</th><th>Actions</th></tr></thead>
              <tbody>{shown.map((product) => (
                <tr key={product.id}>
                  <td data-label="Product"><div className="admin-product-cell"><span className="admin-product-thumbnail">{product.imageUrl ? <Image alt="" fill sizes="52px" src={product.imageUrl} unoptimized /> : <ImageIcon aria-hidden="true" size={20} />}</span><span className="admin-product-cell-copy"><strong>{product.name}</strong><small>/{product.slug}</small>{product.is_featured && <em><Star aria-hidden="true" size={12} fill="currentColor" /> Featured</em>}</span></div></td>
                  <td data-label="Category">{product.categoryName ?? <span className="admin-muted">Uncategorized</span>}</td>
                  <td data-label="Price"><strong className="admin-product-price">{formatPhp(product.price_cents)}</strong></td>
                  <td data-label="Menu"><span className={`admin-state-pill ${product.is_active ? "is-visible" : "is-hidden"}`}><i />{product.is_active ? "Visible" : "Hidden"}</span></td>
                  <td data-label="Availability"><span className={`admin-state-pill ${product.is_available ? "is-available" : "is-unavailable"}`}><i />{product.is_available ? "Available" : "Unavailable"}</span></td>
                  <td data-label="Actions"><div className="admin-product-actions"><Link className="admin-icon-action" href={`/admin/products/${product.id}`} aria-label={`Edit ${product.name}`}>Edit</Link><AdminDeleteAction action={deleteProductAction} fieldName="product_id" id={product.id} itemName={product.name} /></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <footer className="admin-table-pagination"><span>Showing <strong>{first}–{last}</strong> of <strong>{visible.length}</strong> products</span><div><button aria-label="Previous page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} type="button"><ChevronLeft aria-hidden="true" size={17} /></button><span>Page {currentPage + 1} of {pages}</span><button aria-label="Next page" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} type="button"><ChevronRight aria-hidden="true" size={17} /></button></div></footer>
        </>
      )}
    </section>
  );
}
