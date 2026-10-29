import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";
import { T } from "@/components/language-provider";
import { safeInternalRedirect } from "@/lib/redirects";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const params = await searchParams;
  const next = safeInternalRedirect(params.next);
  return (
    <section className="section container">
      <div className="form-shell form-shell-narrow">
        <span className="eyebrow">
          <T en="Customer account" fil="Account ng customer" />
        </span>
        <h1>
          <T en="Create your account" fil="Gumawa ng account" />
        </h1>
        <p className="form-intro">
          <T
            en="Register to place orders or request a reservation. We’ll send a verification email when Supabase email delivery is configured."
            fil="Magrehistro para umorder o mag-request ng reservation. Magpapadala kami ng verification kapag naka-configure ang email."
          />
        </p>
        <RegisterForm next={next} />
        <div className="form-links">
          <Link href="/privacy">
            <T en="Privacy policy" fil="Patakaran sa privacy" />
          </Link>
        </div>
      </div>
    </section>
  );
}
