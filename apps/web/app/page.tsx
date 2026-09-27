import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { BookIcon, PlayIcon, SparkIcon, TranslateIcon } from "@/components/ui/Icons";
import { Brand } from "@/components/ui/Primitives";

const features = [
  {
    icon: <TranslateIcon size={22} />,
    title: "Sinhala solutions",
    body: "Clear worked answers designed for O/L Mathematics students.",
  },
  {
    icon: <BookIcon size={22} />,
    title: "Full marking schemes",
    body: "Understand how each mark is awarded, step by step.",
  },
  {
    icon: <PlayIcon size={22} />,
    title: "Video discussions",
    body: "Open the tutor's YouTube, TikTok, or Facebook discussions.",
  },
];

export default function HomePage() {
  return (
    <div>
      <header className="top-app-bar shell">
        <Brand subtitle="O/L Mathematics" />
        <Link className="btn btn--text" href="/login">
          Admin sign in
        </Link>
      </header>

      <main className="shell">
        <section className="site-hero anim-rise">
          <p className="eyebrow">O/L Mathematics · Sri Lanka</p>
          <h1 className="t-display-medium">Past papers, made easier to understand.</h1>
          <p className="t-body-large muted" style={{ maxWidth: "56ch" }}>
            Read Sinhala solutions, study full marking schemes, and find the tutor&apos;s
            video discussions in one focused place.
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <Link className="btn btn--filled" href="/login" style={{ textDecoration: "none" }}>
              Open admin workspace
            </Link>
            <Link className="btn btn--outlined" href="/login" style={{ textDecoration: "none" }}>
              Browse papers
            </Link>
          </div>
        </section>

        <section className="feature-grid stagger" aria-label="Platform features">
          {features.map((feature, index) => (
            <article className="feature-card" key={feature.title} style={{ "--i": index } as React.CSSProperties}>
              <span className="feature-card__icon">{feature.icon}</span>
              <h2 className="t-title-large">{feature.title}</h2>
              <p>{feature.body}</p>
            </article>
          ))}
        </section>

        <section
          className="card card--filled anim-rise"
          style={{ marginTop: 40, display: "grid", gap: 8 }}
        >
          <div className="row">
            <span className="chip chip--accent">
              <SparkIcon size={14} />
              Coming next
            </span>
          </div>
          <h2 className="t-title-large" style={{ margin: 0 }}>Public paper library</h2>
          <p className="muted" style={{ margin: 0, maxWidth: "60ch" }}>
            Papers render with proper math notation, part-by-part navigation, and per-question
            video fallbacks so a missing embed still leads to the original source.
          </p>
          <div>
            <Button variant="text" disabled>
              In progress
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
