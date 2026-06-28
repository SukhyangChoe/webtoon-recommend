import { detailTestConfigs } from "@/data/tests/detailTestConfigs";
import { DetailTestClient } from "../DetailTestClient";

export default function MurimTestPage() {
  const config = detailTestConfigs.murim_detail;

  return (
    <DetailTestClient
      test={config.testData}
      results={config.results}
      storageKey={config.storageKey}
    />
  );
}