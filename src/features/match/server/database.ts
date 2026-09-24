import "server-only";

import postgres from "postgres";

const MATCH_DATABASE_ENV = "WEBTOON_MATCH_DATABASE_URL";

export class MatchDatabaseNotConfiguredError extends Error {
  constructor() {
    super("MATCH_DATABASE_NOT_CONFIGURED");
    this.name = "MatchDatabaseNotConfiguredError";
  }
}

type MatchDatabaseClient = ReturnType<typeof postgres>;

const globalDatabase = globalThis as typeof globalThis & {
  __webtoonMatchDatabase?: MatchDatabaseClient;
};

export function getMatchDatabase(): MatchDatabaseClient {
  if (globalDatabase.__webtoonMatchDatabase) return globalDatabase.__webtoonMatchDatabase;

  const connectionString = process.env[MATCH_DATABASE_ENV]?.trim();
  if (!connectionString) throw new MatchDatabaseNotConfiguredError();

  globalDatabase.__webtoonMatchDatabase = postgres(connectionString, {
    max: 1,
    prepare: false,
    ssl: "require",
    // Keep the single pooled connection around while a user moves from their
    // result to recommendations and then searches. Reconnecting for each of
    // those screens was the largest avoidable part of the perceived delay.
    idle_timeout: 300,
    max_lifetime: 1800,
    connect_timeout: 10,
    onnotice: () => undefined,
  });

  return globalDatabase.__webtoonMatchDatabase;
}

export function isPostgresError(error: unknown, code: string, constraint?: string) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; constraint?: unknown; constraint_name?: unknown };
  if (candidate.code !== code) return false;
  return constraint ? (candidate.constraint_name ?? candidate.constraint) === constraint : true;
}
