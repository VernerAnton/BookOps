import { Desk } from "@/components/desk";

export const instant = false;

export default async function BookReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Desk initialBookId={id} />;
}
