"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IceCreamCone } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { T } from "@/components/language-provider";
import {
  beginPurchase,
  consumePendingPurchase,
  loginHref,
  type PurchaseMode,
} from "@/lib/pending-purchase";
import { formatPhp } from "@/lib/money";
import type { Product } from "@/types/database";

function publicImageUrl(path: string | null) {
  if (!path || !path.startsWith("products/")) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base
    ? `${base}/storage/v1/object/public/menu/${path.split("/").map(encodeURIComponent).join("/")}`
    : null;
}

export function ProductCard({
  product,
  hasOptions = false,
  basePath = "/menu",
}: {
  product: Product;
  hasOptions?: boolean;
  basePath?: string;
}) {
  const { add, isAuthenticated } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const imageUrl = publicImageUrl(product.image_path);
  const productHref = `${basePath}/${product.slug}`;

  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = consumePendingPurchase(product.id, window.location.pathname);
    if (!pending) return;
    add(pending.line, pending.quantity);
    router.replace(pending.mode === "buy-now" ? "/checkout" : "/cart");
  }, [add, isAuthenticated, product.id, router]);

  function purchase(mode: PurchaseMode) {
    const line = {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unitPriceCents: product.price_cents,
      variantId: null,
      variantName: null,
      addons: [],
    };
    if (
      !beginPurchase({
        isAuthenticated,
        returnPath: productHref,
        productId: product.id,
        line,
        quantity: 1,
        mode,
      })
    ) {
      return;
    }
    add(line);
    if (mode === "buy-now") router.push("/checkout");
    else setAdded(true);
  }

  return (
    <article className="product-card">
      <Link
        className="product-image"
        href={productHref}
        aria-label={`View ${product.name}`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 680px) 90vw, (max-width: 1000px) 45vw, 30vw"
            unoptimized
          />
        ) : (
          <span className="image-placeholder">
            <IceCreamCone size={34} strokeWidth={1.5} aria-hidden="true" />
            <span>
              <T en="Photo coming soon" fil="Larawan sa susunod" />
            </span>
          </span>
        )}
        {product.is_available ? (
          <span className="availability-badge">
            <T en="Available" fil="Available" />
          </span>
        ) : (
          <span className="availability-badge unavailable">
            <T en="Unavailable" fil="Hindi available" />
          </span>
        )}
      </Link>
      <div className="product-card-content">
        <div className="product-title-row">
          <h3>
            <Link href={productHref}>{product.name}</Link>
          </h3>
          <span className="product-price">
            {formatPhp(product.price_cents)}
          </span>
        </div>
        <p>
          {product.description || (
            <T
              en="Details will be added by the shop."
              fil="Idadagdag pa ng tindahan ang detalye."
            />
          )}
        </p>
        <div className="product-card-actions">
          <Link className="text-link" href={productHref}>
            <T en="Details" fil="Detalye" />
          </Link>
          {product.is_available && !hasOptions && (
            <>
              <button
                className="button button-small button-outline"
                type="button"
                onClick={() => purchase("add")}
              >
                {added ? (
                  <T en="Added" fil="Naidagdag" />
                ) : (
                  <T en="Add" fil="Idagdag" />
                )}
              </button>
              <button
                className="button button-small"
                type="button"
                onClick={() => purchase("buy-now")}
              >
                <T en="Buy now" fil="Bumili ngayon" />
              </button>
            </>
          )}
          {hasOptions && (
            <>
              <Link
                className="button button-small button-outline"
                href={productHref}
              >
                <T en="Choose options" fil="Pumili ng opsyon" />
              </Link>
              {product.is_available && (
                <Link
                  className="button button-small"
                  href={isAuthenticated ? productHref : loginHref(productHref)}
                >
                  <T en="Buy now" fil="Bumili ngayon" />
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
