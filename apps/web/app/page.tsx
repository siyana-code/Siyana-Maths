import Link from "next/link";

export default function HomePage() {
  return (
    <main className="site-shell">
      <nav className="site-nav" aria-label="Primary navigation">
        <Link className="brand" href="/">
          Siyana Maths
        </Link>
        <Link className="nav-link" href="/login">
          Admin sign in
        </Link>
      </nav>
      <section className="hero">
        <p className="eyebrow">O/L Mathematics · Sri Lanka</p>
        <h1>Past papers, made easier to understand.</h1>
        <p className="hero-copy">
          Read Sinhala solutions, study full marking schemes, and find the tutor&apos;s
          video discussions in one focused place.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/login">
            Open admin workspace
          </Link>
        </div>
      </section>
      <section className="feature-grid" aria-label="Platform features">
        <article className="feature-card">
          <h2>Sinhala solutions</h2>
          <p>Clear worked answers designed for O/L Mathematics students.</p>
        </article>
        <article className="feature-card">
          <h2>Full marking schemes</h2>
          <p>Understand how each mark is awarded, step by step.</p>
        </article>
        <article className="feature-card">
          <h2>Video discussions</h2>
          <p>Open the tutor&apos;s YouTube, TikTok, or Facebook discussions.</p>
        </article>
      </section>
    </main>
  );
}
