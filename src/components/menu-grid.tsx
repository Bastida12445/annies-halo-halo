"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { T } from "@/components/language-provider";
import type { Category, Product } from "@/types/database";

export function MenuGrid({
  products,
  categories,
  productsWithOptions,
  basePath = "/menu",
}: {
  products: Product[];
  categories: Category[];
  productsWithOptions: string[];
  basePath?: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("featured");

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return products
      .filter(
        (product) =>
          !normalizedSearch ||
          `${product.name} ${product.description ?? ""}`
            .toLocaleLowerCase()
            .includes(normalizedSearch),
      )
      .filter(
        (product) => category === "all" || product.category_id === category,
      )
      .filter(
        (product) =>
          availability === "all" ||
          (availability === "available"
            ? product.is_available
            : !product.is_available),
      )
      .sort((a, b) => {
        if (sort === "price-low") return a.price_cents - b.price_cents;
        if (sort === "price-high") return b.price_cents - a.price_cents;
        if (sort === "name") return a.name.localeCompare(b.name);
        return (
          Number(b.is_featured) - Number(a.is_featured) ||
          a.name.localeCompare(b.name)
        );
      });
  }, [availability, category, products, search, sort]);

  return (
    <>
      <div className="menu-toolbar" aria-label="Menu filters">
        <label className="search-control">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">
            <T en="Search menu" fil="Maghanap sa menu" />
          </span>
          <input
            type="search"
            placeholder="Search the menu"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="filter-control">
          <span>
            <T en="Category" fil="Kategorya" />
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">
              <T en="All categories" fil="Lahat ng kategorya" />
            </option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          <span>
            <T en="Availability" fil="Availability" />
          </span>
          <select
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
          >
            <option value="all">
              <T en="Show all" fil="Ipakita lahat" />
            </option>
            <option value="available">
              <T en="Available" fil="Available" />
            </option>
            <option value="unavailable">
              <T en="Unavailable" fil="Hindi available" />
            </option>
          </select>
        </label>
        <label className="filter-control">
          <span>
            <T en="Sort" fil="Ayusin" />
          </span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="featured">
              <T en="Featured" fil="Tampok" />
            </option>
            <option value="name">
              <T en="Name" fil="Pangalan" />
            </option>
            <option value="price-low">
              <T en="Price: low to high" fil="Presyo: mababa muna" />
            </option>
            <option value="price-high">
              <T en="Price: high to low" fil="Presyo: mataas muna" />
            </option>
          </select>
        </label>
      </div>
      {filtered.length ? (
        <div className="product-grid">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              hasOptions={productsWithOptions.includes(product.id)}
              basePath={basePath}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="eyebrow">
            <T en="No matches" fil="Walang tugma" />
          </span>
          <h2>
            <T en="Try another search" fil="Subukan ang ibang paghahanap" />
          </h2>
          <p>
            <T
              en="There are no products matching those filters."
              fil="Walang produktong tumutugma sa mga filter na ito."
            />
          </p>
        </div>
      )}
    </>
  );
}
