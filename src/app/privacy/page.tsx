import { PolicyPage } from "@/components/policy-page";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <PolicyPage
      policyKey="privacy"
      title="Privacy policy"
      titleFil="Patakaran sa privacy"
      intro="Learn what information Annie's Halo Halo handles when you use an account, place an order, or request a reservation."
      introFil="Alamin kung anong impormasyon ang pinoproseso ng Annie's Halo Halo kapag gumamit ka ng account, umorder, o humiling ng reservation."
      sections={[
        {
          heading: "Information we collect",
          headingFil: "Impormasyong kinokolekta",
          paragraphs: [
            "When you register, the site stores your name and email address through Supabase Auth. A contact number is optional on an account and may be requested when it is needed to fulfill an order or reservation. Orders may include a delivery address, service area, selected items, prices at the time of order, and notes you choose to provide.",
          ],
          paragraphsFil: [
            "Sa pagrehistro, iniimbak ng site ang iyong pangalan at email sa pamamagitan ng Supabase Auth. Opsyonal ang numero ng telepono sa account at maaari itong hingin kung kailangan sa order o reservation. Maaaring laman ng order ang delivery address, service area, mga piniling produkto, presyo sa oras ng pag-order, at mga tala na kusang ibinigay mo.",
          ],
        },
        {
          heading: "How information is used",
          headingFil: "Paano ginagamit ang impormasyon",
          paragraphs: [
            "Information is used to maintain your account, process and track your orders or reservation requests, respond to your questions, and protect the service from abuse. Payment card details are not collected by this site. Payment providers, if enabled later, handle payment details under their own terms.",
          ],
          paragraphsFil: [
            "Ginagamit ang impormasyon para pamahalaan ang account, iproseso at subaybayan ang order o reservation, sagutin ang mga tanong, at protektahan ang serbisyo laban sa pang-aabuso. Hindi nangongolekta ang site ng detalye ng payment card. Kung paganahin sa hinaharap, ang payment provider ang hahawak sa detalye ayon sa sarili nitong tuntunin.",
          ],
        },
        {
          heading: "Storage, access, and retention",
          headingFil: "Pag-iimbak, access, at pagpapanatili",
          paragraphs: [
            "Account and business records are stored in the configured Supabase project. Customers can access only their own account records. Staff access is restricted by assigned roles. Order and payment records may need to be retained for business and accounting purposes; a customer may contact the business to request account deletion or correction. The owner should set the actual retention period before launch.",
          ],
          paragraphsFil: [
            "Nakaimbak sa naka-configure na Supabase project ang account at business records. Sarili lamang nilang records ang maa-access ng mga customer. Nililimitahan ang staff access ayon sa nakatalagang role. Maaaring kailangang panatilihin ang order at payment records para sa negosyo at accounting; maaaring makipag-ugnayan ang customer para humiling ng pagwawasto o pagbura ng account. Dapat itakda ng may-ari ang aktuwal na retention period bago ilunsad.",
          ],
        },
        {
          heading: "Questions",
          headingFil: "Mga tanong",
          paragraphs: [
            "No contact email has been provided yet. Use the verified contact details on the Contact page when they become available.",
          ],
          paragraphsFil: [
            "Wala pang ibinigay na contact email. Gamitin ang kumpirmadong detalye sa Contact page kapag available na.",
          ],
        },
      ]}
    />
  );
}
