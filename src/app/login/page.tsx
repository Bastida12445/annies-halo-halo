import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";
import { T } from "@/components/language-provider";
import { safeInternalRedirect } from "@/lib/redirects";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeInternalRedirect(params.next);
  return (
    <section className="section container">
      <div className="form-shell form-shell-narrow">
        <span className="eyebrow">
          <T en="Welcome back" fil="Maligayang pagbabalik" />
        </span>
        <h1>
          <T en="Sign in" fil="Mag-log in" />
        </h1>
        <p className="form-intro">
          <T
            en="Sign in to manage your orders, reservations, and account."
            fil="Mag-log in para pamahalaan ang mga order, reservation, at account."
          />
        </p>
        {params.reset === "success" && (
          <p className="form-success" role="status">
            <T
              en="Your password was updated. You can sign in now."
              fil="Na-update na ang password. Maaari ka nang mag-log in."
            />
          </p>
        )}
        <LoginForm next={next} />
      </div>
    </section>
  );
}
