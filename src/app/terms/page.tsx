import { PolicyPage } from "@/components/policy-page";

export const metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <PolicyPage
      policyKey="terms"
      title="Terms of service"
      titleFil="Mga tuntunin ng serbisyo"
      intro="These terms cover use of the Annie's Halo Halo website, customer accounts, orders, and reservation requests."
      introFil="Saklaw ng mga tuntuning ito ang paggamit sa website ng Annie's Halo Halo, customer account, order, at reservation request."
      sections={[
        {
          heading: "Using the website",
          headingFil: "Paggamit sa website",
          paragraphs: [
            "You may browse public pages without an account. An account and active sign-in are required before you can submit an order or reservation request. Keep your account details accurate and do not share your password.",
          ],
          paragraphsFil: [
            "Maaari mong tingnan ang mga pampublikong page nang walang account. Kailangan ang account at pag-log in bago magsumite ng order o reservation. Panatilihing tama ang detalye ng account at huwag ibahagi ang password.",
          ],
        },
        {
          heading: "Menu, prices, and availability",
          headingFil: "Menu, presyo, at availability",
          paragraphs: [
            "Menu items, prices, and availability may change. The checkout system checks current product data and will ask you to review a material price change before an order is created. An order request is subject to confirmation by the shop.",
          ],
          paragraphsFil: [
            "Maaaring magbago ang menu, presyo, at availability. Susuriin ng checkout ang kasalukuyang data at hihilingin sa iyo na suriin ang malaking pagbabago ng presyo bago malikha ang order. Kailangan pa ring kumpirmahin ng tindahan ang request.",
          ],
        },
        {
          heading: "Customer responsibilities",
          headingFil: "Pananagutan ng customer",
          paragraphs: [
            "Provide accurate fulfillment information and use the website lawfully. The shop may decline requests that cannot be fulfilled, that use unsupported service areas, or that conflict with configured business rules.",
          ],
          paragraphsFil: [
            "Magbigay ng tamang impormasyon para sa pagtupad ng order at gamitin nang naaayon sa batas ang website. Maaaring tanggihan ng tindahan ang request na hindi matutupad, nasa hindi suportadong service area, o salungat sa naka-configure na patakaran.",
          ],
        },
        {
          heading: "Owner review",
          headingFil: "Pagsusuri ng may-ari",
          paragraphs: [
            "These are initial website terms and have not had legal review. The owner should confirm final ordering, cancellation, privacy, and dispute rules before public launch.",
          ],
          paragraphsFil: [
            "Paunang tuntunin ito ng website at hindi pa nasusuri ng abogado. Dapat kumpirmahin ng may-ari ang pinal na patakaran sa order, cancellation, privacy, at reklamo bago ilunsad sa publiko.",
          ],
        },
      ]}
    />
  );
}
