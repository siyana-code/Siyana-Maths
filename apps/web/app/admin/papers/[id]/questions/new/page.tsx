import { QuestionEditor } from "@/components/admin/QuestionEditor";

export default async function NewQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuestionEditor paperId={id} />;
}
