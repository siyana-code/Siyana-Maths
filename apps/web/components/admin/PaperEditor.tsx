"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Checkbox, LabelledTextArea, SelectField, TextAreaField, TextInput } from "@/components/ui/Field";
import {
  ArrowBackIcon,
  CheckIcon,
  CloseIcon,
  LinkIcon,
  PlayIcon,
  PlusIcon,
  SaveIcon,
  VideoIcon,
} from "@/components/ui/Icons";
import { Banner, Meter, StatusBadge, StepHeading } from "@/components/ui/Primitives";
import { SpinnerIcon } from "@/components/ui/SpinnerIcon";
import { useSnackbar } from "@/components/ui/Snackbar";
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

type ReadinessCheck = { label: string; ok: boolean; detail?: string };

export function PaperEditor({ paperId }: { paperId: string }) {
  const { show } = useSnackbar();
  const [bundle, setBundle] = useState<PaperBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
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
      setFatalError(null);
    } catch (loadError) {
      setFatalError(loadError instanceof ApiError ? loadError.message : "Unable to load this paper.");
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

  function questionLabel(question: Question) {
    return `Part ${partById[question.part_id]?.part_code ?? "?"} · Q${question.number_label}`;
  }

  /* Mirrors the server-side publish validation so the dialog can show real state. */
  const readiness = useMemo<ReadinessCheck[]>(() => {
    if (!bundle) return [];
    const parts = bundle.parts;
    const questions = bundle.questions;
    const answers = new Set(bundle.answers.map((answer) => answer.question_id));

    const schemeByQuestion = new Map<string, number>();
    for (const item of bundle.marking_scheme_items) {
      if (item.is_alternative || item.item_type === "alternative") continue;
      schemeByQuestion.set(
        item.question_id,
        (schemeByQuestion.get(item.question_id) ?? 0) + Number(item.mark_value),
      );
    }

    const partTotal = parts.reduce((sum, part) => sum + Number(part.total_marks), 0);
    const incomplete = parts.filter(
      (part) => (questionsByPart[part.id] ?? []).length !== part.question_count,
    );
    const missingAnswers = questions.filter((question) => !answers.has(question.id));
    const badSchemes = questions.filter(
      (question) => (schemeByQuestion.get(question.id) ?? 0) !== Number(question.marks),
    );
    const mismatchedMarks = parts.flatMap((part) =>
      (questionsByPart[part.id] ?? []).filter(
        (question) => Number(question.marks) !== Number(part.marks_per_question),
      ),
    );

    return [
      {
        label: "Both parts have all their questions",
        ok: parts.length === 2 && incomplete.length === 0,
        detail: incomplete.length
          ? `Missing questions in ${incomplete.map((part) => `Part ${part.part_code}`).join(", ")}`
          : undefined,
      },
      {
        label: "Every question has a Sinhala answer",
        ok: questions.length > 0 && missingAnswers.length === 0,
        detail: missingAnswers.length ? `${missingAnswers.length} question(s) still need an answer` : undefined,
      },
      {
        label: "Marking schemes add up to the question marks",
        ok: questions.length > 0 && badSchemes.length === 0,
        detail: badSchemes.length ? `${badSchemes.length} question(s) do not match` : undefined,
      },
      {
        label: "Question marks match the part rule",
        ok: mismatchedMarks.length === 0,
        detail: mismatchedMarks.length ? `${mismatchedMarks.length} question(s) use the wrong mark value` : undefined,
      },
      {
        label: "At least one video source",
        ok: bundle.video_sources.length > 0,
      },
      {
        label: "Paper total is 100 marks",
        ok: partTotal === 100,
        detail: partTotal === 100 ? undefined : `Parts total ${partTotal}`,
      },
    ];
  }, [bundle, questionsByPart]);

  const readyToPublish = readiness.every((check) => check.ok) && bundle?.paper.status !== "published";

  async function performAction(key: string, action: () => Promise<unknown>, message: string) {
    setBusy(key);
    try {
      await action();
      await load();
      show(message, "success");
    } catch (actionError) {
      show(
        actionError instanceof ApiError ? actionError.message : "The action could not be completed.",
        "error",
      );
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
    const part = partById[questionDraft.part_id];
    if (!part) return;
    const position = (questionsByPart[part.id] ?? []).length + 1;
    await performAction(
      "question",
      () =>
        apiData<Question>(`/admin/papers/${paperId}/questions`, {
          method: "POST",
          body: JSON.stringify({
            part_id: part.id,
            number_label: questionDraft.number_label,
            prompt_markdown: questionDraft.prompt_markdown,
            marks: Number(questionDraft.marks),
          }),
        }),
      `Added Part ${part.part_code} question ${position}.`,
    );
    setQuestionDraft((current) => ({
      part_id: current.part_id,
      number_label: "",
      prompt_markdown: "",
      marks: String(part.marks_per_question),
    }));
  }

  async function saveAnswer(question: Question) {
    await performAction(
      `answer-${question.id}`,
      () =>
        apiData<Answer>(`/admin/questions/${question.id}/answer`, {
          method: "PUT",
          body: JSON.stringify({ solution_markdown: answerDrafts[question.id] ?? "" }),
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
    setPublishing(true);
    try {
      await apiData<AdminPaper>(`/admin/papers/${paperId}/publish`, { method: "POST" });
      await load();
      setPublishOpen(false);
      show("Paper published. It is now visible to students.", "success");
    } catch (publishError) {
      show(
        publishError instanceof ApiError ? publishError.message : "The paper could not be published.",
        "error",
      );
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="stack-lg">
        <div className="skeleton" style={{ height: 40, width: "40%" }} />
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="stack-lg">
        <Banner tone="error">{fatalError ?? "Paper not found."}</Banner>
        <Link className="btn btn--outlined" href="/admin" style={{ textDecoration: "none" }}>
          <ArrowBackIcon size={18} />
          Back to papers
        </Link>
      </div>
    );
  }

  const isPublished = bundle.paper.status === "published";

  return (
    <div className="stack-xl">
      <div className="page-heading anim-fade-in">
        <div>
          <p className="eyebrow">Admin · Paper editor</p>
          <div className="row" style={{ gap: 12 }}>
            <h1 className="t-headline-medium" style={{ margin: 0 }}>{bundle.paper.title}</h1>
            <StatusBadge status={bundle.paper.status} />
          </div>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Paper {bundle.paper.paper_number} · {bundle.paper.medium.toUpperCase()} ·{" "}
            {bundle.paper.total_marks ?? "—"} marks
          </p>
        </div>
        <div className="row">
          <Link className="btn btn--outlined" href="/admin" style={{ textDecoration: "none" }}>
            <ArrowBackIcon size={18} />
            Back
          </Link>
          <Button
            variant="filled"
            icon={<PlayIcon size={16} />}
            onClick={() => setPublishOpen(true)}
            disabled={isPublished}
          >
            {isPublished ? "Published" : "Publish paper"}
          </Button>
        </div>
      </div>

      {fatalError ? <Banner tone="error">{fatalError}</Banner> : null}

      {/* Step 1 — structure overview */}
      <section className="form-section anim-rise">
        <StepHeading
          step={1}
          title="Paper structure"
          description="Set automatically from the paper number. Progress updates as you add questions."
        />

        {bundle.parts.length === 0 ? (
          <Banner tone="error">
            This paper has no parts. Check the paper number is I or II, then reload.
          </Banner>
        ) : (
          <div className="stack-md">
            {bundle.parts.map((part) => {
              const added = (questionsByPart[part.id] ?? []).length;
              const complete = added === part.question_count;
              return (
                <div className="part-block" key={part.id}>
                  <div className="row-between">
                    <div>
                      <div className="row" style={{ gap: 10 }}>
                        <span className="t-title-medium">Part {part.part_code}</span>
                        <span className="badge badge--neutral">{part.part_type}</span>
                      </div>
                      <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.8125rem" }}>
                        {part.marks_per_question} marks each · part total {part.total_marks} marks ·{" "}
                        {part.selection_limit < part.question_count
                          ? `answer any ${part.selection_limit} of ${part.question_count}`
                          : "answer all questions"}
                      </p>
                    </div>
                    <span className={`badge ${complete ? "badge--valid" : "badge--warning"}`}>
                      {added} / {part.question_count}
                    </span>
                  </div>
                  <Meter value={added} max={part.question_count} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 2 — metadata */}
      <section className="form-section anim-rise">
        <StepHeading step={2} title="Paper details" description="Title, description, and display metadata." />

        <form onSubmit={saveMetadata}>
          <div className="form-grid">
            <TextInput
              label="Title"
              wide
              required
              value={metadata.title}
              onChange={(event) => setMetadata({ ...metadata, title: event.target.value })}
            />

            <SelectField
              label="Paper number"
              required
              value={metadata.paper_number}
              hint="Parts are created when the paper is created and are not changed here."
              onChange={(event) => setMetadata({ ...metadata, paper_number: event.target.value })}
            >
              <option value="I">Paper I</option>
              <option value="II">Paper II</option>
            </SelectField>

            <SelectField
              label="Medium"
              value={metadata.medium}
              onChange={(event) => setMetadata({ ...metadata, medium: event.target.value })}
            >
              <option value="si">Sinhala</option>
              <option value="en">English</option>
              <option value="ta">Tamil</option>
            </SelectField>

            <TextInput
              label="Total marks"
              type="number"
              min="0"
              step="0.5"
              hint="Publishing recalculates this from the parts."
              value={metadata.total_marks}
              onChange={(event) => setMetadata({ ...metadata, total_marks: event.target.value })}
            />

            <TextAreaField
              label="Description"
              wide
              rows={3}
              value={metadata.description}
              onChange={(next) => setMetadata({ ...metadata, description: next })}
            />
          </div>

          <div className="row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
            <Button
              type="submit"
              variant="tonal"
              icon={<SaveIcon size={16} />}
              loading={busy === "metadata"}
            >
              {busy === "metadata" ? "Saving" : "Save details"}
            </Button>
          </div>
        </form>
      </section>

      {/* Step 3 — questions and answers */}
      <section className="form-section anim-rise">
        <StepHeading
          step={3}
          title="Questions and Sinhala answers"
          description="Add each question to its part, then write the worked Sinhala solution."
          action={<span className="badge badge--accent">{bundle.questions.length} questions</span>}
        />

        <div className="stack-lg">
          {bundle.parts.map((part) => {
            const partQuestions = questionsByPart[part.id] ?? [];
            return (
              <div className="part-block" key={part.id}>
                <div className="row-between">
                  <h3 className="t-title-medium" style={{ margin: 0 }}>
                    Part {part.part_code} — {part.title}
                  </h3>
                  <span className={`badge ${partQuestions.length === part.question_count ? "badge--valid" : "badge--warning"}`}>
                    {partQuestions.length} / {part.question_count}
                  </span>
                </div>

                {partQuestions.length === 0 ? (
                  <p className="muted" style={{ margin: 0 }}>No questions in this part yet.</p>
                ) : (
                  <div className="stack-md">
                    {partQuestions.map((question) => {
                      const hasAnswer = Boolean(answersByQuestion[question.id]);
                      return (
                        <article className="question-editor" key={question.id}>
                          <div className="row-between">
                            <h4 className="t-title-small" style={{ margin: 0 }}>
                              Question {question.number_label}
                            </h4>
                            <div className="row" style={{ gap: 8 }}>
                              {hasAnswer ? (
                                <span className="badge badge--valid">
                                  <CheckIcon size={12} />
                                  Answered
                                </span>
                              ) : (
                                <span className="badge badge--warning">No answer</span>
                              )}
                              <span className="badge badge--neutral">{question.marks} marks</span>
                            </div>
                          </div>

                          <p className="content-preview">{question.prompt_markdown}</p>

                          <LabelledTextArea
                            id={`answer-${question.id}`}
                            label="Sinhala solution"
                            value={answerDrafts[question.id] ?? ""}
                            onChange={(next) =>
                              setAnswerDrafts((current) => ({ ...current, [question.id]: next }))
                            }
                            placeholder="Enter the Sinhala solution and working."
                          />

                          <div className="row">
                            <Button
                              variant="tonal"
                              size="sm"
                              onClick={() => void saveAnswer(question)}
                              loading={busy === `answer-${question.id}`}
                            >
                              {busy === `answer-${question.id}`
                                ? "Saving"
                                : hasAnswer
                                  ? "Update answer"
                                  : "Save answer"}
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form className="card card--outlined" onSubmit={addQuestion}>
          <h3 className="t-title-medium">Add a question</h3>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <SelectField
              label="Part"
              wide
              required
              value={questionDraft.part_id}
              placeholder="Select part"
              onChange={(event) => {
                const next = partById[event.target.value];
                setQuestionDraft((current) => ({
                  ...current,
                  part_id: event.target.value,
                  marks: next ? String(next.marks_per_question) : current.marks,
                }));
              }}
            >
              {bundle.parts.map((part) => (
                <option key={part.id} value={part.id}>
                  Part {part.part_code} — {part.title}
                </option>
              ))}
            </SelectField>

            <TextInput
              label="Number label"
              required
              value={questionDraft.number_label}
              onChange={(event) => setQuestionDraft({ ...questionDraft, number_label: event.target.value })}
              placeholder="1(a)"
            />

            <TextInput
              label="Marks"
              type="number"
              min="0"
              step="0.5"
              required
              value={questionDraft.marks}
              hint={
                questionDraft.part_id
                  ? `Part ${partById[questionDraft.part_id]?.part_code} requires ${partById[questionDraft.part_id]?.marks_per_question} marks.`
                  : "Choose a part first."
              }
              onChange={(event) => setQuestionDraft({ ...questionDraft, marks: event.target.value })}
            />

            <TextAreaField
              label="Question text or math"
              wide
              rows={4}
              required
              value={questionDraft.prompt_markdown}
              onChange={(next) => setQuestionDraft({ ...questionDraft, prompt_markdown: next })}
            />
          </div>

          <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
            <Button
              type="submit"
              variant="filled"
              icon={<PlusIcon size={16} />}
              loading={busy === "question"}
              disabled={!questionDraft.part_id}
            >
              {busy === "question" ? "Adding" : "Add question"}
            </Button>
          </div>
        </form>
      </section>

      {/* Step 4 — marking scheme */}
      <section className="form-section anim-rise">
        <StepHeading
          step={4}
          title="Full marking scheme"
          description="Break each answer into steps so the total matches the question marks."
          action={<span className="badge badge--accent">{bundle.marking_scheme_items.length} steps</span>}
        />

        {bundle.questions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Add questions first.</p>
        ) : (
          <div className="stack-md">
            {bundle.questions.map((question) => {
              const items = markingByQuestion[question.id] ?? [];
              const total = items
                .filter((item) => !item.is_alternative && item.item_type !== "alternative")
                .reduce((sum, item) => sum + Number(item.mark_value), 0);
              const matches = total === Number(question.marks);
              return (
                <div className="marking-group" key={question.id}>
                  <div className="row-between">
                    <h4 className="t-title-small" style={{ margin: 0 }}>
                      {questionLabel(question)}
                    </h4>
                    <span className={`badge ${matches ? "badge--valid" : "badge--warning"}`}>
                      {total} / {question.marks} marks
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <p className="muted" style={{ margin: 0 }}>No marking-scheme steps yet.</p>
                  ) : (
                    <div className="stack-sm">
                      {items.map((item) => (
                        <div className="marking-item" key={item.id}>
                          <div className="row" style={{ gap: 8 }}>
                            <strong className="t-label-medium">{item.position}.</strong>
                            <span className="t-label-medium">
                              {item.method_label || item.item_type}
                            </span>
                            <span className="badge badge--neutral">{item.mark_value} marks</span>
                          </div>
                          <p>{item.criterion_markdown}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <form className="card card--outlined" onSubmit={addMarkingItem}>
          <h3 className="t-title-medium">Add a marking-scheme step</h3>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <SelectField
              label="Question"
              wide
              required
              value={markingDraft.questionId}
              placeholder="Select question"
              onChange={(event) => setMarkingDraft({ ...markingDraft, questionId: event.target.value })}
            >
              {bundle.questions.map((question) => (
                <option key={question.id} value={question.id}>{questionLabel(question)}</option>
              ))}
            </SelectField>

            <SelectField
              label="Step type"
              value={markingDraft.itemType}
              onChange={(event) =>
                setMarkingDraft({ ...markingDraft, itemType: event.target.value as MarkingDraft["itemType"] })
              }
            >
              <option value="method">Method</option>
              <option value="alternative">Alternative method</option>
              <option value="note">Note</option>
            </SelectField>

            <TextInput
              label="Method or step label"
              value={markingDraft.methodLabel}
              onChange={(event) => setMarkingDraft({ ...markingDraft, methodLabel: event.target.value })}
            />

            <TextInput
              label="Marks"
              type="number"
              min="0"
              step="0.5"
              required
              value={markingDraft.markValue}
              onChange={(event) => setMarkingDraft({ ...markingDraft, markValue: event.target.value })}
            />

            <TextAreaField
              label="Award criterion"
              wide
              rows={3}
              required
              value={markingDraft.criterion}
              onChange={(next) => setMarkingDraft({ ...markingDraft, criterion: next })}
            />

            <TextInput
              label="Award note (optional)"
              wide
              value={markingDraft.awardNote}
              onChange={(event) => setMarkingDraft({ ...markingDraft, awardNote: event.target.value })}
            />
          </div>

          <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
            <Button
              type="submit"
              variant="filled"
              icon={<PlusIcon size={16} />}
              loading={busy === "marking"}
              disabled={!markingDraft.questionId}
            >
              {busy === "marking" ? "Adding" : "Add marking step"}
            </Button>
          </div>
        </form>
      </section>

      {/* Step 5 — videos */}
      <section className="form-section anim-rise">
        <StepHeading
          step={5}
          title="Video sources"
          description="Attach one video per question. Embeds fall back to the original link."
          action={
            <span className="badge badge--accent">
              <VideoIcon size={13} />
              {bundle.video_sources.length}
            </span>
          }
        />

        <div className="stack-sm">
          {bundle.video_sources.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No video sources yet.</p>
          ) : (
            bundle.video_sources.map((source) => {
              const question = bundle.questions.find((item) => item.id === source.question_id);
              return (
                <div className="source-row" key={source.id}>
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="chip chip--filled">{source.provider}</span>
                      {question ? (
                        <span className="muted t-body-small">{questionLabel(question)}</span>
                      ) : (
                        <span className="muted t-body-small">Whole paper</span>
                      )}
                      {source.is_primary ? <span className="badge badge--accent">Primary</span> : null}
                    </div>
                    <p className="source-url">{source.original_url}</p>
                  </div>
                  <a
                    className="btn btn--text btn--sm"
                    href={source.original_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ textDecoration: "none" }}
                  >
                    <LinkIcon size={15} />
                    Open
                  </a>
                </div>
              );
            })
          )}

          <p className="muted t-body-small" style={{ margin: 0 }}>
            Release order: Paper I Part A, then Paper I Part B, then Paper II.
          </p>
        </div>

        <form className="card card--outlined" onSubmit={addVideo}>
          <h3 className="t-title-medium">Add a video source</h3>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <SelectField
              label="Provider"
              value={videoDraft.provider}
              onChange={(event) =>
                setVideoDraft({ ...videoDraft, provider: event.target.value as VideoDraft["provider"] })
              }
            >
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
            </SelectField>

            <SelectField
              label="Attach to"
              value={videoDraft.questionId}
              placeholder="Whole paper"
              onChange={(event) => setVideoDraft({ ...videoDraft, questionId: event.target.value })}
            >
              {bundle.questions.map((question) => (
                <option key={question.id} value={question.id}>{questionLabel(question)}</option>
              ))}
            </SelectField>

            <TextInput
              label="HTTPS video URL"
              type="url"
              wide
              required
              value={videoDraft.url}
              onChange={(event) => setVideoDraft({ ...videoDraft, url: event.target.value })}
              placeholder="https://www.youtube.com/watch?v=…"
            />

            <div className="field--wide">
              <Checkbox
                label="Set as the primary source"
                checked={videoDraft.isPrimary}
                onChange={(event) => setVideoDraft({ ...videoDraft, isPrimary: event.target.checked })}
              />
            </div>
          </div>

          <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
            <Button
              type="submit"
              variant="filled"
              icon={<VideoIcon size={16} />}
              loading={busy === "video"}
            >
              {busy === "video" ? "Adding" : "Add video source"}
            </Button>
          </div>
        </form>
      </section>

      {/* Publish dialog */}
      <Dialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title={readyToPublish ? "Publish this paper?" : "Paper is not ready yet"}
        tone={readyToPublish ? "success" : "default"}
        confirmLabel={readyToPublish ? "Publish now" : "Try anyway"}
        cancelLabel="Keep editing"
        confirmLoading={publishing}
        onConfirm={() => void publish()}
      >
        <p style={{ marginTop: 0 }}>
          {readyToPublish
            ? "The paper becomes visible to students immediately. You can keep editing and re-publish content afterwards."
            : "Fix these before the paper can be published:"}
        </p>
        <ul>
          {readiness.map((check) => (
            <li key={check.label}>
              <span
                style={{
                  color: check.ok ? "var(--md-success)" : "var(--md-warning)",
                  marginTop: 2,
                }}
              >
                {check.ok ? <CheckIcon size={16} /> : <CloseIcon size={16} />}
              </span>
              <span>
                {check.label}
                {check.detail ? (
                  <span className="muted" style={{ display: "block" }}>
                    {check.detail}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {!readyToPublish ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            You can still try: the server performs the same checks and will explain what is missing.
          </p>
        ) : null}
      </Dialog>

      {busy ? (
        <p className="row muted" style={{ gap: 8, justifyContent: "center" }}>
          <SpinnerIcon size={16} />
          Working
        </p>
      ) : null}
    </div>
  );
}
