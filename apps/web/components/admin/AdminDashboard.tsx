"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { apiRequest, ApiError } from "@/lib/api";
import { AdminPaperSummary, PaperListResponse, Taxonomy } from "@/lib/types";

export function AdminDashboard() {
  const [papers, setPapers] = useState<AdminPaperSummary[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [paperResponse, taxonomyResponse] = await Promise.all([
        apiRequest<PaperListResponse>("/admin/papers?page_size=50"),
        apiRequest<{ data: Taxonomy }>("/taxonomy"),
      ]);
      setPapers(paperResponse.data);
      setTaxonomy(taxonomyResponse.data);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Unable to load the admin workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="stack-xl">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin overview</p>
          <h1>O/L Mathematics papers</h1>
          <p className="muted">Create, edit, and publish past-paper learning content.</p>
        </div>
        <Link className="button button-primary" href="/admin/papers/new">Create paper</Link>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {loading ? <p className="muted">Loading papers…</p> : null}

      {!loading && papers.length === 0 ? (
        <section className="empty-state">
          <h2>No papers yet</h2>
          <p>Create the first latest O/L Mathematics paper to get started.</p>
          <Link className="button button-primary" href="/admin/papers/new">Create first paper</Link>
        </section>
      ) : null}

      {!loading && papers.length > 0 ? (
        <div className="paper-list">
          {papers.map((paper) => (
            <article className="paper-row" key={paper.id}>
              <div>
                <div className="row-heading">
                  <h2>{paper.title}</h2>
                  <span className={`status-badge status-${paper.status}`}>{paper.status}</span>
                </div>
                <p className="muted">
                  {paper.exam_year?.year ?? "Year not set"} · Paper {paper.paper_number} · {paper.medium.toUpperCase()}
                </p>
              </div>
              <Link className="button button-secondary" href={`/admin/papers/${paper.id}/edit`}>
                Edit paper
              </Link>
            </article>
          ))}
        </div>
      ) : null}

      {taxonomy ? (
        <section className="reference-card">
          <h2>Seeded reference data</h2>
          <p className="muted">
            {taxonomy.levels.length} level · {taxonomy.subjects.length} subject · {taxonomy.exam_years.length} exam year
          </p>
        </section>
      ) : null}
    </div>
  );
}
