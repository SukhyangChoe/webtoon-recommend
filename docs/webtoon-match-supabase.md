# 웹툰궁합 Supabase 영구 저장소 적용

이 문서는 실제 비밀번호나 연결 문자열을 포함하지 않는다. 앱은 브라우저가 아니라 Next.js 서버에서만 Supabase PostgreSQL에 연결한다.

## 1. 프로젝트 설정

- 한국 사용자가 중심이면 `Northeast Asia (Seoul)` 리전을 사용한다.
- Data API는 비활성화한다.
- `Automatically expose new tables`는 비활성화한다.
- automatic RLS는 활성화한다.

## 2. 마이그레이션 실행

프로젝트 루트에서 Supabase CLI로 원격 프로젝트를 연결한 뒤 적용한다.

```bash
npx supabase link --project-ref PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

CLI는 실행한 마이그레이션을 `supabase_migrations.schema_migrations`에 기록한다. 적용할 파일은 다음과 같다.

- `supabase/migrations/202609110001_webtoon_match_persistence.sql`
- `supabase/migrations/202609130001_webtoon_match_analytics.sql`

이 마이그레이션은 다음 테이블을 만든다.

- `match_profiles`
- `match_taste_snapshots`
- `match_challenges`
- `match_compatibility_results`
- `match_challenge_entries`
- `match_challenge_entry_history`
- `match_analytics_events`

또한 익명 사용자당 활성 challenge 하나와 challenge별 도전자 한 행을 고유 제약으로 보장한다. 재검사 전 결과는 history 테이블에 보관한다.
분석 마이그레이션은 익명 행동 이벤트 테이블과 파일럿 확인용 집계 뷰 5개를 만든다. 원문 응답과 닉네임은 분석 이벤트에 저장하지 않는다.

## 3. 서버 연결 문자열 설정

Supabase Dashboard의 `Connect > Direct > Transaction pooler`에서 URI를 복사하고 `[YOUR-PASSWORD]`를 프로젝트 DB 비밀번호로 교체한다.

프로젝트 루트의 `.env.local`에 다음 환경변수를 설정한다.

```dotenv
WEBTOON_MATCH_DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres"
```

이 값은 서버 전용이다. 채팅, 브라우저 코드, 로그, Git 커밋에 포함하지 않는다. `.env.local`은 현재 `.gitignore`에 포함되어 있다.

## 4. 사용자가 직접 확인할 항목

마이그레이션을 실행한 뒤 `npx supabase migration list`와 Supabase Table Editor에서 적용 상태 및 7개 테이블이 생성됐는지 확인한다. 이후 로컬 서버를 다시 시작하고 다음 흐름을 검증한다.

1. `/match`에서 테스트를 완료한다.
2. 결과 페이지를 새로고침해 같은 결과가 조회되는지 확인한다.
3. 궁합 링크를 만든 뒤 로컬 서버를 재시작한다.
4. 기존 링크와 랭킹이 그대로 조회되는지 확인한다.
5. 같은 도전자가 다시 검사했을 때 랭킹 행이 추가되지 않고 갱신되는지 확인한다.
6. 링크를 닫은 뒤 새 링크를 만들 수 있는지 확인한다.
7. 테스트를 한 번 완료한 뒤 `match_analytics_events`에 이벤트가 쌓이고 파일럿 집계 뷰가 조회되는지 확인한다.

## 보안 메모

- 관리 토큰 원문은 브라우저에만 보관하고 DB에는 SHA-256 해시만 저장한다.
- 공개 API는 원본 응답, 익명 ID, 내부 궁합 구성 점수를 반환하지 않는다.
- Data API를 나중에 활성화한다면 별도의 명시적 grant와 RLS policy를 먼저 설계한다.
