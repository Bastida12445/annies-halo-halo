import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { T } from "@/components/language-provider";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">
            <T en="Order online" fil="Umorder online" />
          </span>
          <h1>
            <T en="Your cart" fil="Iyong cart" />
          </h1>
          <p>
            <T
              en="Review your selections. Your account is required to place an order."
              fil="Suriin ang pinili mo. Kailangan ang account para mag-order."
            />
          </p>
        </div>
      </section>
      <section className="section container">
        <CartView />
      </section>
    </>
  );
}
