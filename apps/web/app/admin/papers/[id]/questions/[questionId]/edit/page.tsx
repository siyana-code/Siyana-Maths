import { QuestionEditor } from "@/components/admin/QuestionEditor";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string; questionId: string }>;
}) {
  const { id, questionId } = await params;
  return <QuestionEditor paperId={id} questionId={questionId} />;
}
