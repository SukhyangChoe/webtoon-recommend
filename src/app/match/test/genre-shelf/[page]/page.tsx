import { notFound } from "next/navigation";
import { MatchQuestionScreen } from "@/features/match/components/MatchQuestionScreen";

export default async function GenreShelfPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (page !== "1" && page !== "2") notFound();
  return <MatchQuestionScreen screen={{ type: "genre", page: Number(page) as 1 | 2 }} />;
}
