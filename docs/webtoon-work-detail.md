# 작품 상세 화면과 작품 카탈로그 도입

## 적용 데이터

- 원본: `webtoons_seed_v0_797_integrated_20261023.json` (사용자 제공).
- 프로젝트 기준 파일: `src/data/webtoons/webtoons_seed_current.json`.
- 11,910개 작품, 추천 등록 가능 2,790개. JSON 값은 원본과 동일하며 줄바꿈만 LF로 통일했다.
- 기존 active 작품 11,856개의 ID를 유지하고 54개를 추가한다. 기존 retired 14개를 물리 삭제하지 않는다.
- 기존 작품의 벡터 16개 변경, 추천 자격 6개 변경은 승인된 통합 원본을 따른다.
- 원본은 5개 기준 장르만 사용한다. 이전 `genreScores.action` 임시 예외 5건의 값은 복원하지 않았다. 과거 값은 `scripts/webtoon-catalog-schema.mjs`의 이력 목록과 동기화 전 백업에 남아 있다.
- 비추천 작품의 벡터 결측을 허용하되 가짜 0점 벡터로 보충하지 않는다. 추천 가능한 작품은 명시적 자격·검수·공식 URL 조건을 검증한다.

## 저장 책임

- `public.webtoons`: 기준 ID, 제목, 플랫폼, 감상 URL, 기준 장르, 추천 자격, 원본 JSONB.
- `public.webtoon_details`: 독립적으로 보완한 표지, 제작진, 소개, 출처. 자동 입력은 `imported_data`에만 저장한다.
- 사용자 추천, 코멘트, 좋아요는 기존 테이블을 유지한다.
- `202610240001_webtoon_details.sql`은 서버 전용 접근을 유지하며 anon/authenticated에 직접 권한을 주지 않는다.
- 실제 이미지 바이트를 JSONB에 넣지 않는다. 사용자 제공 데모에서 ID·제목·플랫폼이 일치하고 보류 메모가 없는 6개 표지는 `public/match/covers`에서 제공한다. 검토 대기/판본 불일치 가능성이 있는 표지는 가져오지 않는다.
- 사용자 제공 ID별 ZIP의 일치 표지를 도입한 이후에는 Supabase `webtoon-covers` 공개 버킷의 WebP 주소가 우선한다. 기존 6개 로컬 파일은 삭제하지 않고 이전 연결 정보도 유지한다.
- 수동 보완 필드(`cover_url`, `synopsis`, `creators`, `source_refs`)는 카탈로그 재동기화로 덮어쓰지 않는다.

## 재동기화

```sh
npx supabase db push --dry-run
npx supabase db push
npm run check:webtoon-catalog
npm run sync:webtoon-catalog
```

`check`는 DB 읽기 전용 트랜잭션으로 추가/벡터/자격/비활성 대상만 보고한다. `sync`는 전체 원본 검증 후 DB 트랜잭션에서 advisory lock을 획득하고, 작품·상세·추천·좋아요의 동기화 전 백업을 압축 JSON으로 만든다. 백업 위치는 실행 결과의 `backupFolder`에 출력한다. 추천/코멘트/좋아요가 전후 동일하지 않으면 전체 동기화를 롤백한다. 빈 파일은 거부하고, 새로 비활성화할 기존 작품이 있는 경우 dry-run 검토 후 명시적인 `--retire-missing` 없이는 중단한다. 임시 폴더의 백업은 장기 보관용이 아니므로 필요한 경우 비공개 백업 위치로 별도 보관한다.

선택적 사용자 제공 표지/제작진 도입:

```sh
node scripts/import-webtoon-detail-assets.mjs --source /absolute/path/to/provided-demo.html
node --env-file=.env.local scripts/import-webtoon-detail-assets.mjs --source /absolute/path/to/provided-demo.html --apply
```

기존 파일 바이트가 다르거나 기존 수동 보완 데이터가 있으면 무조건 덮어쓰지 않는다. HTML은 실행하지 않고 포함된 JSON만 읽는다. 타 사이트를 자동 수집하는 기능은 없다.

### ID별 표지 ZIP

```sh
node scripts/import-webtoon-covers.mjs --archive /absolute/path/to/covers.zip
node scripts/import-webtoon-covers.mjs --archive /absolute/path/to/covers.zip --prepare
node --env-file=.env.local scripts/import-webtoon-covers.mjs --archive /absolute/path/to/covers.zip --prepared /absolute/path/to/prepared-folder --apply --publish-as-requested
```

