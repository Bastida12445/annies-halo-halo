import { PolicyPage } from "@/components/policy-page";

export const metadata = { title: "Ordering guide" };

export default function OrderingGuidePage() {
  return (
    <PolicyPage
      policyKey="ordering"
      title="Ordering guide"
      titleFil="Gabay sa pag-order"
      intro="Follow these steps to review the menu, submit an order, and check its status."
      introFil="Sundin ang mga hakbang na ito upang tingnan ang menu, magsumite ng order, at alamin ang status nito."
      sections={[
        {
          heading: "Browse and build a cart",
          headingFil: "Tumingin at maglagay sa cart",
          paragraphs: [
            "Browse current products and availability. Choose product options when they are offered. Your cart is a temporary browser estimate and does not reserve products or lock prices.",
          ],
          paragraphsFil: [
            "Tingnan ang kasalukuyang produkto at availability. Pumili ng opsyon kung mayroon. Pansamantalang estimate lang sa browser ang cart; hindi nito nirereserba ang produkto o presyo.",
          ],
        },
        {
          heading: "Sign in and review checkout",
          headingFil: "Mag-log in at suriin ang checkout",
          paragraphs: [
            "Sign in or create an account before checkout. Review the available fulfillment and payment methods, enter any required details, and confirm the current total. The server rechecks product availability, selected options, fees, and prices.",
          ],
          paragraphsFil: [
            "Mag-log in o gumawa ng account bago mag-checkout. Suriin ang available na paraan ng pagtanggap at pagbabayad, ilagay ang kailangang detalye, at kumpirmahin ang kabuuan. Muling susuriin ng server ang produkto, opsyon, bayarin, at presyo.",
          ],
        },
        {
          heading: "Order status",
          headingFil: "Status ng order",
          paragraphs: [
            "After a successful request, use your account to view its status. A request is not confirmed until an authorized staff member updates it. Email or SMS updates are not enabled until a provider is configured.",
          ],
          paragraphsFil: [
            "Pagkatapos magsumite, gamitin ang account para tingnan ang status. Hindi kumpirmado ang request hangga’t hindi ito ina-update ng awtorisadong staff. Hindi enabled ang email o SMS hangga’t walang naka-configure na provider.",
          ],
        },
        {
          heading: "Current setup",
          headingFil: "Kasalukuyang setup",
          paragraphs: [
            "Pickup, delivery, and payment methods appear only after the shop enables them in its settings. If checkout says orders are not available, the shop has not finished configuring its order rules.",
          ],
          paragraphsFil: [
            "Lalabas lang ang pickup, delivery, at paraan ng bayad kapag pinagana na ng tindahan sa settings. Kung hindi available ang checkout, hindi pa tapos i-configure ng tindahan ang mga patakaran sa order.",
          ],
        },
      ]}
    />
  );
}
