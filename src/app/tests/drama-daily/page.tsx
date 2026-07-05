import { DetailTestClient } from "@/components/tests/DetailTestClient";
import { detailTestConfigs } from "@/data/tests/detailTestConfigs";

export default function DramaDailyDetailPage() {
  return <DetailTestClient config={detailTestConfigs.drama_daily_detail} />;
}