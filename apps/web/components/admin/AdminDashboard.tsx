"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DocumentIcon, EditIcon, PlusIcon, SparkIcon } from "@/components/ui/Icons";
import { Banner, EmptyState, StatusBadge } from "@/components/ui/Primitives";
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
        apiRequest<Taxonomy>("/taxonomy"),
      ]);
      setPapers(paperResponse.data);
      setTaxonomy(taxonomyResponse);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Unable to load the admin workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const draftCount = papers.filter((paper) => paper.status === "draft").length;
  const publishedCount = papers.filter((paper) => paper.status === "published").length;

  return (
    <div className="stack-xl">
      <div className="page-heading anim-fade-in">
        <div>
          <p className="eyebrow">Admin overview</p>
          <h1 className="t-headline-medium">O/L Mathematics papers</h1>
          <p className="muted" style={{ margin: 0 }}>
            Create, edit, and publish past-paper learning content.
          </p>
        </div>
        <Link className="btn btn--filled" href="/admin/papers/new" style={{ textDecoration: "none" }}>
          <PlusIcon size={18} />
          Create paper
        </Link>
      </div>

      {error ? <Banner tone="error">{error}</Banner> : null}

      {loading ? (
        <div className="stack-lg">
          <div className="skeleton" style={{ height: 84 }} />
          <div className="skeleton" style={{ height: 84 }} />
        </div>
      ) : null}

      {!loading && papers.length > 0 ? (
        <div className="row" style={{ gap: 12 }}>
          <span className="chip chip--filled">
            <DocumentIcon size={14} />
            {papers.length} total
          </span>
          <span className="chip">{draftCount} draft</span>
          <span className="chip">{publishedCount} published</span>
        </div>
      ) : null}

      {!loading && papers.length === 0 ? (
        <EmptyState
          icon={<SparkIcon size={26} />}
          title="No papers yet"
          description="Create the first O/L Mathematics paper to get started. Parts and mark rules are set up automatically."
          action={
            <Link className="btn btn--filled" href="/admin/papers/new" style={{ textDecoration: "none" }}>
              Create first paper
            </Link>
          }
        />
      ) : null}

      {!loading && papers.length > 0 ? (
        <div className="paper-list stagger">
          {papers.map((paper, index) => (
            <article className="paper-row" key={paper.id} style={{ "--i": index } as React.CSSProperties}>
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 10 }}>
                  <h2>{paper.title}</h2>
                  <StatusBadge status={paper.status} />
                </div>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.8125rem" }}>
                  {paper.exam_year?.year ?? "Year not set"} · Paper {paper.paper_number} ·{" "}
                  {paper.medium.toUpperCase()}
                  {paper.total_marks != null ? ` · ${paper.total_marks} marks` : ""}
                </p>
              </div>
              <Link
                className="btn btn--tonal"
                href={`/admin/papers/${paper.id}/edit`}
                style={{ textDecoration: "none" }}
              >
                <EditIcon size={16} />
                Edit paper
              </Link>
            </article>
          ))}
        </div>
      ) : null}

      {taxonomy ? (
        <section className="card card--elevated">
          <div className="row">
            <h2 className="t-title-medium" style={{ margin: 0 }}>Seeded reference data</h2>
          </div>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: "0.8125rem" }}>
            {taxonomy.levels.length} level · {taxonomy.subjects.length} subject ·{" "}
            {taxonomy.exam_years.length} exam year
          </p>
        </section>
      ) : null}

      <Link className="fab" href="/admin/papers/new" style={{ textDecoration: "none" }}>
        <PlusIcon size={20} />
        New paper
      </Link>
    </div>
  );
}
