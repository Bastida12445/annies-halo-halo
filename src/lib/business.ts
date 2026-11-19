import type { Json } from "@/types/database";
import { createOptionalClient } from "@/lib/supabase/server";
import { getEnabledPayMongoChannels } from "@/lib/paymongo-config";
import { isPaymentQrImagePath } from "@/lib/payment-qr";

export type DeliveryArea = {
  name: string;
  fee_cents: number;
  minimum_order_cents: number;
};

export type ReservationType = {
  id: string;
  label: string;
  enabled: boolean;
  capacity: number | null;
  max_advance_days: number;
  party_size_required: boolean;
  min_lead_hours: number;
  minimum_party_size: number;
  maximum_party_size: number;
};

export type ReservationSlot = {
  type_id: string;
  starts_at: string;
  capacity: number;
};

export type PolicyKey = "privacy" | "terms" | "refund" | "ordering" | "reservation";
export type PolicyCopy = Record<PolicyKey, { en: string; fil: string }>;

const standardPolicyCopy: PolicyCopy = {
  privacy: {
    en: `ANNIE'S HALO HALO — PRIVACY NOTICE

Who handles your information
Annie's Halo Halo in Loreto, Agusan del Sur, Philippines (the Shop) handles information you provide through this website.

Information we handle
• Account details: your name, email address, account identifier, and any phone number you add to your profile.
• Orders: selected items and options, quantities, prices, total, pickup or delivery choice, service area, delivery address, phone number and notes you submit, plus the order reference and status.
• Reservations: reservation type, requested date and time, party size, phone number and notes you submit, plus the booking reference and status.
• Payment records: payment method, amount, status, and transaction references. When PayMongo checkout is enabled and selected, PayMongo processes payment details on its hosted checkout. The Shop's website does not ask you to send a card PIN, password, or security code, and does not store your full card details.
• Necessary sign-in, session, and security information. Your cart and language preference may be stored in your browser.

Why we use it
We use this information to create and secure your account, review and fulfill orders and reservations, confirm payments, answer questions, prevent misuse, maintain business records, and meet legal obligations. Information is used only for these purposes or another purpose explained to you and permitted by law. If you do not provide a detail required for a service, we may be unable to complete that request.

Who may receive it
Information is available to authorized Shop staff who need it to serve you. It may also be processed by service providers that host the website, database, or sign-in service, and by the payment provider when you choose its checkout. We do not sell your personal information. Information may be disclosed when required by law or a valid government or court process. Providers are expected to protect information they process for the Shop.

Storage and retention
Account information is kept while your account is active and as needed to provide the service. Order, payment, and reservation records may be retained for accounting, tax, safety, dispute-resolution, and other legal requirements. We keep information only as long as reasonably needed for these purposes, then delete or de-identify it when appropriate. Backups and provider records may remain for the providers' normal backup or retention period. A deletion request may not remove records the Shop must keep by law.

Your choices and rights
Under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), you may have rights to be informed, access or correct your information, object to certain processing, request erasure or blocking where allowed, obtain a portable copy where applicable, seek damages, and file a complaint with the National Privacy Commission. These rights are subject to the law and its exceptions. To make a request, contact the Shop using the phone, email, or social link shown on the Contact page. If none is listed, contact the Shop at its Loreto location. We may ask for reasonable proof of identity before acting on a request.

Contact
For privacy questions, contact Annie's Halo Halo through the contact details published on this website or at the Shop in Loreto, Agusan del Sur. Do not send your password, one-time code, card PIN, or full payment credentials in a message.`,
    fil: `PAUNAWA SA PRIVACY — ANNIE'S HALO HALO

Sino ang nangangasiwa ng iyong impormasyon
Ang Annie's Halo Halo sa Loreto, Agusan del Sur, Philippines (ang Tindahan) ang nangangasiwa sa impormasyong ibinibigay mo sa website na ito.

Impormasyong pinoproseso
• Account: pangalan, email address, account identifier, at numero ng telepono kung ilalagay mo sa profile.
• Order: mga produktong at opsyong pinili, dami, presyo at kabuuan, pickup o delivery, service area, delivery address, numero ng telepono at tala na ibinigay mo, pati reference at status ng order.
• Reservation: uri, hinihinging petsa at oras, bilang ng tao, numero ng telepono at tala na ibinigay mo, pati reference at status ng booking.
• Tala ng bayad: paraan ng bayad, halaga, status, at transaction reference. Kapag pinagana at pinili mo ang PayMongo, pinoproseso nito ang detalye ng bayad sa sarili nitong hosted checkout. Hindi hinihingi ng website ng Tindahan ang PIN, password, o security code ng card, at hindi nito iniimbak ang buong detalye ng iyong card.
• Kinakailangang impormasyon para sa sign-in, session, at seguridad. Maaaring itago sa browser mo ang cart at piniling wika.

Bakit namin ito ginagamit
Ginagamit namin ang impormasyon upang gumawa at protektahan ang account mo, suriin at tuparin ang order at reservation, kumpirmahin ang bayad, sagutin ang mga tanong, pigilan ang maling paggamit, panatilihin ang tala ng negosyo, at tuparin ang obligasyon sa batas. Para lamang ito sa mga dahilang ito o ibang layuning ipinaliwanag sa iyo at pinahihintulutan ng batas. Kung hindi mo ibibigay ang detalyeng kailangan para sa isang serbisyo, maaaring hindi namin makumpleto ang request mo.

Sino ang maaaring makatanggap nito
Maa-access ito ng awtorisadong staff na nangangailangan nito upang pagsilbihan ka. Maaari rin itong iproseso ng mga service provider na nagho-host ng website, database, o sign-in service, at ng payment provider kung piliin mo ang checkout nito. Hindi namin ibinebenta ang iyong personal na impormasyon. Maaari lamang itong ibunyag kung inaatas ng batas o ng wastong proseso ng pamahalaan o hukuman. Inaasahang poprotektahan ng mga provider ang impormasyong pinoproseso nila para sa Tindahan.

Pag-iimbak at tagal ng pagtatago
Itinatago ang impormasyon ng account habang aktibo ito at hangga't kailangan para maibigay ang serbisyo. Maaaring panatilihin ang tala ng order, bayad, at reservation para sa accounting, buwis, kaligtasan, pagresolba ng reklamo, at iba pang legal na obligasyon. Itinatago lamang namin ang impormasyon habang makatwirang kailangan para sa mga layuning ito at buburahin o aalisan ng pagkakakilanlan kapag nararapat na. Maaaring manatili ang backup at tala ng provider ayon sa karaniwang iskedyul nila. Maaaring hindi mabura ng request sa pagbura ang rekord na kailangang panatilihin ng Tindahan ayon sa batas.

Mga karapatan mo
Sa ilalim ng Data Privacy Act of 2012 (Republic Act No. 10173), maaari mong gamitin ang mga karapatang malaman, makita o itama ang impormasyon, tumutol sa ilang pagproseso, humiling ng pagbura o pagharang kung pinahihintulutan, kumuha ng portable na kopya kung naaangkop, humingi ng danyos, at magsampa ng reklamo sa National Privacy Commission. Saklaw ang mga karapatang ito ng mga limitasyon at eksepsyon sa batas. Para humiling, gamitin ang telepono, email, o social link sa Contact page. Kung walang nakalista, makipag-ugnayan nang personal sa Tindahan sa Loreto. Maaari kaming humingi ng makatwirang patunay ng pagkakakilanlan.

Pakikipag-ugnayan
Para sa tanong sa privacy, makipag-ugnayan sa Annie's Halo Halo gamit ang contact details sa website o sa Tindahan sa Loreto, Agusan del Sur. Huwag ipadala sa mensahe ang password, one-time code, PIN ng card, o buong kredensyal sa pagbabayad.`,
  },
  terms: {
    en: `ANNIE'S HALO HALO — WEBSITE AND ORDER TERMS

Using the website
You may browse public pages without an account. You need to sign in to submit an order or reservation request. Keep your account details accurate and your password private. You are responsible for activity carried out through your signed-in account; contact the Shop promptly if you believe someone has accessed it without permission.

Menu, prices, and availability
Menu items, options, prices, and availability can change. Your cart is an estimate and does not reserve an item or lock its price. Before an order is created, checkout checks current item availability, options, prices, fees, and minimum-order rules. Review the final total shown at checkout. If a price or item changes, review the updated details before submitting again.

Order requests and payment
Submitting checkout creates an order request with a pending-confirmation status. The Shop must review and confirm it before it is accepted for fulfillment. The Shop will update the status in your account if it accepts, declines, or cancels the request. Pickup, delivery areas, fees, minimums, and payment choices are only available when shown at checkout. PayMongo payments, when offered, are handled through PayMongo's hosted checkout and are also subject to its terms. A payment record does not by itself mean the Shop has confirmed fulfillment.

Customer information and conduct
Provide a working contact number when requested, an accurate delivery address and service area for delivery, and notes needed to fulfill your order. Do not submit unlawful, abusive, fraudulent, or knowingly false requests, or attempt to interfere with the website. The Shop may decline a request it cannot fulfill or that does not meet the published checkout rules, and will update you through the available contact or account channel.

Reservations
A reservation submitted through the website is a request, not a confirmed booking. It becomes confirmed only after an authorized staff member updates its status. Availability, party-size rules, and cancellation deadlines are those displayed when you submit the request. See the Reservation Policy for details.

Changes and legal rights
The Shop may update these terms when its services or rules change and will publish the current version on this website. These terms do not remove consumer, privacy, or other rights provided by applicable Philippine law. If a term conflicts with a right that cannot legally be waived, that right continues to apply. For order concerns, use the contact details published on the Contact page or speak with the Shop in Loreto, Agusan del Sur.`,
    fil: `ANNIE'S HALO HALO — MGA TUNTUNIN SA WEBSITE AT ORDER

Paggamit sa website
Maaari mong tingnan ang mga pampublikong page nang walang account. Kailangan mong mag-log in upang magsumite ng order o reservation request. Panatilihing tama ang detalye ng account at huwag ibahagi ang password. Pananagutan mo ang aktibidad sa naka-log in mong account; makipag-ugnayan agad sa Tindahan kung sa tingin mo ay may ibang gumamit nito nang walang pahintulot.

Menu, presyo, at availability
Maaaring magbago ang menu, opsyon, presyo, at availability. Estimate lamang ang cart; hindi nito inilalaan ang produkto o tinitiyak ang presyo. Bago malikha ang order, susuriin ng checkout ang kasalukuyang availability, opsyon, presyo, bayarin, at minimum order. Suriin ang kabuuang ipinapakita sa checkout. Kung nagbago ang presyo o produkto, tingnan muna ang na-update na detalye bago muling magsumite.

Order request at bayad
Kapag nagsumite ka ng checkout, gagawa ito ng order request na may status na pending confirmation. Kailangang suriin at kumpirmahin muna ito ng Tindahan bago tanggapin para tuparin. Ia-update ng Tindahan ang status sa account mo kung tinanggap, tinanggihan, o kinansela ang request. Lalabas lang sa checkout ang pickup, delivery area, bayarin, minimum, at paraan ng bayad kapag available ang mga ito. Kapag iniaalok ang PayMongo, sa hosted checkout nito pinoproseso ang bayad at saklaw din ito ng mga tuntunin ng PayMongo. Hindi awtomatikong nangangahulugan ang tala ng bayad na kumpirmado na ang pagtupad ng Tindahan.

Impormasyon at asal ng customer
Magbigay ng gumaganang numero kapag hiniling, tamang delivery address at service area para sa delivery, at mga tala na kailangan sa pagtupad ng order. Huwag magsumite ng ilegal, mapanakit, mapanlinlang, o sadyang maling request, o subukang gambalain ang website. Maaaring tanggihan ng Tindahan ang request na hindi nito matutupad o hindi pumapasa sa checkout rules, at ia-update ka nito sa available na contact o account channel.

Reservation
Request lamang ang reservation na isinumite sa website, hindi pa kumpirmadong booking. Magiging kumpirmado lamang ito kapag in-update ng awtorisadong staff ang status. Sundin ang availability, patakaran sa bilang ng tao, at deadline sa pagkansela na ipinakita noong nagsumite ka. Basahin ang Reservation Policy para sa detalye.

Mga pagbabago at karapatan ayon sa batas
Maaaring baguhin ng Tindahan ang mga tuntuning ito kapag nagbago ang serbisyo o patakaran at ilalathala nito ang kasalukuyang bersyon sa website. Hindi inaalis ng mga tuntuning ito ang karapatan ng mamimili, privacy, o iba pang karapatang ipinagkakaloob ng naaangkop na batas ng Pilipinas. Kung salungat ang isang tuntunin sa karapatang hindi maaaring talikuran ayon sa batas, patuloy na umiiral ang karapatang iyon. Para sa tanong tungkol sa order, gamitin ang contact details sa Contact page o makipag-usap sa Tindahan sa Loreto, Agusan del Sur.`,
  },
  refund: {
    en: `ANNIE'S HALO HALO — CANCELLATION AND REFUND POLICY

Cancelling before confirmation
An order starts as pending confirmation. While it remains pending, you may request cancellation using the cancellation option in your account. If the Shop has already confirmed the order, contact the Shop as soon as possible; the Shop will review whether preparation or fulfillment has started and tell you what can be done. The order page shows its current status.

If the Shop cannot fulfill an order
If the Shop declines or cancels an order it cannot fulfill, it will update the order status and contact you using the available account or contact details. If an online payment was completed for that order, the Shop will review it and initiate any refund due through the original payment provider or another lawful method. The time for a refund to appear depends on the provider or bank.

Payment-provider checkout
For a PayMongo order, cancelling a pending checkout may expire the payment session. If PayMongo has already reported a completed payment, cancelling the order does not automatically send a refund. Contact the Shop with your order reference so it can review the payment and arrange any refund due. Never send a card PIN, password, or one-time code.

Wrong, incomplete, or unsatisfactory order
Please check the order when it arrives or is handed over. If an item is missing, incorrect, damaged, or otherwise does not match what was confirmed, contact the Shop promptly with the order reference and a clear description. The Shop will review the concern and explain the available remedy. Depending on the facts and applicable law, a remedy may include correction, replacement, refund, or another appropriate resolution. This policy does not remove consumer rights or remedies under Philippine law.

Cash orders and change of mind
Cash-on-pickup and cash-on-delivery orders are not charged online. If cash has already been collected and a refund is due, contact the Shop to arrange it. A cancellation or change-of-mind request after confirmation is reviewed based on the order's preparation and fulfillment status; no term here limits a remedy required by law.

How to contact the Shop
Use the phone, email, or social link published on the Contact page, or speak with the Shop in Loreto, Agusan del Sur. Include your order reference, but do not share payment passwords or security codes.`,
    fil: `ANNIE'S HALO HALO — PATAKARAN SA PAGKANSELA AT REFUND

Pagkansela bago kumpirmahin
Nagsisimula ang order bilang pending confirmation. Habang pending pa ito, maaari kang humiling ng pagkansela gamit ang cancellation option sa account mo. Kung nakumpirma na ng Tindahan ang order, makipag-ugnayan agad; susuriin ng Tindahan kung nagsimula na ang paghahanda o pagtupad at sasabihin kung ano ang maaari pang gawin. Ipinapakita ng order page ang kasalukuyang status.

Kung hindi matutupad ng Tindahan ang order
Kung tatanggihan o kakanselahin ng Tindahan ang order na hindi nito matutupad, ia-update nito ang status at makikipag-ugnayan gamit ang available na account o contact details. Kung nakumpleto na ang online payment para sa order, susuriin ito ng Tindahan at sisimulan ang anumang refund na nararapat sa pamamagitan ng orihinal na payment provider o ibang paraang pinahihintulutan ng batas. Nakadepende sa provider o bangko kung kailan lalabas ang refund.

Checkout ng payment provider
Para sa PayMongo order, maaaring mag-expire ang payment session kapag kinansela ang pending checkout. Kung iniulat na ng PayMongo na kumpleto ang bayad, hindi awtomatikong nagpapadala ng refund ang pagkansela ng order. Makipag-ugnayan sa Tindahan at ibigay ang order reference upang masuri ang bayad at maisaayos ang refund na nararapat. Huwag kailanman ipadala ang PIN ng card, password, o one-time code.

Mali, kulang, o hindi kasiya-siyang order
Suriin ang order pagdating o pag-abot nito sa iyo. Kung may kulang o maling item, sira ang produkto, o hindi tugma sa nakumpirma, makipag-ugnayan agad sa Tindahan at ibigay ang order reference at malinaw na paglalarawan. Susuriin ng Tindahan ang concern at ipapaliwanag ang maaaring remedyo. Depende sa pangyayari at naaangkop na batas, maaaring kabilang dito ang pagwawasto, kapalit na produkto, refund, o ibang angkop na solusyon. Hindi inaalis ng patakarang ito ang karapatan o remedyo ng mamimili sa ilalim ng batas ng Pilipinas.

Cash order at pagbabago ng isip
Hindi sinisingil online ang cash-on-pickup at cash-on-delivery. Kung nakolekta na ang cash at may refund na nararapat, makipag-ugnayan sa Tindahan upang isaayos ito. Susuriin ang request na magkansela o magbago ng isip matapos kumpirmahin batay sa paghahanda at status ng pagtupad; hindi nililimitahan ng patakarang ito ang remedyo na inaatas ng batas.

Pakikipag-ugnayan
Gamitin ang telepono, email, o social link sa Contact page, o makipag-usap sa Tindahan sa Loreto, Agusan del Sur. Isama ang order reference ngunit huwag ibahagi ang password sa bayad o security code.`,
  },
  ordering: {
    en: `ANNIE'S HALO HALO — ORDERING GUIDE

1. Browse the menu
Review the current menu, descriptions, options, prices, and availability. Add the items and quantities you want to your cart. Your cart is saved in this browser, but it does not reserve products or lock their prices.

2. Sign in and choose fulfillment
Sign in or create a customer account before checkout. Choose pickup or delivery from the methods currently offered. For delivery, select one of the service areas shown and enter a complete address and reachable phone number. The Shop may be unable to fulfill an order outside its configured areas.

3. Choose a payment method
Select one of the payment methods displayed at checkout. Cash is collected at pickup or delivery, depending on the option selected. If PayMongo is offered, you will be sent to its hosted checkout to complete an online payment. Do not send payment credentials to the Shop in a message.

4. Review the total and submit
Check the items, options, quantities, delivery fee, minimum-order requirement, contact details, and final total. Prices and availability are checked again when you submit. If the system reports a change, review the cart and confirm the new total before submitting again. An order request is pending until the Shop reviews and confirms it; submitting a request does not guarantee acceptance.

5. Follow your order
Use My Account > Orders to view the status and request cancellation while the order is still pending confirmation. If the Shop accepts the order, follow the status updates and the preparation or delivery estimate shown. Estimates can change with order volume, weather, and operating conditions. If an item or payment issue arises, contact the Shop and include the order reference.

Availability and support
Pickup, delivery, service areas, fees, minimums, estimated times, and payment options appear only when enabled by the Shop. If checkout says ordering is unavailable, contact the Shop using the current details on the Contact page or at its Loreto location.`,
    fil: `ANNIE'S HALO HALO — GABAY SA PAG-ORDER

1. Tingnan ang menu
Suriin ang kasalukuyang menu, paglalarawan, opsyon, presyo, at availability. Idagdag sa cart ang mga produkto at daming gusto mo. Naka-save sa browser na ito ang cart, pero hindi nito inilalaan ang produkto o tinitiyak ang presyo.

2. Mag-log in at pumili ng pagtanggap
Mag-log in o gumawa ng customer account bago mag-checkout. Pumili ng pickup o delivery mula sa kasalukuyang iniaalok. Para sa delivery, pumili ng service area na ipinapakita at ilagay ang kumpletong address at numerong maaabot. Maaaring hindi matupad ng Tindahan ang order sa labas ng naka-configure na area.

3. Pumili ng paraan ng bayad
Pumili ng paraan ng bayad na ipinapakita sa checkout. Kokolektahin ang cash sa pickup o delivery, ayon sa napiling opsyon. Kung iniaalok ang PayMongo, dadalhin ka sa hosted checkout nito para kumpletuhin ang online payment. Huwag ipadala sa mensahe sa Tindahan ang mga kredensyal sa pagbabayad.

4. Suriin ang kabuuan at isumite
Suriin ang produkto, opsyon, dami, delivery fee, minimum order, contact details, at kabuuang babayaran. Muling susuriin ang presyo at availability kapag nagsumite ka. Kung may naiulat na pagbabago, tingnan ang cart at kumpirmahin ang bagong kabuuan bago muling magsumite. Pending muna ang order request hanggang masuri at makumpirma ng Tindahan; hindi garantiya ng pagtanggap ang pagsusumite.

5. Subaybayan ang order
Pumunta sa My Account > Orders upang makita ang status at humiling ng pagkansela habang pending confirmation pa ang order. Kung tinanggap ito ng Tindahan, sundin ang mga update at tinatayang oras ng paghahanda o delivery. Maaaring magbago ang estimate dahil sa dami ng order, panahon, at kundisyon ng operasyon. Kung may problema sa produkto o bayad, makipag-ugnayan sa Tindahan at isama ang order reference.

Availability at tulong
Lalabas lang ang pickup, delivery, service area, bayarin, minimum, tinatayang oras, at paraan ng bayad kapag pinagana ng Tindahan. Kung sinasabi ng checkout na hindi available ang pag-order, gamitin ang kasalukuyang contact details sa Contact page o makipag-ugnayan sa Tindahan sa Loreto.`,
  },
  reservation: {
    en: `ANNIE'S HALO HALO — RESERVATION POLICY

Submitting a request
You must sign in to submit a reservation request. Choose an available reservation type and time, enter the requested party size and any required contact details, and review the information before submitting. Only the types, times, and capacities currently shown on the website can be requested. Submitting a request does not by itself create a confirmed booking.

Confirmation and changes
Every new request is marked pending. A reservation is confirmed only when an authorized Shop staff member changes its status to confirmed. Check My Account > Reservations for the current status. If the requested time or party size changes, contact the Shop; do not assume a change is approved until staff confirm it.

Cancellation
You may cancel your own pending reservation through your account until the cancellation cutoff configured by the Shop. The cutoff shown by the system applies relative to the requested reservation time. If the reservation is already confirmed, the cutoff has passed, or the cancellation option is unavailable, contact the Shop as soon as possible. The Shop will review the request and update the reservation status.

Arrival and party size
Please arrive at the requested time and tell the Shop promptly if you will be late or your party size changes. A reservation is subject to the capacity and conditions shown when the request is submitted. The Shop may contact you using the details on the reservation to clarify the request.

Availability and questions
Reservation availability may change as requests are received. If the website does not show a suitable option, contact the Shop rather than submitting a different time or type. Use the phone, email, or social link on the Contact page, or speak with the Shop in Loreto, Agusan del Sur. Applicable consumer and privacy rights remain in effect.`,
    fil: `ANNIE'S HALO HALO — PATAKARAN SA RESERVATION

Pagsusumite ng request
Kailangan mong mag-log in upang magsumite ng reservation request. Pumili ng available na uri at oras, ilagay ang hinihinging bilang ng tao at contact details, at suriin ang impormasyon bago isumite. Ang mga uri, oras, at kapasidad na ipinapakita lamang sa website ang maaaring i-request. Hindi pa kumpirmadong booking ang pagsusumite ng request.

Confirmation at pagbabago
Pending ang bawat bagong request. Kumpirmado lamang ang reservation kapag binago ng awtorisadong staff ng Tindahan ang status nito sa confirmed. Tingnan ang My Account > Reservations para sa kasalukuyang status. Kung magbabago ang oras o bilang ng tao, makipag-ugnayan sa Tindahan; huwag ipagpalagay na aprubado ang pagbabago hangga't hindi kinukumpirma ng staff.

Pagkansela
Maaari mong kanselahin sa account mo ang sarili mong pending reservation hanggang sa cancellation cutoff na itinakda ng Tindahan. Ipinatutupad ng system ang cutoff kaugnay ng hinihinging oras ng reservation. Kung confirmed na ang reservation, lumipas na ang cutoff, o walang cancellation option, makipag-ugnayan agad sa Tindahan. Susuriin ng Tindahan ang request at ia-update ang status.

Pagdating at bilang ng tao
Pumunta sa hinihinging oras at ipaalam agad sa Tindahan kung male-late ka o magbabago ang bilang ng kasama. Saklaw ang reservation ng kapasidad at kundisyong ipinakita noong nagsumite ka. Maaaring makipag-ugnayan ang Tindahan gamit ang contact details sa reservation upang linawin ang request.

Availability at mga tanong
Maaaring magbago ang availability habang dumarami ang request. Kung walang angkop na opsyon sa website, makipag-ugnayan sa Tindahan sa halip na magsumite ng ibang oras o uri. Gamitin ang telepono, email, o social link sa Contact page, o makipag-usap sa Tindahan sa Loreto, Agusan del Sur. Patuloy na umiiral ang naaangkop na karapatan sa mamimili at privacy.`,
  },
};

