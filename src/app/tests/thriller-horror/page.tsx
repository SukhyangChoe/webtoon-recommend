import { DetailTestClient } from "@/components/tests/DetailTestClient";
import { detailTestConfigs } from "@/data/tests/detailTestConfigs";

export default function ThrillerHorrorDetailPage() {
  return <DetailTestClient config={detailTestConfigs.thriller_horror_detail} />;
}