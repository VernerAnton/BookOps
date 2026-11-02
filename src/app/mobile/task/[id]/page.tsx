import { PhoneTask } from "@/components/phone-task";

export default async function MobileTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PhoneTask id={id} />;
}
