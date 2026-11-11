# 내 취향 사용설명서 컷툰

내장 ImageGen으로 제작한 정적 컷툰 109편입니다. 9개 장르 × 12개 일상 에피소드와 공통 에피소드 1편을 포함합니다. 생성 시 승인된 흰 콩 모양 캐릭터와 검은 손그림 선의 4컷 예시를 공통 참조로 사용했습니다. 같은 그림체의 프로젝트 내 참조는 `public/match/reader-comics/v1/fantasy-payoff.webp`입니다.

- 원문: `src/features/match/config/readerSceneCopy.mjs`
- 4컷 대사: `scripts/reader-comics/storyboards.mjs`
- 프롬프트: `node scripts/reader-comics/jobs.mjs fantasy.growth`
- 이미지: `public/match/reader-comics/v1/*.webp`
- 서버용 연결 목록: `src/features/match/data/readerComicCatalog.v1.json`

새 이미지가 필요하면 프롬프트를 출력해 공통 그림체를 참조한 내장 ImageGen 호출로 에피소드별로 생성합니다. 생성된 PNG를 `node scripts/reader-comics/install.mjs <genre.type> <PNG 경로>`로 설치한 뒤 `node scripts/reader-comics/catalog.mjs`로 연결 목록을 갱신합니다. 원문이나 대사가 바뀌면 해당 이미지를 다시 생성해야 합니다.

결과 API는 저장된 사용설명서의 에피소드 키와 실제 원문이 모두 일치할 때만 컷툰을 연결합니다. 기존 저장 결과에도 적용되며, 조회 중 이미지 생성 요청이나 DB 쓰기를 추가하지 않습니다. 화면은 `일상 속에서는`의 원문을 항상 보여주고, 그 아래 현재 에피소드 이미지 하나를 지연 로딩합니다. 이미지가 없거나 로딩에 실패해도 원문은 유지됩니다.

검증: `npm run test:match`, `tests/browser/reader-comics.smoke.cjs`, 프로덕션 빌드. 브라우저 검증은 공개 결과 픽스처를 사용하며 서비스 API 요청을 모두 가로챕니다.
