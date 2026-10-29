"use client";

import { useActionState } from "react";
import {
  requestProfileEmailChangeAction,
  requestProfilePasswordResetAction,
} from "@/app/actions/auth";
import { T } from "@/components/language-provider";

export function ProfileSecurity({
  email,
}: {
  email: string;
}) {
  const [emailState, changeEmail, changingEmail] = useActionState(
    requestProfileEmailChangeAction,
    {},
  );
  const [passwordState, resetPassword, resettingPassword] = useActionState(
    requestProfilePasswordResetAction,
    {},
  );

  return (
    <div className="profile-security-grid">
      <section className="content-card profile-setting-card" id="email-settings">
        <span className="eyebrow"><T en="Sign-in email" fil="Email sa pag-log in" /></span>
        <h2><T en="Email address" fil="Email address" /></h2>
        <p className="profile-current-value">{email || <T en="No email on file" fil="Walang email sa account" />}</p>
        <p className="field-help">
          <T
            en="This address is used to sign in and receive password reset links. Changing it sends a confirmation link to the new address."
            fil="Ginagamit ito sa pag-log in at pagtanggap ng password reset link. Magpapadala ng confirmation link kung babaguhin mo ito."
          />
        </p>
        <form action={changeEmail} className="profile-inline-form">
          <div className="field">
            <label htmlFor="profile-new-email"><T en="New email address" fil="Bagong email address" /></label>
            <input
              id="profile-new-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </div>
          {emailState.error && <p className="form-error" role="alert">{emailState.error}</p>}
          {emailState.success && <p className="form-success" role="status">{emailState.success}</p>}
          <button className="button button-secondary" type="submit" disabled={changingEmail}>
            {changingEmail
              ? <T en="Sending confirmation…" fil="Ipinapadala ang confirmation…" />
              : <T en="Request email change" fil="Humiling ng pagbabago ng email" />}
          </button>
        </form>
      </section>

      <section className="content-card profile-setting-card" id="password-settings">
        <span className="eyebrow"><T en="Account security" fil="Seguridad ng account" /></span>
        <h2><T en="Password" fil="Password" /></h2>
        <p>
          <T
            en="For your security, we’ll email you a one-time reset link. You can choose a new password after opening it."
            fil="Para sa seguridad, magpapadala kami ng isang beses na reset link sa email mo. Makakapili ka ng bagong password pagkatapos buksan ito."
          />
        </p>
        {passwordState.error && <p className="form-error" role="alert">{passwordState.error}</p>}
        {passwordState.success && <p className="form-success" role="status">{passwordState.success}</p>}
        <form action={resetPassword}>
          <button className="button button-secondary" type="submit" disabled={resettingPassword || !email}>
            {resettingPassword
              ? <T en="Sending secure link…" fil="Ipinapadala ang secure link…" />
              : <T en="Send password reset link" fil="Magpadala ng password reset link" />}
          </button>
        </form>
        {!email && (
          <p className="field-help">
            <T en="Add a sign-in email before requesting a password reset." fil="Magdagdag muna ng email sa pag-log in bago mag-reset ng password." />
          </p>
        )}
      </section>
    </div>
  );
}
