import { detailTestConfigs } from "@/data/tests/detailTestConfigs";
import { DetailTestClient } from "@/app/tests/DetailTestClient";

export default function FantasyTestPage() {
  const config = detailTestConfigs.fantasy_detail;

  return (
    <DetailTestClient
      test={config.testData}
      results={config.results}
      storageKey={config.storageKey}
    />
  );
}