"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiData, apiRequest, ApiError } from "@/lib/api";
import { AdminPaper, Taxonomy } from "@/lib/types";

export function NewPaperForm() {
  const router = useRouter();
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [form, setForm] = useState({
    title: "",
    level_id: "",
    subject_id: "",
    exam_year_id: "",
    paper_number: "I",
    medium: "si",
    description: "",
    total_marks: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<{ data: Taxonomy }>("/taxonomy")
      .then((response) => setTaxonomy(response.data))
      .catch((loadError) =>
        setError(loadError instanceof ApiError ? loadError.message : "Unable to load reference data."),
      );
  }, []);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const paper = await apiData<AdminPaper>("/admin/papers", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          total_marks: form.total_marks ? Number(form.total_marks) : null,
        }),
      });
      router.push(`/admin/papers/${paper.id}/edit`);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Unable to create the paper.");
      setSubmitting(false);
    }
  }

  return (
    <div className="stack-xl">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin · New content</p>
          <h1>Create a paper</h1>
          <p className="muted">Start with the paper metadata, then add questions and solutions.</p>
        </div>
        <Link className="button button-quiet" href="/admin">Cancel</Link>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {!taxonomy ? <p className="muted">Loading reference data…</p> : null}

      {taxonomy ? (
        <form className="editor-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field field-wide">
              <label htmlFor="title">Paper title</label>
              <input
                id="title"
                required
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="O/L Mathematics 2025 Paper I"
              />
            </div>
            <div className="field">
              <label htmlFor="level">Level</label>
              <select
                id="level"
                required
                value={form.level_id}
                onChange={(event) => updateField("level_id", event.target.value)}
              >
                <option value="">Select level</option>
                {taxonomy.levels.map((level) => (
                  <option key={level.id} value={level.id}>{level.name_en}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="subject">Subject</label>
              <select
                id="subject"
                required
                value={form.subject_id}
                onChange={(event) => updateField("subject_id", event.target.value)}
              >
                <option value="">Select subject</option>
                {taxonomy.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name_en}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="exam-year">Examination year</label>
              <select
                id="exam-year"
                required
                value={form.exam_year_id}
                onChange={(event) => updateField("exam_year_id", event.target.value)}
              >
                <option value="">Select year</option>
                {taxonomy.exam_years.map((year) => (
                  <option key={year.id} value={year.id}>{year.year}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="paper-number">Paper number</label>
              <input
                id="paper-number"
                required
                value={form.paper_number}
                onChange={(event) => updateField("paper_number", event.target.value)}
                placeholder="I"
              />
            </div>
            <div className="field">
              <label htmlFor="medium">Medium</label>
              <select
                id="medium"
                value={form.medium}
                onChange={(event) => updateField("medium", event.target.value)}
              >
                <option value="si">Sinhala</option>
                <option value="en">English</option>
                <option value="ta">Tamil</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="total-marks">Total marks (optional)</label>
              <input
                id="total-marks"
                type="number"
                min="0"
                step="0.5"
                value={form.total_marks}
                onChange={(event) => updateField("total_marks", event.target.value)}
              />
            </div>
            <div className="field field-wide">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="What will students find in this paper?"
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create draft paper"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
