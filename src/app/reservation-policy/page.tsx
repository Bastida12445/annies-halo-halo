import { PolicyPage } from "@/components/policy-page";

export const metadata = { title: "Reservation policy" };

export default function ReservationPolicyPage() {
  return (
    <PolicyPage
      policyKey="reservation"
      title="Reservation policy"
      titleFil="Patakaran sa reserbasyon"
      intro="Learn how to submit, confirm, change, or cancel a reservation request."
      introFil="Alamin kung paano magsumite, magkumpirma, magbago, o magkansela ng reservation request."
      sections={[
        {
          heading: "Requests and confirmation",
          headingFil: "Request at confirmation",
          paragraphs: [
            "A reservation request requires a signed-in customer account. A submitted request starts as pending and is not a confirmed booking. Only an authorized staff member may confirm it.",
          ],
          paragraphsFil: [
            "Kailangan ng naka-log in na customer account para mag-request ng reservation. Nagsisimula ito bilang pending at hindi pa kumpirmadong booking. Awtorisadong staff lamang ang maaaring magkumpirma.",
          ],
        },
        {
          heading: "Availability and cancellation",
          headingFil: "Availability at pagkansela",
          paragraphs: [
            "Available types, dates, times, capacity, and cancellation deadlines must be configured by the shop. The system will accept a request only when the configured rules allow it. The owner must review these initial terms before enabling reservations.",
          ],
          paragraphsFil: [
            "Dapat i-configure ng tindahan ang available na uri, petsa, oras, kapasidad, at deadline sa pagkansela. Tatanggap lang ang system kapag pinapayagan ng naka-configure na patakaran. Dapat suriin ng may-ari ang mga paunang tuntuning ito bago paganahin ang reservation.",
          ],
        },
      ]}
    />
  );
}
