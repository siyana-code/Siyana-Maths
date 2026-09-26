import { PaperEditor } from "@/components/admin/PaperEditor";

export default async function EditPaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaperEditor paperId={id} />;
}
