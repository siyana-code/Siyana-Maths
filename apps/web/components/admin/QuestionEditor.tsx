"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ImageUploader, MediaGallery } from "@/components/admin/ImageUploader";
import { Button } from "@/components/ui/Button";
import { SelectField, TextInput } from "@/components/ui/Field";
import {
  ArrowBackIcon,
  CheckIcon,
  FunctionIcon,
  SaveIcon,
  VideoIcon,
} from "@/components/ui/Icons";
import { Banner, Meter, StepHeading } from "@/components/ui/Primitives";
import { SpinnerIcon } from "@/components/ui/SpinnerIcon";
import { useSnackbar } from "@/components/ui/Snackbar";
import { apiData, ApiError } from "@/lib/api";
import type { Answer, MarkingItem, MediaAsset, PaperBundle, PaperPart, Question } from "@/lib/types";

// KaTeX and the palette are heavy, so they load only when the helper is opened.
const MathEditor = dynamic(
  () => import("@/components/ui/math/MathEditor").then((mod) => mod.MathEditor),
  { ssr: false },
);

const Math = dynamic(() => import("@/components/ui/math/Math").then((mod) => mod.Math), {
  ssr: false,
});

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
  isPrimary: boolean;
};

const emptyMarking = (questionId = ""): MarkingDraft => ({
  questionId,
  methodLabel: "",
  criterion: "",
  markValue: "",
  awardNote: "",
  itemType: "method",
});

/**
 * One screen for a single question: the prompt, its Sinhala answer, images,
 * marking-scheme steps, and its video. Creating and editing both live here so
 * the author never has to jump between sections.
 */
