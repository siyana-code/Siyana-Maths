"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextInput } from "@/components/ui/Field";
import { ArrowBackIcon } from "@/components/ui/Icons";
import { Banner, StepHeading } from "@/components/ui/Primitives";
import { SpinnerIcon } from "@/components/ui/SpinnerIcon";
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
    apiRequest<Taxonomy>("/taxonomy")
      .then((response) => setTaxonomy(response))
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

  const isPaperTwo = form.paper_number === "II";

  return (
    <div className="stack-xl">
      <div className="page-heading anim-fade-in">
        <div>
          <p className="eyebrow">Admin · New content</p>
          <h1 className="t-headline-medium">Create a paper</h1>
          <p className="muted" style={{ margin: 0 }}>
            Start with the paper metadata, then add questions and solutions.
          </p>
        </div>
        <Link className="btn btn--outlined" href="/admin" style={{ textDecoration: "none" }}>
          <ArrowBackIcon size={18} />
          Cancel
        </Link>
      </div>

      {error ? <Banner tone="error">{error}</Banner> : null}

      {!taxonomy ? (
        <div className="card card--outlined row" style={{ gap: 10 }}>
          <SpinnerIcon size={18} />
          <span className="muted">Loading reference data</span>
        </div>
      ) : null}

      {taxonomy ? (
        <form className="form-section anim-rise" onSubmit={handleSubmit}>
          <StepHeading
            step={1}
            title="Paper details"
            description="Parts and mark rules are created automatically from the paper number."
          />

          <div className="form-grid">
            <TextInput
              label="Paper title"
              wide
              required
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="O/L Mathematics 2025 Paper I"
            />

            <SelectField
              label="Level"
              required
              value={form.level_id}
              placeholder="Select level"
              onChange={(event) => updateField("level_id", event.target.value)}
            >
              {taxonomy.levels.map((level) => (
                <option key={level.id} value={level.id}>{level.name_en}</option>
              ))}
            </SelectField>

            <SelectField
              label="Subject"
              required
              value={form.subject_id}
              placeholder="Select subject"
              onChange={(event) => updateField("subject_id", event.target.value)}
            >
              {taxonomy.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name_en}</option>
              ))}
            </SelectField>

            <SelectField
              label="Examination year"
              required
              value={form.exam_year_id}
              placeholder="Select year"
              onChange={(event) => updateField("exam_year_id", event.target.value)}
            >
              {taxonomy.exam_years.map((year) => (
                <option key={year.id} value={year.id}>{year.year}</option>
              ))}
            </SelectField>

            <SelectField
              label="Paper number"
              required
              value={form.paper_number}
              hint={isPaperTwo ? "Two parts of 6 questions, answer any 5" : "25 short plus 5 structured questions"}
              onChange={(event) => updateField("paper_number", event.target.value)}
            >
              <option value="I">Paper I</option>
              <option value="II">Paper II</option>
            </SelectField>

            <SelectField
              label="Medium"
              value={form.medium}
              onChange={(event) => updateField("medium", event.target.value)}
            >
              <option value="si">Sinhala</option>
              <option value="en">English</option>
              <option value="ta">Tamil</option>
            </SelectField>

            <TextInput
              label="Total marks (optional)"
              type="number"
              min="0"
              step="0.5"
              hint="Defaults to 100 for O/L papers"
              value={form.total_marks}
              onChange={(event) => updateField("total_marks", event.target.value)}
            />

            <TextAreaField
              label="Description"
              wide
              rows={4}
              value={form.description}
              onChange={(next) => updateField("description", next)}
              placeholder="What will students find in this paper?"
            />
          </div>

          <div className="row" style={{ justifyContent: "flex-end", marginTop: 4 }}>
            <Link className="btn btn--text" href="/admin" style={{ textDecoration: "none" }}>
              Cancel
            </Link>
            <Button type="submit" variant="filled" loading={submitting}>
              {submitting ? "Creating" : "Create draft paper"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
