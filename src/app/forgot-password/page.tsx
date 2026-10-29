import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { T } from "@/components/language-provider";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <section className="section container">
      <div className="form-shell form-shell-narrow">
        <span className="eyebrow">
          <T en="Account recovery" fil="Pagbawi ng account" />
        </span>
        <h1>
          <T en="Forgot your password?" fil="Nakalimutan ang password?" />
        </h1>
        <p className="form-intro">
          <T
            en="Enter your account email. If it is registered, we’ll send a secure reset link."
            fil="Ilagay ang email ng account. Kung rehistrado ito, magpapadala kami ng secure na reset link."
          />
        </p>
        <ForgotPasswordForm />
      </div>
    </section>
  );
}
