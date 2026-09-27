export type UUID = string;

export type TaxonomyItem = {
  id: UUID;
  slug: string;
  name_en: string;
  name_si?: string | null;
  sort_order?: number;
};

export type ExamYear = {
  id: UUID;
  year: number;
};

export type Topic = TaxonomyItem & {
  subject_id: UUID;
  parent_id?: UUID | null;
  is_active?: boolean;
};

export type Taxonomy = {
  levels: TaxonomyItem[];
  subjects: TaxonomyItem[];
  exam_years: ExamYear[];
  topics: Topic[];
};

export type AdminPaperSummary = {
  id: UUID;
  slug: string;
  title: string;
  description?: string | null;
  status: "draft" | "published" | "archived" | string;
  paper_number: string;
  medium: string;
  total_marks?: number | string | null;
  published_at?: string | null;
  updated_at?: string | null;
  level?: TaxonomyItem | null;
  subject?: TaxonomyItem | null;
  exam_year?: ExamYear | null;
};

export type AdminPaper = AdminPaperSummary & {
  level_id?: UUID;
  subject_id?: UUID;
  exam_year_id?: UUID;
};

export type PaperPart = {
  id: UUID;
  paper_id: UUID;
  part_code: "A" | "B" | string;
  title: string;
  part_type: "short" | "structured" | "easy" | string;
  question_count: number;
  selection_limit: number;
  marks_per_question: number | string;
  total_marks: number | string;
  sort_order: number;
};

export type Question = {
  id: UUID;
  paper_id: UUID;
  part_id: UUID;
  number_label: string;
  position: number;
  prompt_markdown: string;
  marks: number | string;
};

export type Answer = {
  id?: UUID;
  question_id: UUID;
  solution_markdown: string;
  explanation_markdown?: string | null;
  content_language?: string;
};

export type MarkingItem = {
  id: UUID;
  question_id: UUID;
  position: number;
  item_type: "method" | "alternative" | "note" | string;
  method_label?: string | null;
  criterion_markdown: string;
  mark_value: number | string;
  award_note_markdown?: string | null;
  is_alternative?: boolean;
};

export type VideoSource = {
  id: UUID;
  paper_id: UUID;
  question_id?: UUID | null;
  provider: "youtube" | "tiktok" | "facebook" | string;
  original_url: string;
  embed_url?: string | null;
  is_primary?: boolean;
  position: number;
};

export type PaperBundle = {
  paper: AdminPaper;
  parts: PaperPart[];
  questions: Question[];
  answers: Answer[];
  marking_scheme_items: MarkingItem[];
  video_sources: VideoSource[];
};

export type PaperListResponse = {
  data: AdminPaperSummary[];
  meta: { page: number; page_size: number; total: number };
};
