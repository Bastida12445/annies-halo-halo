import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <section className="section container">
      <div className="form-shell">
        <span className="eyebrow">Account access</span>
        <h1>Staff access required</h1>
        <p className="muted">
          This page is available to authorized Annie’s Halo Halo staff accounts.
        </p>
        <Link className="button" href="/account">
          Return to your account
        </Link>
      </div>
    </section>
  );
}
