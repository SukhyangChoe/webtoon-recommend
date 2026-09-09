import { notFound } from "next/navigation";
import { MatchQuestionScreen } from "@/features/match/components/MatchQuestionScreen";

export default async function DuelPage({ params }: { params: Promise<{ index: string }> }) {
  const { index } = await params;
  const parsed = Number(index);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 6) notFound();
  return <MatchQuestionScreen screen={{ type: "duel", index: parsed }} />;
}
