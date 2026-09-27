"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { apiData, ApiError } from "@/lib/api";
import {
  AdminPaper,
  Answer,
  MarkingItem,
  PaperBundle,
  PaperPart,
  Question,
} from "@/lib/types";

type AnswerDrafts = Record<string, string>;

type MarkingDraft = {
  questionId: string;
  methodLabel: string;
  criterion: string;
  markValue: string;
  awardNote: string;
  itemType: "method" | "alternative" | "note";
};

type VideoDraft = {
  provider: "youtube" | "tiktok" | "facebook";
  url: string;
  questionId: string;
  isPrimary: boolean;
};

const emptyMarkingDraft = (questionId = ""): MarkingDraft => ({
  questionId,
  methodLabel: "",
  criterion: "",
  markValue: "",
  awardNote: "",
  itemType: "method",
});

const emptyVideoDraft = (questionId = ""): VideoDraft => ({
  provider: "youtube",
  url: "",
  questionId,
  isPrimary: false,
});

export function PaperEditor({ paperId }: { paperId: string }) {
  const [bundle, setBundle] = useState<PaperBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [metadata, setMetadata] = useState({
    title: "",
    description: "",
    paper_number: "I",
    medium: "si",
    total_marks: "",
  });
  const [answerDrafts, setAnswerDrafts] = useState<AnswerDrafts>({});
  const [questionDraft, setQuestionDraft] = useState({
    part_id: "",
    number_label: "",
    prompt_markdown: "",
    marks: "",
  });
  const [markingDraft, setMarkingDraft] = useState<MarkingDraft>(emptyMarkingDraft());
  const [videoDraft, setVideoDraft] = useState<VideoDraft>(emptyVideoDraft());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextBundle = await apiData<PaperBundle>(`/admin/papers/${paperId}`);
      setBundle(nextBundle);
      setMetadata({
        title: nextBundle.paper.title ?? "",
        description: nextBundle.paper.description ?? "",
        paper_number: nextBundle.paper.paper_number ?? "I",
        medium: nextBundle.paper.medium ?? "si",
        total_marks: nextBundle.paper.total_marks == null ? "" : String(nextBundle.paper.total_marks),
      });
      const nextAnswers: AnswerDrafts = {};
      nextBundle.questions.forEach((question) => {
        const answer = nextBundle.answers.find((item) => item.question_id === question.id);
        nextAnswers[question.id] = answer?.solution_markdown ?? "";
      });
      setAnswerDrafts(nextAnswers);
      setMarkingDraft((current) => ({
        ...current,
        questionId: current.questionId || nextBundle.questions[0]?.id || "",
      }));
      setQuestionDraft((current) => ({
        ...current,
        part_id: current.part_id || nextBundle.parts[0]?.id || "",
      }));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Unable to load this paper.");
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  useEffect(() => {
    void load();
  }, [load]);

  const answersByQuestion = useMemo(() => {
    const result: Record<string, Answer> = {};
    bundle?.answers.forEach((answer) => {
      result[answer.question_id] = answer;
    });
    return result;
  }, [bundle]);

  const markingByQuestion = useMemo(() => {
    const result: Record<string, MarkingItem[]> = {};
    bundle?.marking_scheme_items.forEach((item) => {
      result[item.question_id] = [...(result[item.question_id] ?? []), item];
    });
    return result;
  }, [bundle]);

  const partById = useMemo(() => {
    const result: Record<string, PaperPart> = {};
    bundle?.parts.forEach((part) => {
      result[part.id] = part;
    });
    return result;
  }, [bundle]);

  const questionsByPart = useMemo(() => {
    const result: Record<string, Question[]> = {};
    bundle?.questions.forEach((question) => {
      const key = question.part_id ?? "";
      result[key] = [...(result[key] ?? []), question];
    });
    return result;
  }, [bundle]);

  function partLabel(partId: string) {
    const part = partById[partId];
    return part ? `Part ${part.part_code} — ${part.title}` : "Unassigned part";
  }

  async function performAction(key: string, action: () => Promise<unknown>, message: string) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(message);
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : "The action could not be completed.");
    } finally {
      setBusy(null);
    }
  }

  async function saveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performAction(
      "metadata",
      () =>
        apiData<AdminPaper>(`/admin/papers/${paperId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: metadata.title,
            description: metadata.description || null,
            paper_number: metadata.paper_number,
            medium: metadata.medium,
            total_marks: metadata.total_marks ? Number(metadata.total_marks) : null,
          }),
        }),
      "Paper details saved.",
    );
  }

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performAction(
      "question",
      () =>
        apiData<Question>(`/admin/papers/${paperId}/questions`, {
          method: "POST",
          body: JSON.stringify({
            part_id: questionDraft.part_id,
            number_label: questionDraft.number_label,
            prompt_markdown: questionDraft.prompt_markdown,
            marks: Number(questionDraft.marks),
          }),
        }),
      "Question added.",
    );
    setQuestionDraft((current) => ({
      part_id: current.part_id,
      number_label: "",
      prompt_markdown: "",
      marks: "",
    }));
  }

  async function saveAnswer(question: Question) {
    await performAction(
      `answer-${question.id}`,
      () =>
        apiData<Answer>(`/admin/questions/${question.id}/answer`, {
          method: "PUT",
          body: JSON.stringify({
            solution_markdown: answerDrafts[question.id] ?? "",
          }),
        }),
      `Answer for question ${question.number_label} saved.`,
    );
  }

  async function addMarkingItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!markingDraft.questionId) return;
    await performAction(
      "marking",
      () =>
        apiData<MarkingItem>(`/admin/questions/${markingDraft.questionId}/marking-scheme`, {
          method: "POST",
          body: JSON.stringify({
            item_type: markingDraft.itemType,
            method_label: markingDraft.methodLabel || null,
            criterion_markdown: markingDraft.criterion,
            mark_value: Number(markingDraft.markValue),
            award_note_markdown: markingDraft.awardNote || null,
          }),
        }),
      "Marking-scheme step added.",
    );
    setMarkingDraft(emptyMarkingDraft(markingDraft.questionId));
  }

  async function addVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performAction(
      "video",
      () =>
        apiData(`/admin/papers/${paperId}/video-sources`, {
          method: "POST",
          body: JSON.stringify({
            provider: videoDraft.provider,
            original_url: videoDraft.url,
            question_id: videoDraft.questionId || null,
            is_primary: videoDraft.isPrimary,
          }),
        }),
      "Video source added.",
    );
    setVideoDraft(emptyVideoDraft(videoDraft.questionId));
  }

  async function publish() {
    await performAction(
      "publish",
      () => apiData<AdminPaper>(`/admin/papers/${paperId}/publish`, { method: "POST" }),
      "Paper published successfully.",
    );
  }

  if (loading) return <p className="muted">Loading paper editor…</p>;
  if (!bundle) {
    return (
      <div className="stack-lg">
        <p className="form-error" role="alert">{error ?? "Paper not found."}</p>
        <Link className="button button-secondary" href="/admin">Back to papers</Link>
      </div>
    );
  }

  return (
    <div className="stack-xl">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Admin · Paper editor</p>
          <h1>{bundle.paper.title}</h1>
          <p className="muted">
            {bundle.paper.status} · Paper {bundle.paper.paper_number} · {bundle.paper.medium.toUpperCase()}
          </p>
        </div>
        <div className="heading-actions">
          <Link className="button button-quiet" href="/admin">Back</Link>
          <button
            className="button button-primary"
            type="button"
            onClick={() => void publish()}
            disabled={busy === "publish" || bundle.paper.status === "published"}
          >
            {busy === "publish" ? "Publishing…" : "Publish paper"}
          </button>
        </div>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}

      <section className="editor-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2>Paper structure</h2>
          </div>
        </div>
        {bundle.parts.length === 0 ? (
          <p className="form-error" role="alert">
            This paper has no parts. Check the exam year paper number (I or II) and reload.
          </p>
        ) : (
          <div className="stack-sm">
            {bundle.parts.map((part) => {
              const added = (questionsByPart[part.id] ?? []).length;
              return (
                <div className="source-row" key={part.id}>
                  <div>
                    <strong>Part {part.part_code}</strong>
                    <span className="muted"> · {part.title}</span>
                    <p className="muted">
                      {added} / {part.question_count} questions · {part.marks_per_question} marks each ·{" "}
                      {part.selection_limit < part.question_count
                        ? `answer any ${part.selection_limit} of ${part.question_count}`
                        : "all questions answered"}{" "}
                      · part total {part.total_marks} marks
                    </p>
                  </div>
                  <span className={added === part.question_count ? "status-badge status-published" : "status-badge"}>
                    {added === part.question_count ? "Complete" : "Incomplete"}
                  </span>
                </div>
              );
            })}
            <p className="muted">
              Publishing requires every part to have all of its questions, a Sinhala answer and a complete
              marking scheme for each question, and at least one video source. Paper total must equal 100 marks.
            </p>
          </div>
        )}
      </section>

      <section className="editor-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Step 2</p>
            <h2>Paper details</h2>
          </div>
        </div>
        <form className="form-grid" onSubmit={saveMetadata}>
          <div className="field field-wide">
            <label htmlFor="edit-title">Title</label>
            <input id="edit-title" value={metadata.title} onChange={(event) => setMetadata({ ...metadata, title: event.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="edit-paper-number">Paper number</label>
            <select id="edit-paper-number" value={metadata.paper_number} onChange={(event) => setMetadata({ ...metadata, paper_number: event.target.value })} required>
              <option value="I">Paper I</option>
              <option value="II">Paper II</option>
            </select>
            <span className="field-hint">Parts are created automatically when the paper is created.</span>
          </div>
          <div className="field">
            <label htmlFor="edit-medium">Medium</label>
            <select id="edit-medium" value={metadata.medium} onChange={(event) => setMetadata({ ...metadata, medium: event.target.value })}>
              <option value="si">Sinhala</option>
              <option value="en">English</option>
              <option value="ta">Tamil</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="edit-total-marks">Total marks</label>
            <input id="edit-total-marks" type="number" min="0" step="0.5" value={metadata.total_marks} onChange={(event) => setMetadata({ ...metadata, total_marks: event.target.value })} />
          </div>
          <div className="field field-wide">
            <label htmlFor="edit-description">Description</label>
            <textarea id="edit-description" rows={3} value={metadata.description} onChange={(event) => setMetadata({ ...metadata, description: event.target.value })} />
          </div>
          <div className="form-actions">
            <button className="button button-secondary" type="submit" disabled={busy === "metadata"}>
              {busy === "metadata" ? "Saving…" : "Save details"}
            </button>
          </div>
        </form>
      </section>

      <section className="editor-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Step 3</p>
            <h2>Questions and Sinhala answers</h2>
          </div>
          <span className="count-badge">{bundle.questions.length} questions</span>
        </div>
        <div className="stack-lg">
          {bundle.parts.map((part) => {
            const partQuestions = questionsByPart[part.id] ?? [];
            return (
              <section className="part-block" key={part.id}>
                <div className="section-heading">
                  <h3>Part {part.part_code} — {part.title}</h3>
                  <span className="count-badge">
                    {partQuestions.length} / {part.question_count}
                  </span>
                </div>
                {partQuestions.length === 0 ? (
                  <p className="muted">No questions in this part yet.</p>
                ) : (
                  <div className="stack-lg">
                    {partQuestions.map((question) => (
                      <article className="question-editor" key={question.id}>
                        <div className="row-heading">
                          <h4>Question {question.number_label}</h4>
                          <span className="mark-badge">{question.marks} marks</span>
                        </div>
                        <p className="content-preview">{question.prompt_markdown}</p>
                        <label htmlFor={`answer-${question.id}`}>Sinhala solution</label>
                        <textarea
                          id={`answer-${question.id}`}
                          rows={6}
                          value={answerDrafts[question.id] ?? ""}
                          onChange={(event) => setAnswerDrafts({ ...answerDrafts, [question.id]: event.target.value })}
                          placeholder="Enter the Sinhala solution and working."
                        />
                        <div className="inline-actions">
                          <button className="button button-secondary" type="button" onClick={() => void saveAnswer(question)} disabled={busy === `answer-${question.id}`}>
                            {busy === `answer-${question.id}` ? "Saving…" : answersByQuestion[question.id] ? "Update answer" : "Save answer"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <form className="add-item-form" onSubmit={addQuestion}>
          <h3>Add a question</h3>
          <div className="form-grid">
            <div className="field field-wide">
              <label htmlFor="question-part">Part</label>
              <select id="question-part" required value={questionDraft.part_id} onChange={(event) => setQuestionDraft({ ...questionDraft, part_id: event.target.value })}>
                <option value="">Select part</option>
                {bundle.parts.map((part) => (
                  <option key={part.id} value={part.id}>
                    Part {part.part_code} — {part.title} ({part.marks_per_question} marks each)
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="question-number">Number label</label>
              <input id="question-number" required value={questionDraft.number_label} onChange={(event) => setQuestionDraft({ ...questionDraft, number_label: event.target.value })} placeholder="1(a)" />
            </div>
            <div className="field">
              <label htmlFor="question-marks">Marks</label>
              <input
                id="question-marks"
                required
                type="number"
                min="0"
                step="0.5"
                value={questionDraft.marks}
                onChange={(event) => setQuestionDraft({ ...questionDraft, marks: event.target.value })}
              />
              {questionDraft.part_id ? (
                <span className="field-hint">
                  Part {partById[questionDraft.part_id]?.part_code} requires {partById[questionDraft.part_id]?.marks_per_question} marks.
                </span>
              ) : null}
            </div>
            <div className="field field-wide">
              <label htmlFor="question-prompt">Question text/math</label>
              <textarea id="question-prompt" required rows={4} value={questionDraft.prompt_markdown} onChange={(event) => setQuestionDraft({ ...questionDraft, prompt_markdown: event.target.value })} />
            </div>
          </div>
          <button className="button button-secondary" type="submit" disabled={busy === "question" || !questionDraft.part_id}>
            {busy === "question" ? "Adding…" : "Add question"}
          </button>
        </form>
      </section>

      <section className="editor-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Step 4</p>
            <h2>Full marking scheme</h2>
          </div>
        </div>
        <div className="stack-lg">
          {bundle.questions.map((question) => {
            const items = markingByQuestion[question.id] ?? [];
            const total = items.reduce((sum, item) => sum + Number(item.mark_value), 0);
            return (
              <div className="marking-group" key={question.id}>
                <div className="row-heading">
                  <h3>Question {question.number_label}</h3>
                  <span className={total === Number(question.marks) ? "mark-badge mark-valid" : "mark-badge mark-warning"}>
                    {total} / {question.marks} marks
                  </span>
                </div>
                {items.length === 0 ? <p className="muted">No marking-scheme steps yet.</p> : null}
                {items.map((item) => (
                  <div className="marking-item" key={item.id}>
                    <strong>{item.position}. {item.method_label || item.item_type}</strong>
                    <p>{item.criterion_markdown}</p>
                    <span className="mark-badge">{item.mark_value} marks</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <form className="add-item-form" onSubmit={addMarkingItem}>
          <h3>Add a marking-scheme step</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="marking-question">Question</label>
              <select id="marking-question" required value={markingDraft.questionId} onChange={(event) => setMarkingDraft({ ...markingDraft, questionId: event.target.value })}>
                <option value="">Select question</option>
                {bundle.questions.map((question) => (
                  <option key={question.id} value={question.id}>
                    {partLabel(question.part_id)} — Question {question.number_label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="marking-type">Step type</label>
              <select id="marking-type" value={markingDraft.itemType} onChange={(event) => setMarkingDraft({ ...markingDraft, itemType: event.target.value as MarkingDraft["itemType"] })}>
                <option value="method">Method</option>
                <option value="alternative">Alternative method</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="marking-label">Method/step label</label>
              <input id="marking-label" value={markingDraft.methodLabel} onChange={(event) => setMarkingDraft({ ...markingDraft, methodLabel: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="marking-value">Marks</label>
              <input id="marking-value" required type="number" min="0" step="0.5" value={markingDraft.markValue} onChange={(event) => setMarkingDraft({ ...markingDraft, markValue: event.target.value })} />
            </div>
            <div className="field field-wide">
              <label htmlFor="marking-criterion">Award criterion</label>
              <textarea id="marking-criterion" required rows={3} value={markingDraft.criterion} onChange={(event) => setMarkingDraft({ ...markingDraft, criterion: event.target.value })} />
            </div>
            <div className="field field-wide">
              <label htmlFor="marking-note">Award note (optional)</label>
              <input id="marking-note" value={markingDraft.awardNote} onChange={(event) => setMarkingDraft({ ...markingDraft, awardNote: event.target.value })} />
            </div>
          </div>
          <button className="button button-secondary" type="submit" disabled={busy === "marking"}>{busy === "marking" ? "Adding…" : "Add marking step"}</button>
        </form>
      </section>

      <section className="editor-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Step 5</p>
            <h2>Video sources</h2>
          </div>
        </div>
        <div className="stack-sm">
          {bundle.video_sources.length === 0 ? <p className="muted">No video sources yet.</p> : null}
          {bundle.video_sources.map((source) => {
            const question = bundle.questions.find((item) => item.id === source.question_id);
            return (
              <div className="source-row" key={source.id}>
                <div>
                  <strong>{source.provider}</strong>
                  {question ? (
                    <span className="muted">
                      {" "}
                      · {partLabel(question.part_id)} — Question {question.number_label}
                    </span>
                  ) : (
                    <span className="muted"> · whole paper</span>
                  )}
                  <p className="source-url">{source.original_url}</p>
                </div>
                {source.is_primary ? <span className="status-badge status-published">Primary</span> : null}
              </div>
            );
          })}
          <p className="muted">
            Attach one video per question. Videos are being added in this order: Paper I Part A, then Paper I
            Part B, then Paper II.
          </p>
        </div>
        <form className="add-item-form" onSubmit={addVideo}>
          <h3>Add a video source</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="video-provider">Provider</label>
              <select id="video-provider" value={videoDraft.provider} onChange={(event) => setVideoDraft({ ...videoDraft, provider: event.target.value as VideoDraft["provider"] })}>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="video-question">Attach to</label>
              <select id="video-question" value={videoDraft.questionId} onChange={(event) => setVideoDraft({ ...videoDraft, questionId: event.target.value })}>
                <option value="">Whole paper</option>
                {bundle.questions.map((question) => (
                  <option key={question.id} value={question.id}>
                    {partLabel(question.part_id)} — Question {question.number_label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field field-wide">
              <label htmlFor="video-url">HTTPS video URL</label>
              <input id="video-url" required type="url" value={videoDraft.url} onChange={(event) => setVideoDraft({ ...videoDraft, url: event.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
            </div>
            <label className="checkbox-field" htmlFor="video-primary">
              <input id="video-primary" type="checkbox" checked={videoDraft.isPrimary} onChange={(event) => setVideoDraft({ ...videoDraft, isPrimary: event.target.checked })} />
              Set as primary source
            </label>
          </div>
          <button className="button button-secondary" type="submit" disabled={busy === "video"}>{busy === "video" ? "Adding…" : "Add video source"}</button>
        </form>
      </section>
    </div>
  );
}
