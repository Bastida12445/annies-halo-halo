import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth-forms";
import { T } from "@/components/language-provider";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  return (
    <section className="section container">
      <div className="form-shell form-shell-narrow">
        <span className="eyebrow">
          <T en="Account recovery" fil="Pagbawi ng account" />
        </span>
        <h1>
          <T en="Choose a new password" fil="Pumili ng bagong password" />
        </h1>
        {user ? (
          <>
            <p className="form-intro">
              <T
                en="Use at least 10 characters. The reset link is one-time and expires according to your Supabase Auth settings."
                fil="Gumamit ng hindi bababa sa 10 character. Isahang gamit ang reset link at mag-e-expire ayon sa Supabase Auth settings."
              />
            </p>
            <ResetPasswordForm />
          </>
        ) : (
          <div className="form-notice">
            <T
              en="Open the password reset link from your email first. If it expired, request a new link."
              fil="Buksan muna ang password reset link mula sa email. Kung nag-expire na ito, humiling ng panibagong link."
            />
          </div>
        )}
      </div>
    </section>
  );
}