export function QuestionEditor({ paperId, questionId }: { paperId: string; questionId?: string }) {
  const router = useRouter();
  const { show } = useSnackbar();
  const isNew = !questionId;

  const [bundle, setBundle] = useState<PaperBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [partId, setPartId] = useState("");
  const [numberLabel, setNumberLabel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [createdQuestionId, setCreatedQuestionId] = useState<string | undefined>(questionId);
  const [answerId, setAnswerId] = useState<string | undefined>();

  const [marking, setMarking] = useState<MarkingDraft>(emptyMarking(questionId ?? ""));
  const [video, setVideo] = useState<VideoDraft>({ provider: "youtube", url: "", isPrimary: false });
  const [mathFor, setMathFor] = useState<"prompt" | "answer" | null>(null);

  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const answerRef = useRef<HTMLTextAreaElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await apiData<PaperBundle>(`/admin/papers/${paperId}`);
      setBundle(next);
      const existing = questionId
        ? next.questions.find((question) => question.id === questionId)
        : undefined;
      const answer = existing
        ? next.answers.find((item) => item.question_id === existing.id)
        : undefined;

      if (existing) {
        setPartId(existing.part_id);
        setNumberLabel(existing.number_label);
        setPrompt(existing.prompt_markdown);
        setAnswerId(answer?.id);
        setMarking((current) => ({ ...current, questionId: existing.id }));
      } else {
        setPartId(next.parts[0]?.id ?? "");
        setNumberLabel(String((next.parts[0] ? countInPart(next, next.parts[0]) : 0) + 1));
      }
      setAnswerText(answer?.solution_markdown ?? "");
      setFatalError(null);
    } catch (error) {
      setFatalError(error instanceof ApiError ? error.message : "Unable to load this paper.");
    } finally {
      setLoading(false);
    }
  }, [paperId, questionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const part = useMemo(
    () => bundle?.parts.find((item) => item.id === partId) ?? null,
    [bundle, partId],
  );
  const marks = part ? Number(part.marks_per_question) : 0;

  const mediaFor = useCallback(
    (target: "question" | "answer"): MediaAsset[] => {
      if (!bundle) return [];
      return bundle.media_assets.filter((asset) =>
        target === "question"
          ? asset.question_id === createdQuestionId
          : asset.answer_id === answerId,
      );
    },
    [bundle, createdQuestionId, answerId],
  );

  const markingItems: MarkingItem[] = useMemo(() => {
    if (!bundle || !createdQuestionId) return [];
    return bundle.marking_scheme_items.filter((item) => item.question_id === createdQuestionId);
  }, [bundle, createdQuestionId]);

  const schemeTotal = markingItems
    .filter((item) => !item.is_alternative && item.item_type !== "alternative")
    .reduce((sum, item) => sum + Number(item.mark_value), 0);

  const progress = [
    { label: "Question text", done: prompt.trim().length > 0 },
    { label: "Sinhala answer", done: answerText.trim().length > 0 },
    {
      label: "Marking scheme complete",
      done: markingItems.length > 0 && schemeTotal === marks,
    },
    { label: "Video attached", done: video.url.trim().length > 0 || hasExistingVideo(bundle, createdQuestionId) },
  ];
  const complete = progress.every((item) => item.done);

  /** Creates the question on first save, then updates the answer afterwards. */
  async function save() {
    if (!part) return;
    setSaving(true);
    try {
      let targetQuestionId = createdQuestionId;

      if (!targetQuestionId) {
        const created = await apiData<Question & { answer?: Answer }>(
          `/admin/papers/${paperId}/questions`,
          {
            method: "POST",
            body: JSON.stringify({
              part_id: part.id,
              number_label: numberLabel || "1",
              prompt_markdown: prompt,
              marks,
              answer_markdown: answerText || undefined,
            }),
          },
        );
        targetQuestionId = created.id;
        setCreatedQuestionId(created.id);
        if (created.answer) setAnswerId(created.answer.id);
        setMarking((current) => ({ ...current, questionId: created.id }));
      } else if (answerText.trim()) {
        const answer = await apiData<Answer>(`/admin/questions/${targetQuestionId}/answer`, {
          method: "PUT",
          body: JSON.stringify({ solution_markdown: answerText }),
        });
        setAnswerId(answer.id);
      }

      await load();
      show("Question saved.", "success");
      if (isNew) router.replace(`/admin/papers/${paperId}/questions/${targetQuestionId}/edit`);
    } catch (error) {
      show(error instanceof ApiError ? error.message : "The question could not be saved.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function addMarkingStep() {
    if (!createdQuestionId) {
      show("Save the question first, then add marking steps.", "error");
      return;
    }
    try {
      await apiData<MarkingItem>(`/admin/questions/${createdQuestionId}/marking-scheme`, {
        method: "POST",
        body: JSON.stringify({
          item_type: marking.itemType,
          method_label: marking.methodLabel || null,
          criterion_markdown: marking.criterion,
          mark_value: Number(marking.markValue),
          award_note_markdown: marking.awardNote || null,
        }),
      });
      setMarking(emptyMarking(createdQuestionId));
      await load();
      show("Marking step added.", "success");
    } catch (error) {
      show(error instanceof ApiError ? error.message : "The step could not be added.", "error");
    }
  }

  async function addVideo() {
    if (!video.url.trim()) return;
    try {
      await apiData(`/admin/papers/${paperId}/video-sources`, {
        method: "POST",
        body: JSON.stringify({
          provider: video.provider,
          original_url: video.url,
          question_id: createdQuestionId ?? null,
          is_primary: video.isPrimary,
        }),
      });
      setVideo({ provider: "youtube", url: "", isPrimary: false });
      await load();
      show("Video attached.", "success");
    } catch (error) {
      show(error instanceof ApiError ? error.message : "The video could not be added.", "error");
    }
  }

  if (loading) {
    return (
      <div className="stack-lg">
        <div className="skeleton" style={{ height: 40, width: "45%" }} />
        <div className="skeleton" style={{ height: 200 }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!bundle || !part) {
    return (
      <div className="stack-lg">
        <Banner tone="error">{fatalError ?? "This paper has no parts yet."}</Banner>
        <Link className="btn btn--outlined" href={`/admin/papers/${paperId}/edit`} style={{ textDecoration: "none" }}>
          <ArrowBackIcon size={18} />
          Back to the paper
        </Link>
      </div>
    );
  }

  const mathTarget = mathFor === "prompt" ? promptRef.current : answerRef.current;
  const mathValue = mathFor === "answer" ? answerText : prompt;
  const setMathValue = mathFor === "answer" ? setAnswerText : setPrompt;

  return (
    <div className="stack-xl">
      <div className="page-heading anim-fade-in">
        <div>
          <p className="eyebrow">Admin · Question</p>
          <div className="row" style={{ gap: 12 }}>
            <h1 className="t-headline-medium" style={{ margin: 0 }}>
              {isNew ? "New question" : `Question ${numberLabel}`}
            </h1>
            <span className="badge badge--accent">{marks} marks</span>
          </div>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {bundle.paper.title} · Part {part.part_code} — {part.title}
          </p>
        </div>
        <div className="row">
          <Link
            className="btn btn--outlined"
            href={`/admin/papers/${paperId}/edit`}
            style={{ textDecoration: "none" }}
          >
            <ArrowBackIcon size={18} />
            Back
          </Link>
          <Button
            variant="filled"
            icon={<SaveIcon size={16} />}
            loading={saving}
            onClick={() => void save()}
            disabled={!prompt.trim()}
          >
            {saving ? "Saving" : isNew ? "Save question" : "Save changes"}
          </Button>
        </div>
      </div>

      <section className="card card--elevated">
        <div className="row-between">
          <span className="field-label">Completion</span>
          <span className={`badge ${complete ? "badge--valid" : "badge--warning"}`}>
            {progress.filter((item) => item.done).length} / {progress.length}
          </span>
        </div>
        <div style={{ margin: "10px 0 12px" }}>
          <Meter value={progress.filter((item) => item.done).length} max={progress.length} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          {progress.map((item) => (
            <span
              key={item.label}
              className={`chip${item.done ? " chip--filled" : ""}`}
              style={item.done ? undefined : { opacity: 0.65 }}
            >
              {item.done ? <CheckIcon size={12} /> : null}
              {item.label}
            </span>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- question */}
      <section className="form-section anim-rise">
        <StepHeading
          step={1}
          title="The question"
          description="Write the question in Sinhala. Wrap maths in $...$ or $$...$$."
        />

        <div className="form-grid">
          <SelectField
            label="Part"
            value={partId}
            disabled={!isNew}
            hint={isNew ? undefined : "The part cannot be changed after saving."}
            onChange={(event) => {
              const next = bundle.parts.find((item) => item.id === event.target.value);
              setPartId(event.target.value);
              setNumberLabel(String(countInPart(bundle, next) + 1));
            }}
          >
            {bundle.parts.map((item) => (
              <option key={item.id} value={item.id}>
                Part {item.part_code} — {item.title}
              </option>
            ))}
          </SelectField>

          <TextInput
            label="Number label"
            required
            value={numberLabel}
            hint={`Part ${part.part_code} requires ${marks} marks. Marks are set automatically.`}
            onChange={(event) => setNumberLabel(event.target.value)}
          />
        </div>

        <div className="field">
          <div className="row-between" style={{ marginBottom: 6 }}>
            <span className="field-label">Question text</span>
            <Button
              variant="text"
              size="sm"
              icon={<FunctionIcon size={14} />}
              onClick={() => setMathFor("prompt")}
            >
              Math helper
            </Button>
          </div>
          <textarea
            ref={promptRef}
            className="field-input"
            rows={7}
            required
            value={prompt}
            placeholder={'e.g. The function is $f(x) = 2x^2 - 5x + 1$. Find the minimum value of $f(x)$. For $x \\in [0, 3]$.'}
            onChange={(event) => setPrompt(event.target.value)}
          />
          {prompt.trim() ? (
            <div className="math-preview math-preview--boxed" style={{ marginTop: 4 }}>
              <Math tex={prompt} display />
            </div>
          ) : null}
        </div>

        <ImageUploader
          questionId={createdQuestionId}
          label="Question images"
          hint="Graphs, sketches, and diagrams shown with the question."
        />
      </section>

      {/* ------------------------------------------------------------ answer */}
      <section className="form-section anim-rise">
        <StepHeading
          step={2}
          title="Sinhala solution"
          description="The worked answer. This is saved together with the question."
        />

        <div className="field">
          <div className="row-between" style={{ marginBottom: 6 }}>
            <span className="field-label">Answer and working</span>
            <Button
              variant="text"
              size="sm"
              icon={<FunctionIcon size={14} />}
              onClick={() => setMathFor("answer")}
            >
              Math helper
            </Button>
          </div>
          <textarea
            ref={answerRef}
            className="field-input"
            rows={12}
            value={answerText}
            placeholder={"සොලුමා ගලනය\n\n$f(x) = 2(x - \\tfrac{5}{4})^2 - \\tfrac{9}{8}$"}
            onChange={(event) => setAnswerText(event.target.value)}
          />
          {answerText.trim() ? (
            <div className="math-preview math-preview--boxed" style={{ marginTop: 4 }}>
              <Math tex={answerText} display />
            </div>
          ) : null}
        </div>

        <ImageUploader
          answerId={answerId}
          label="Answer images"
          hint={
            answerId
              ? "Working diagrams shown with the solution."
              : "Save the question once to attach images here."
          }
        />
      </section>

      {/* ---------------------------------------------------- marking scheme */}
      <section className="form-section anim-rise">
        <StepHeading
          step={3}
          title="Marking scheme"
          description="Each step's marks must add up to the question total."
          action={
            <span className={`badge ${markingItems.length > 0 && schemeTotal === marks ? "badge--valid" : "badge--warning"}`}>
              {schemeTotal} / {marks} marks
            </span>
          }
        />

        {markingItems.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No steps yet. Add the first one below.</p>
        ) : (
          <div className="stack-sm">
            {markingItems.map((item) => (
              <div className="marking-item" key={item.id}>
                <div className="row" style={{ gap: 8 }}>
                  <strong className="t-label-medium">{item.position}.</strong>
                  <span className="t-label-medium">{item.method_label || item.item_type}</span>
                  <span className="badge badge--neutral">{item.mark_value} marks</span>
                </div>
                <p>{item.criterion_markdown}</p>
              </div>
            ))}
          </div>
        )}

        <div className="form-grid">
          <TextInput
            label="Method or step label"
            value={marking.methodLabel}
            onChange={(event) => setMarking({ ...marking, methodLabel: event.target.value })}
          />
          <TextInput
            label="Marks for this step"
            type="number"
            min="0"
            step="0.5"
            value={marking.markValue}
            onChange={(event) => setMarking({ ...marking, markValue: event.target.value })}
          />
          <div className="field field--wide">
            <span className="field-label">Award criterion</span>
            <textarea
              className="field-input"
              rows={3}
              value={marking.criterion}
              placeholder="What the student must do to earn these marks."
              onChange={(event) => setMarking({ ...marking, criterion: event.target.value })}
            />
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Button
            variant="tonal"
            icon={<CheckIcon size={16} />}
            onClick={() => void addMarkingStep()}
            disabled={!marking.criterion.trim() || !marking.markValue}
          >
            Add step
          </Button>
        </div>
      </section>

      {/* ------------------------------------------------------------- video */}
      <section className="form-section anim-rise">
        <StepHeading
          step={4}
          title="Video"
          description="One video per question. Embeds fall back to the original link."
        />

        <div className="form-grid">
          <TextInput
            label="Provider"
            value={video.provider}
            onChange={(event) =>
              setVideo({ ...video, provider: event.target.value as VideoDraft["provider"] })
            }
          />
          <TextInput
            label="Video URL"
            type="url"
            value={video.url}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(event) => setVideo({ ...video, url: event.target.value })}
          />
        </div>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Button
            variant="filled"
            icon={<VideoIcon size={16} />}
            onClick={() => void addVideo()}
            disabled={!video.url.trim()}
          >
            Attach video
          </Button>
        </div>
      </section>

      {createdQuestionId ? (
        <section className="card card--outlined">
          <h2 className="t-title-medium" style={{ marginTop: 0 }}>Saved images</h2>
          <div className="stack-md">
            <div>
              <span className="field-label">On the question</span>
              <MediaGallery assets={mediaFor("question")} emptyText="No images on the question." />
            </div>
            <div>
              <span className="field-label">On the answer</span>
              <MediaGallery assets={mediaFor("answer")} emptyText="No images on the answer." />
            </div>
          </div>
        </section>
      ) : null}

      {saving ? (
        <p className="row muted" style={{ gap: 8, justifyContent: "center" }}>
          <SpinnerIcon size={16} />
          Saving
        </p>
      ) : null}

      <MathEditor
        open={mathFor !== null}
        onClose={() => setMathFor(null)}
        target={mathTarget ?? null}
        value={mathValue}
        onChange={setMathValue}
      />
    </div>
  );
}

function countInPart(bundle: PaperBundle, part: PaperPart | undefined): number {
  if (!part) return 0;
  return bundle.questions.filter((question) => question.part_id === part.id).length;
}

function hasExistingVideo(bundle: PaperBundle | null, questionId?: string): boolean {
  if (!bundle || !questionId) return false;
  return bundle.video_sources.some((source) => source.question_id === questionId);
}
