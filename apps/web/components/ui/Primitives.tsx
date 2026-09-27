"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ brand --- */

export function Brand({ href = "/", subtitle }: { href?: string; subtitle?: string }) {
  return (
    <Link className="brand" href={href}>
      <span className="brand-mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="M5 5h14L12 13l7 6H5" />
        </svg>
      </span>
      <span>
        Siyana Maths
        {subtitle ? (
          <span className="muted" style={{ display: "block", fontSize: "0.6875rem", fontWeight: 400 }}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------- status chip --- */

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "published" ? "published" : status === "archived" ? "archived" : "draft";
  return <span className={`badge badge--${tone}`}>{status}</span>;
}

/* ------------------------------------------------------------------- step --- */

export function StepHeading({
  step,
  title,
  description,
  action,
}: {
  step: number;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div className="step-head">
        <span className="step-badge">{step}</span>
        <div>
          <h2>{title}</h2>
          {description ? <p className="muted" style={{ margin: 0 }}>{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ meter --- */

export function Meter({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div
      className="meter"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="meter__fill" style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ empty --- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="empty-state anim-rise">
      <span className="empty-state__icon">{icon}</span>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p className="muted" style={{ maxWidth: "38ch" }}>{description}</p>
      {action}
    </section>
  );
}

/* ----------------------------------------------------------------- banner --- */

export function Banner({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  return (
    <p className={`banner banner--${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}
