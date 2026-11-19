"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resendVerificationAction,
  resetPasswordAction,
  type ActionState,
} from "@/app/actions/auth";
import { T } from "@/components/language-provider";

function PasswordField({
  name = "password",
  label = "Password",
}: {
  name?: string;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="password-control">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={
            name === "password" ? "current-password" : "new-password"
          }
          minLength={10}
          maxLength={128}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <p className="form-error" role="alert">
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p className="form-success" role="status">
        {state.success}
      </p>
    );
  return null;
}

export function RegisterForm({ next = "/account" }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="full_name">
          <T en="Full name" fil="Buong pangalan" />
        </label>
        <input
          id="full_name"
          name="full_name"
          autoComplete="name"
          minLength={2}
          maxLength={120}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="register-phone">
          <T
            en="Contact number (optional)"
            fil="Numero ng telepono (opsyonal)"
          />
        </label>
        <input
          id="register-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={32}
        />
      </div>
      <div className="field">
        <label htmlFor="register-email">
          <T en="Email address" fil="Email address" />
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </div>
      <PasswordField
        name="password"
        label="Password (at least 10 characters)"
      />
      <PasswordField name="password_confirmation" label="Confirm password" />
      <label className="check-row">
        <input type="checkbox" name="terms" required />
        <span>
          <T en="I accept the" fil="Tinatanggap ko ang" />{" "}
          <Link href="/terms">
            <T en="Terms of Service" fil="Mga tuntunin ng serbisyo" />
          </Link>
          .
        </span>
      </label>
      <label className="check-row">
        <input type="checkbox" name="privacy" required />
        <span>
          <T en="I acknowledge the" fil="Nabasa ko ang" />{" "}
          <Link href="/privacy">
            <T en="Privacy Policy" fil="Patakaran sa privacy" />
          </Link>
          .
        </span>
      </label>
      <ActionMessage state={state} />
      <button className="button form-submit" type="submit" disabled={pending}>
        {pending ? (
          <T en="Creating account…" fil="Ginagawa ang account…" />
        ) : (
          <T en="Create account" fil="Gumawa ng account" />
        )}
      </button>
      <div className="form-links">
        <span>
          <T en="Already have an account?" fil="May account ka na ba?" />{" "}
          <Link href="/login">
            <T en="Sign in" fil="Mag-log in" />
          </Link>
        </span>
      </div>
    </form>
  );
}

export function LoginForm({ next = "/account" }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="login-email">
          <T en="Email address" fil="Email address" />
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          maxLength={254}
          required
        />
      </div>
      <PasswordField />
      <div className="form-links">
        <span />
        <Link href="/forgot-password">
          <T en="Forgot password?" fil="Nakalimutan ang password?" />
        </Link>
      </div>
      <ActionMessage state={state} />
      <button className="button form-submit" type="submit" disabled={pending}>
        {pending ? (
          <T en="Signing in…" fil="Nagla-log in…" />
        ) : (
          <T en="Sign in" fil="Mag-log in" />
        )}
      </button>
      <div className="form-links">
        <span>
          <T en="New here?" fil="Bago ka rito?" />{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`}>
            <T en="Create an account" fil="Gumawa ng account" />
          </Link>
        </span>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, {});
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="reset-email">
          <T en="Email address" fil="Email address" />
        </label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <ActionMessage state={state} />
      <button className="button form-submit" type="submit" disabled={pending}>
        {pending ? (
          <T en="Sending…" fil="Ipinapadala…" />
        ) : (
          <T en="Send reset link" fil="Ipadala ang reset link" />
        )}
      </button>
      <div className="form-links">
        <Link href="/login">
          <T en="Back to sign in" fil="Bumalik sa pag-log in" />
        </Link>
      </div>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  return (
    <form action={action}>
      <PasswordField
        name="password"
        label="New password (at least 10 characters)"
      />
      <PasswordField name="confirmation" label="Confirm new password" />
      <ActionMessage state={state} />
      <button className="button form-submit" type="submit" disabled={pending}>
        {pending ? (
          <T en="Saving…" fil="Sine-save…" />
        ) : (
          <T en="Set new password" fil="Itakda ang bagong password" />
        )}
      </button>
    </form>
  );
}

export function ResendVerificationForm() {
  const [state, action, pending] = useActionState(resendVerificationAction, {});
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="verification-email">
          <T en="Email address" fil="Email address" />
        </label>
        <input
          id="verification-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <ActionMessage state={state} />
      <button className="button form-submit" type="submit" disabled={pending}>
        {pending ? (
          <T en="Sending…" fil="Ipinapadala…" />
        ) : (
          <T en="Resend verification" fil="Ipadala muli ang verification" />
        )}
      </button>
    </form>
  );
}
