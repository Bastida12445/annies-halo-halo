import Image from "next/image";
import { QrPaymentReferenceForm } from "@/components/qr-payment-reference-form";
import { T } from "@/components/language-provider";
import { formatPhp } from "@/lib/money";
import { getPaymentQrImageUrl, getPaymentQrLabel, type QrPaymentMethod } from "@/lib/payment-qr";

export function PaymentQrInstructions({
  orderId,
  method,
  imagePath,
  amountCents,
  reference,
}: {
  orderId: string;
  method: QrPaymentMethod;
  imagePath: string | null;
  amountCents: number;
  reference: string | null;
}) {
  const wallet = getPaymentQrLabel(method);
  const imageUrl = getPaymentQrImageUrl(imagePath);

  return (
    <section className="content-card payment-qr-instructions no-print">
      <span className="eyebrow"><T en="Manual wallet payment" fil="Manwal na bayad sa wallet" /></span>
      <h2><T en={`Pay with ${wallet} QR`} fil={`Magbayad gamit ang ${wallet} QR`} /></h2>
      {imageUrl ? (
        <div className="payment-qr-layout">
          <div className="payment-qr-image-frame">
            <Image
              src={imageUrl}
              alt={`${wallet} payment QR code`}
              width={320}
              height={320}
              unoptimized
            />
          </div>
          <div className="payment-qr-copy">
            <p><T en="Scan this receive QR in your wallet app and enter the exact order total:" fil="I-scan ang receive QR sa wallet app at ilagay ang eksaktong total ng order:" /></p>
            <p className="payment-qr-total">{formatPhp(amountCents)}</p>
            <ol>
              <li><T en="Check the recipient details in your wallet before confirming." fil="Suriin ang recipient details sa wallet bago kumpirmahin." /></li>
              <li><T en="After sending, submit the transaction reference below." fil="Pagkatapos magpadala, isumite sa ibaba ang transaction reference." /></li>
              <li><T en="Payment stays pending until Annie’s staff verifies the transfer." fil="Mananatiling pending ang bayad hanggang ma-verify ng staff ng Annie’s ang transfer." /></li>
            </ol>
            <QrPaymentReferenceForm orderId={orderId} reference={reference} />
          </div>
        </div>
      ) : (
        <p className="form-notice" role="status">
          <T en="The QR image for this order is unavailable. Contact the shop before sending payment." fil="Hindi makita ang QR image para sa order na ito. Makipag-ugnayan muna sa tindahan bago magbayad." />
        </p>
      )}
    </section>
  );
}
