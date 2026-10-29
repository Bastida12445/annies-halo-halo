import type { Metadata } from "next";
import { ResendVerificationForm } from "@/components/auth-forms";
import { T } from "@/components/language-provider";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  return (
    <section className="section container">
      <div className="form-shell form-shell-narrow">
        <span className="eyebrow">
          <T en="Email verification" fil="Pag-verify ng email" />
        </span>
        <h1>
          <T en="Check your inbox" fil="Tingnan ang iyong inbox" />
        </h1>
        <p className="form-intro">
          <T
            en="Use the verification link from Supabase Auth to finish registration. If email delivery is enabled, you can request another link below."
            fil="Gamitin ang verification link mula sa Supabase Auth para tapusin ang registration. Kung enabled ang email, maaari kang humiling ulit sa ibaba."
          />
        </p>
        <ResendVerificationForm />
      </div>
    </section>
  );
}