- 첫 명령은 검토만 한다. 원본 ZIP은 수정·삭제하지 않으며, 준비 이미지·백업·보고서는 프로젝트 밖 임시 폴더에 생성한다. 준비 폴더를 재사용하면 중단된 업로드를 재개할 수 있다.
- ID·제목·플랫폼을 최신 카탈로그 및 실 DB와 대조한다. 불일치는 보류하며 작품 자격이나 벡터는 바꾸지 않는다. ZIP에서 선택 파일만 경로·크기·CRC·SHA-256 검증 후 추출한다.
- 원본 비율 유지, EXIF 방향 보정, 업스케일 없이 가로 320/640px WebP를 만든다. 원본/CSV/내부 manifest는 공개 버킷에 올리지 않는다. 원본 ZIP은 Downloads 위치에 그대로 있으므로 장기 보관은 별도 비공개 백업이 필요하다.
- 공개 버킷은 이미지 읽기용이다. 업로드는 기존 CLI 인증의 service-role 권한으로만 수행하며 anon/authenticated 쓰기 정책을 추가하지 않는다. 인증 키는 메모리에서만 사용하고 출력·저장하지 않는다.
- 객체 경로는 `v1/<canonicalWebtoonId>/<원본 SHA-256>-w640-q82-v1.webp` 형식이다. 장기 캐시를 사용하고 기존 객체를 덮어쓰지 않는다. 재시도 시 기존 바이트까지 확인한다.
- 모든 업로드와 인증 없는 공개 접근 확인이 끝난 뒤 `cover_url` 및 `source_refs.userProvidedCovers`만 트랜잭션에서 변경한다. 기존 상세 정보를 백업하고 동시 수정 및 사용자 추천·좋아요·원본 벡터 변경을 검사한다.
- 사용자의 공개 요청은 `publicationRequestedByUser: true`로 별도 기록한다. 출처의 `rightsState`와 `publicationReady`는 그대로 보존하며 이용허락 확보로 간주하거나 승격하지 않는다.
- `WorkCover`는 이 버킷의 검증된 짝 경로만 `srcSet`으로 제공한다. 카드/상세 크기와 기기 해상도에 따라 320/640px 이미지를 선택하고, 실패 시 기존 공통 대체 표지를 사용한다.

## 상세 화면

- 내부 화면: `/match/work/[canonicalWebtoonId]`.
- 조회 API: `/api/v1/webtoons/[canonicalWebtoonId]`.
- `profile`은 공개 결과 ID로 계산 대상을 명시한다. 생략하면 기존 익명 사용자 식별자를 통해 본인의 최신 결과를 찾고, 결과가 없으면 개인 점수/이유를 숨긴다.
- API는 `private, no-store`. 원본 벡터, 익명 ID, 원본 검수 문장 및 출처 묶음을 브라우저에 반환하지 않는다.
- 원본의 `recommendationReason`은 작품 소개용 문장이지 개인화 이유가 아니다. 개인화 이유는 실제 사용자/작품의 공통 양수 신호에서만 생성한다.
- 기존 `calculateRecommendationFit`를 공유한다. 원점수 0.70 이상이며 비교 축 2개 이상이면 카드 하이라이트. 상세의 %는 같은 점수의 표시값이다.
- 궁합 카드마다 `fitTargetPublicProfileId`를 전달해 하이라이트의 수신자와 상세 점수의 대상이 일치한다. ‘OO님의 핏점수’로 대상을 표시한다.
- 표지와 제목은 내부 상세로, 감상 CTA만 검증된 HTTPS 공식 URL로 이동한다. 좋아요는 별도 버튼이다.
- 상세에서 뒤로가기 시 기존 목록 위치를 복원한다. 추천 관리 화면에서는 미저장 코멘트를 잃지 않도록 상세를 새 탭으로 연다.
- 없는 제작진·등급·소개·태그는 해당 항목을 숨긴다. 표지 미등록은 공통 대체 표시를 사용한다. 기존 시안의 모의 82% 및 안내 문구는 사용하지 않는다.
- 원본 `webtoon_detail_demo_v0_2_7.html`과 같은 단일 시트: 손잡이를 위로 64px 이상 끌면 궁합·소개로 확장하고, 확장 상태에서 아래로 64px 이상 끌면 기본 화면으로 복귀한다. 드래그 중 높이와 내용의 투명도가 손을 따라 변하며 짧은 드래그는 원위치로 복귀한다. 가로 드래그·손잡이 클릭만으로는 전환하지 않는다.
- 표지는 화면 위쪽 끝부터 로고 뒤까지 `object-fit: cover`로 채운다. 로고 아래의 부드러운 그라데이션으로 가독성을 확보하며 표지·감상 CTA의 위치는 시트 단계와 무관하게 유지한다. 기본 시트는 제목과 핏점수를 가로로 배치하고 이유 미리보기를 중복 노출하지 않아 표지가 더 많이 보이게 한다. 기본 화면·소개 본문의 중복 ‘작품 정보’ 링크는 없애고 확장 화면의 상단 탭으로만 전환한다.
- 궁합·소개와 작품 정보는 동일한 확장 높이를 공유하며 선택한 탭의 내용만 표시한다. 각 탭의 본문은 일반 스크롤이고 읽던 위치를 개별 복원한다. 짧은 화면에서도 탭은 유지한다. 표지 탭·접기·Escape 및 손잡이 키보드 조작을 지원한다. 모션 감소 설정에서는 전환 애니메이션을 생략한다.

## 검증 명령

```sh
node --test tests/match/*.test.mjs
npx tsc --noEmit --incremental false
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' NODE_PATH=/absolute/path/to/playwright/node_modules node tests/browser/work-detail.smoke.cjs
```

브라우저 검사는 실제 DB를 읽되 데이터를 저장하지 않는다. 결측·긴 제목 테스트만 네트워크 mock으로 격리하고, 사용자에게 보여주는 캡처에는 실제 작품과 실제 계산값만 사용한다.

`tests/browser/work-detail-motion.smoke.cjs`는 원본 데모 HTML과 실제 화면에 동일한 제스처를 실행해 단계 전환을 비교하고, 모션 감소를 끈 상태의 실제 높이 보간도 확인한다. `WORK_DETAIL_DEMO`로 원본 경로를 지정할 수 있다. `WORK_DETAIL_FFMPEG`를 지정하면 실제 브라우저 프레임으로 짧은 WebM 동작 영상도 생성한다.
