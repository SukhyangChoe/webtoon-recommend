import { DetailTestClient } from "@/componenets/tests/DetailTestClient";
import { detailTestConfigs } from "@/data/tests/detailTestConfigs";

export default function MurimTestPage() {
  return <DetailTestClient config={detailTestConfigs.murim_detail} />;
}