export type BusinessSettings = {
  business_name: string;
  short_description: string;
  brand_story: string;
  address: string;
  phone: string;
  email: string;
  business_hours: string;
  social_links: Array<{ label: string; url: string }>;
  estimated_preparation_minutes: number | null;
  estimated_delivery_minutes: number | null;
  minimum_order_cents: number;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  delivery_areas: DeliveryArea[];
  payment_methods: Array<"cash_on_pickup" | "cash_on_delivery" | "paymongo">;
  paymongo_payment_methods: string[];
  gcash_qr_image_path: string | null;
  paymaya_qr_image_path: string | null;
  announcement: string;
  reservations_enabled: boolean;
  reservation_types: ReservationType[];
  reservation_slots: ReservationSlot[];
  reservation_cancellation_cutoff_hours: number;
  policy_copy: PolicyCopy;
};

export const defaultBusinessSettings: BusinessSettings = {
  business_name: "Annie’s Halo Halo",
  short_description: "A local halo-halo shop in Loreto, Agusan del Sur.",
  brand_story: "",
  address: "5VJ5+JV6, Loreto, Agusan del Sur, Philippines",
  phone: "",
  email: "",
  business_hours: "",
  social_links: [],
  estimated_preparation_minutes: null,
  estimated_delivery_minutes: null,
  minimum_order_cents: 0,
  pickup_enabled: false,
  delivery_enabled: false,
  delivery_areas: [],
  payment_methods: [],
  paymongo_payment_methods: [],
  gcash_qr_image_path: null,
  paymaya_qr_image_path: null,
  announcement: "",
  reservations_enabled: false,
  reservation_types: [],
  reservation_slots: [],
  reservation_cancellation_cutoff_hours: 0,
  policy_copy: standardPolicyCopy,
};

