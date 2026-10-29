"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="section container">
      <div className="form-shell">
        <span className="eyebrow">Something went wrong</span>
        <h1>We could not load this page</h1>
        <p className="muted">
          Please try again. If the issue continues, contact the business.
        </p>
        <button className="button" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </section>
  );
}
