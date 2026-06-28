import { DetailTestClient } from "@/componenets/tests/DetailTestClient";
import { detailTestConfigs } from "@/data/tests/detailTestConfigs";

export default function FantasyTestPage() {
  return <DetailTestClient config={detailTestConfigs.fantasy_detail} />;
}