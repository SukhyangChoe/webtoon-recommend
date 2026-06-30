import { DetailTestClient } from "@/components/tests/DetailTestClient";
import { detailTestConfigs } from "@/data/tests/detailTestConfigs";

export default function MurimTestPage() {
  return <DetailTestClient config={detailTestConfigs.murim_detail} />;
}