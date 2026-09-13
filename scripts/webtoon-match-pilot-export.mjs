import postgres from "postgres";

const connectionUrl = process.env.WEBTOON_MATCH_DATABASE_URL;

if (!connectionUrl) {
  throw new Error("WEBTOON_MATCH_DATABASE_URL 환경변수가 필요합니다.");
}

const sql = postgres(connectionUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 5,
});

try {
  const [dailyFunnel, sectionMetrics, choiceDistribution, resultDistribution, accuracyFeedback] = await Promise.all([
    sql`select * from public.match_pilot_daily_funnel order by metric_date desc`,
    sql`select * from public.match_pilot_section_metrics order by section_key`,
    sql`select * from public.match_pilot_choice_distribution order by question_id, selection_count desc`,
    sql`select * from public.match_pilot_result_distribution order by result_count desc`,
    sql`select * from public.match_pilot_accuracy_feedback order by response_count desc`,
  ]);

  process.stdout.write(`${JSON.stringify({
    generatedAt: new Date().toISOString(),
    dailyFunnel,
    sectionMetrics,
    choiceDistribution,
    resultDistribution,
    accuracyFeedback,
  }, null, 2)}\n`);
} finally {
  await sql.end({ timeout: 5 });
}