// Public settings are cached between navigations; order and reservation RPCs re-check the database.
const BUSINESS_SETTINGS_CACHE_TTL_MS = 60_000;
let businessSettingsCache: {
  value: BusinessSettings;
  expiresAt: number;
} | null = null;
let businessSettingsRequest: Promise<BusinessSettings> | null = null;
let businessSettingsVersion = 0;

export function clearBusinessSettingsCache() {
  businessSettingsVersion += 1;
  businessSettingsCache = null;
  businessSettingsRequest = null;
}

function asRecord(value: Json | null | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function parseBusinessSettings(value: Json | null | undefined): BusinessSettings {
  const source = asRecord(value);
  const defaults = defaultBusinessSettings;
  const paymongoChannels = getEnabledPayMongoChannels();
  const gcashQrImagePath = isPaymentQrImagePath(source.gcash_qr_image_path)
    ? source.gcash_qr_image_path
    : null;
  const paymayaQrImagePath = isPaymentQrImagePath(source.paymaya_qr_image_path)
    ? source.paymaya_qr_image_path
    : null;
  const paymentMethods = Array.isArray(source.payment_methods)
    ? source.payment_methods.filter(
        (method): method is BusinessSettings["payment_methods"][number] =>
          method === "cash_on_pickup" ||
          method === "cash_on_delivery" ||
          (method === "paymongo" && paymongoChannels.length > 0),
      )
    : defaults.payment_methods;
  const deliveryAreas = Array.isArray(source.delivery_areas)
    ? source.delivery_areas.flatMap((area) => {
        const row = asRecord(area);
        if (typeof row.name !== "string" || typeof row.fee_cents !== "number") return [];
        return [{
          name: row.name,
          fee_cents: row.fee_cents,
          minimum_order_cents: typeof row.minimum_order_cents === "number" ? row.minimum_order_cents : 0,
        }];
      })
    : defaults.delivery_areas;
  const reservationTypes = Array.isArray(source.reservation_types)
    ? source.reservation_types.flatMap((type) => {
        const row = asRecord(type);
        if (typeof row.id !== "string" || typeof row.label !== "string") return [];
        return [{
          id: row.id,
          label: row.label,
          enabled: row.enabled === true,
          capacity: typeof row.capacity === "number" ? row.capacity : null,
          max_advance_days: typeof row.max_advance_days === "number" ? row.max_advance_days : 30,
          party_size_required: row.party_size_required === true,
          min_lead_hours: typeof row.min_lead_hours === "number" ? row.min_lead_hours : 0,
          minimum_party_size: typeof row.minimum_party_size === "number" ? row.minimum_party_size : 1,
          maximum_party_size: typeof row.maximum_party_size === "number" ? row.maximum_party_size : 40,
        }];
      })
    : defaults.reservation_types;
  const reservationSlots = Array.isArray(source.reservation_slots)
    ? source.reservation_slots.flatMap((slot) => {
        const row = asRecord(slot);
        if (typeof row.type_id !== "string" || typeof row.starts_at !== "string" || typeof row.capacity !== "number") return [];
        return [{ type_id: row.type_id, starts_at: row.starts_at, capacity: row.capacity }];
      })
    : defaults.reservation_slots;
  const socialLinks = Array.isArray(source.social_links)
    ? source.social_links.flatMap((link) => {
        const row = asRecord(link);
        if (typeof row.label !== "string" || typeof row.url !== "string" || !row.url.startsWith("https://")) return [];
        return [{ label: row.label, url: row.url }];
      })
    : defaults.social_links;
  const policyCopy = Object.fromEntries((Object.keys(defaults.policy_copy) as PolicyKey[]).map((key) => {
    const row = asRecord(source.policy_copy)?.[key];
    const copy = asRecord(row);
    return [key, {
      en: typeof copy.en === "string" && copy.en.trim() ? copy.en : standardPolicyCopy[key].en,
      fil: typeof copy.fil === "string" && copy.fil.trim() ? copy.fil : standardPolicyCopy[key].fil,
    }];
  })) as PolicyCopy;

  return {
    business_name: typeof source.business_name === "string" ? source.business_name : defaults.business_name,
    short_description: typeof source.short_description === "string" ? source.short_description : defaults.short_description,
    brand_story: typeof source.brand_story === "string" ? source.brand_story : "",
    address: typeof source.address === "string" ? source.address : defaults.address,
    phone: typeof source.phone === "string" ? source.phone : defaults.phone,
    email: typeof source.email === "string" ? source.email : defaults.email,
    business_hours: typeof source.business_hours === "string" ? source.business_hours : defaults.business_hours,
    social_links: socialLinks,
    estimated_preparation_minutes: typeof source.estimated_preparation_minutes === "number" ? source.estimated_preparation_minutes : null,
    estimated_delivery_minutes: typeof source.estimated_delivery_minutes === "number" ? source.estimated_delivery_minutes : null,
    minimum_order_cents: typeof source.minimum_order_cents === "number" ? source.minimum_order_cents : 0,
    pickup_enabled: source.pickup_enabled === true,
    delivery_enabled: source.delivery_enabled === true,
    delivery_areas: deliveryAreas,
    payment_methods: paymentMethods,
    paymongo_payment_methods: paymongoChannels,
    gcash_qr_image_path: gcashQrImagePath,
    paymaya_qr_image_path: paymayaQrImagePath,
    announcement: typeof source.announcement === "string" ? source.announcement : "",
    reservations_enabled: source.reservations_enabled === true,
    reservation_types: reservationTypes,
    reservation_slots: reservationSlots,
    reservation_cancellation_cutoff_hours: typeof source.reservation_cancellation_cutoff_hours === "number" ? source.reservation_cancellation_cutoff_hours : 0,
    policy_copy: policyCopy,
  };
}

export async function getBusinessSettings() {
  if (businessSettingsCache && businessSettingsCache.expiresAt > Date.now()) {
    return businessSettingsCache.value;
  }
  if (businessSettingsRequest) return businessSettingsRequest;

  const version = businessSettingsVersion;
  const request = (async () => {
    const supabase = await createOptionalClient();
    if (!supabase) return defaultBusinessSettings;
    const { data, error } = await supabase
      .from("business_settings")
      .select("config")
      .eq("id", true)
      .maybeSingle();
    return error ? defaultBusinessSettings : parseBusinessSettings(data?.config);
  })();
  const sharedRequest = request.then((value) => {
    if (version === businessSettingsVersion) {
      businessSettingsCache = {
        value,
        expiresAt: Date.now() + BUSINESS_SETTINGS_CACHE_TTL_MS,
      };
    }
    return value;
  }).finally(() => {
    if (businessSettingsVersion === version) businessSettingsRequest = null;
  });
  businessSettingsRequest = sharedRequest;

  return sharedRequest;
}

