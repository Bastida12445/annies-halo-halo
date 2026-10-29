import { PolicyPage } from "@/components/policy-page";

export const metadata = { title: "Refund policy" };

export default function RefundPolicyPage() {
  return (
    <PolicyPage
      policyKey="refund"
      title="Refund & cancellation policy"
      titleFil="Patakaran sa refund at pagkansela"
      intro="Find out how to request an order cancellation, report a problem, and ask the Shop to review a payment."
      introFil="Alamin kung paano humiling ng pagkansela, mag-ulat ng problema, at magpasuri ng bayad sa Tindahan."
      sections={[
        {
          heading: "Before an order is confirmed",
          headingFil: "Bago kumpirmahin ang order",
          paragraphs: [
            "An order request remains pending until the shop reviews it. If a request cannot be fulfilled, the shop should contact the customer and explain the available next step. Any refund for a completed provider payment must be processed through the provider and the shop’s verified refund procedure.",
          ],
          paragraphsFil: [
            "Nananatiling pending ang order request hanggang masuri ito ng tindahan. Kung hindi matutupad ang request, dapat makipag-ugnayan ang tindahan sa customer at ipaliwanag ang susunod na hakbang. Dapat idaan sa provider at kumpirmadong refund procedure ng tindahan ang refund sa bayad na nakumpleto na.",
          ],
        },
        {
          heading: "Customer cancellation",
          headingFil: "Pagkansela ng customer",
          paragraphs: [
            "Customers can request cancellation while an order is pending confirmation. Later cancellation requests depend on the shop’s final rules and the order’s current status. The owner must provide the actual cancellation and refund deadlines before enabling paid orders.",
          ],
          paragraphsFil: [
            "Maaaring humiling ng pagkansela ang customer habang pending ang confirmation ng order. Ang mas huling request ay nakadepende sa pinal na patakaran at kasalukuyang status ng order. Dapat ibigay ng may-ari ang aktuwal na deadline sa cancellation at refund bago paganahin ang bayad na order.",
          ],
        },
        {
          heading: "Questions",
          headingFil: "Mga tanong",
          paragraphs: [
            "Use the verified contact details on the Contact page when available. This draft needs owner review before launch.",
          ],
          paragraphsFil: [
            "Gamitin ang kumpirmadong contact sa Contact page kapag available na. Kailangang suriin ng may-ari ang burador bago ilunsad.",
          ],
        },
      ]}
    />
  );
}
