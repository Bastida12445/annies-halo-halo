"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { T } from "@/components/language-provider";
import { formatPhp } from "@/lib/money";

export function CartView() {
  const cart = useCart();
  if (cart.lines.length === 0)
    return (
      <div className="empty-state">
        <span className="eyebrow">
          <T en="Your cart" fil="Iyong cart" />
        </span>
        <h2>
          <T en="Your cart is empty" fil="Walang laman ang cart" />
        </h2>
        <p>
          <T
            en="Browse the menu and add items to get started."
            fil="Tingnan ang menu at magdagdag ng produkto para magsimula."
          />
        </p>
        <div className="button-row" style={{ justifyContent: "center" }}>
          <Link className="button" href="/menu">
            <T en="Browse the menu" fil="Tingnan ang menu" />
          </Link>
        </div>
      </div>
    );

  return (
    <div className="cart-layout">
      <div className="cart-list">
        {cart.lines.map((line) => (
          <article className="cart-row" key={line.key}>
            <div>
              <strong>{line.name}</strong>
              {line.variantName && <small>{line.variantName}</small>}
              {line.addons.length > 0 && (
                <small>
                  {line.addons.map((addon) => addon.name).join(", ")}
                </small>
              )}
              <small>
                {formatPhp(line.unitPriceCents)} <T en="each" fil="bawat isa" />
              </small>
            </div>
            <strong>{formatPhp(line.unitPriceCents * line.quantity)}</strong>
            <div
              className="quantity-control"
              aria-label={`${line.name} quantity`}
            >
              <button
                type="button"
                onClick={() => cart.setQuantity(line.key, line.quantity - 1)}
                aria-label={`Remove one ${line.name}`}
              >
                −
              </button>
              <span>{line.quantity}</span>
              <button
                type="button"
                onClick={() => cart.setQuantity(line.key, line.quantity + 1)}
                aria-label={`Add one ${line.name}`}
              >
                +
              </button>
              <button
                type="button"
                className="remove-link"
                onClick={() => cart.remove(line.key)}
              >
                <T en="Remove" fil="Alisin" />
              </button>
            </div>
          </article>
        ))}
        <div className="cart-summary">
          <div className="summary-line">
            <span>
              <T en="Estimated subtotal" fil="Tinatayang subtotal" />
            </span>
            <strong>{formatPhp(cart.totalCents)}</strong>
          </div>
          <p className="field-help">
            <T
              en="The server will check current prices, options, and availability at checkout."
              fil="Susuriin ng server ang kasalukuyang presyo, opsyon, at availability sa checkout."
            />
          </p>
          <div className="button-row">
            <Link className="button button-secondary" href="/menu">
              <T en="Continue browsing" fil="Magpatuloy tumingin" />
            </Link>
            <Link className="button" href="/checkout">
              <T en="Continue to checkout" fil="Magpatuloy sa checkout" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
