import { QueueDashboard } from "@/components/queue-dashboard";

export const instant = false;

export default async function BookReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QueueDashboard initialBookId={id} />;
}
