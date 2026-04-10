# Novel Diary App — CLAUDE.md

## 프로젝트 개요

일상의 사건(땔감)을 입력하면 사용자의 문체를 학습해 소설 문체의 일기로 변환해주는 웹 앱.

## 용어 참조

이 프로젝트의 도메인 용어는 `docs/01-plan/glossary.md`를 참조하세요.
비즈니스 용어 사용 시 항상 참조할 것.

## 데이터 스키마

엔티티 정의 및 데이터 구조는 `docs/01-plan/schema.md`를 참조하세요.

## 기술 스택

- Frontend: React + Vite + Tailwind CSS (TypeScript strict) + PWA (vite-plugin-pwa)
- Backend: Node.js + Express + TypeScript (`server/`)
- Auth: Supabase Auth (Google 소셜 로그인)
- DB: Supabase (usage 테이블 — 호출 횟수, 구독 상태)
- Payment: Stripe (weekly/monthly 구독)
- AI: Anthropic Claude API (서버에서 호출, 클라이언트에서 직접 호출 안 함)
- 저장소: localStorage (일기 데이터) + Supabase (사용자/결제 메타데이터)

## 서버 모드 vs 개발 모드

- `VITE_API_URL` 환경변수가 설정된 경우: 서버 경유 (API 키 클라이언트 불필요)
- 미설정 시: 직접 Anthropic 호출 (개발용, 사용자 API 키 필요)

## 무료 사용 정책

- 신규 사용자: 30회 무료 (서버에서 카운트)
- 30회 초과: PaywallModal 표시 → Stripe Checkout
- 구독 중: 무제한 (`remaining: -1`)

## 코딩 규칙 참조

전체 컨벤션: `CONVENTIONS.md`
- 명명 규칙 상세: `docs/01-plan/naming.md`
- 폴더 구조 상세: `docs/01-plan/structure.md`

## 핵심 규칙

- 주인공은 항상 앱 사용자 본인 (`User.name`)
- 생성 조건: 세션당 땔감 3개 이상 (`DEFAULT_GENERATION_THRESHOLD = 3`)
- 미디어 첨부(`MediaAttachment`): 세션당 최대 3개, 특정 땔감에 연결된 장면 묘사용
- 대표 이미지(`KeyImage`): 세션당 1개, 땔감과 무관한 하루 분위기 포착용 — 혼동 주의
- 서술 시점(`Perspective`): 4가지 — `1인칭주인공` / `1인칭관찰자` / `3인칭관찰자` / `3인칭전지적`
- 연속성: `NovelDiary.continuityContext`를 다음 생성 시 반드시 포함

## 개발 파이프라인 진행 상태

- [x] Phase 1: Schema/Terminology
- [x] Phase 2: Coding Convention
- [x] Phase 3: Mockup (index, diary, style-ref, timeline, novel + storage/claude/avatar 서비스)
- [x] Phase 4: 프로젝트 스캐폴딩 (React + Vite + TS + Tailwind, 타입, 스토리지 서비스)
- [x] Phase 5: Design System (픽셀 아트 디자인 시스템, CSS 변수, 공통 컴포넌트)
- [x] Phase 6: UI Integration (전 페이지 React 포팅 완료)
  - BonfirePage: 불꽃 애니메이션, 땔감 입력/목록, 대표 이미지 업로드, 불꽃 게이지
  - DiaryPage: 생성 옵션 패널, Claude API 연동, 타이핑 애니메이션, 등장인물 카드
  - StyleRefPage: 파일 업로드, 텍스트 붙여넣기, 미리보기 모달
  - TimelinePage: 등장인물 로스터, 일기 카드 목록, 상세 모달, 삭제 확인
  - NovelPage: 책 펼침 레이아웃, 텍스트 페이지 분할, 불멍 독자석(AI 독자 반응)
- [x] Phase 7: SEO/Security
  - meta description / og tags 추가
  - 픽셀 파이어 favicon.svg 생성 (public/)
  - API 키 상태 표시 + 변경 버튼 (DiaryPage 옵션 패널)
  - 편집 모드 땔감 복원 버그 수정 (sessionId 없을 때 diary snapshot fallback)
  - 편집 모드 타이핑 애니메이션 스킵 (isEditLoad flag)
- [x] Phase 8: Review
  - 모바일 반응형: BonfirePage/DiaryPage 단일 컬럼, NovelPage 수평 스크롤 (.book-outer)
  - 코드 정리: AvatarCanvas 공통 컴포넌트 추출 (src/components/ui/AvatarCanvas.tsx)
  - 코드 정리: formatDate/formatDateShort 공유 함수 src/lib/date.ts에 추가
- [x] Phase 9: Deployment
  - vercel.json: SPA 라우팅 리라이트
  - .github/workflows/deploy.yml: GitHub Pages 배포 워크플로우
  - public/404.html: GitHub Pages SPA 폴백 리다이렉트
- [x] Phase 10: PWA + Monetization
  - PWA: vite-plugin-pwa + manifest.json + 아이콘(192/512) + InstallBanner
  - Backend: server/ (Express + TypeScript, Anthropic API 서버 이관)
  - Auth: Supabase Auth Google 로그인 (src/services/auth/)
  - Usage API: GET /api/ai/usage, POST /api/ai/chat (quota 체크 포함)
  - Billing API: POST /api/billing/checkout, /portal, /webhook
  - PaywallModal: 30회 초과 시 weekly/monthly 플랜 선택 UI
  - DB: supabase/migrations/001_usage.sql
