import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section container">
      <div className="form-shell">
        <span className="eyebrow">404</span>
        <h1>Page not found</h1>
        <p className="muted">
          This page may have moved or the item is not available.
        </p>
        <Link className="button" href="/">
          Return home
        </Link>
      </div>
    </section>
  );
}
