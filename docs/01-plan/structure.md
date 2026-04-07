# Folder Structure — Novel Diary App

> Dynamic Level 기준. React + Vite + Tailwind CSS.

---

## 전체 구조

```
novel-diary/
├── public/
├── src/
│   ├── components/          # 재사용 UI 컴포넌트 (도메인 무관)
│   │   └── ui/              # 버튼, 입력창 등 원자 단위 컴포넌트
│   ├── features/            # 도메인별 기능 모듈 (UI + 훅 + 타입 포함)
│   │   ├── bonfire/         # 모닥불 세션 UI (FlameLevel 애니메이션 등)
│   │   ├── kindling/        # 땔감 입력 및 목록
│   │   ├── media/           # MediaAttachment + KeyImage 업로드/미리보기
│   │   ├── diary/           # 소설 일기 생성 옵션, 결과 표시
│   │   └── style-ref/       # StyleReference 업로드·관리
│   ├── hooks/               # 전역 공유 커스텀 훅
│   ├── services/            # 외부 시스템 연동
│   │   ├── claude/          # Claude API 호출 (묘사 변환, 일기 생성)
│   │   └── storage/         # localStorage 읽기/쓰기 래퍼
│   ├── types/               # 전역 TypeScript 타입 (schema.md 기반)
│   ├── lib/                 # 순수 유틸리티 함수
│   │   └── constants/       # 앱 전역 상수
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── .env.local               # Git 제외
├── CONVENTIONS.md
└── CLAUDE.md
```

---

## features/ 내부 구조 (기능 모듈 단위)

각 feature 폴더는 해당 도메인의 UI·훅·내부 타입을 모두 포함한다.

```
features/bonfire/
├── BonfireScene.tsx         # 모닥불 전체 씬 컴포넌트
├── FlameAnimation.tsx       # 불꽃 애니메이션
├── useBonfireSession.ts     # 세션 상태 관리 훅
└── bonfire.types.ts         # bonfire 전용 내부 타입 (필요 시)

features/kindling/
├── KindlingInput.tsx        # 땔감 입력 폼
├── KindlingList.tsx         # 땔감 목록
├── KindlingItem.tsx         # 개별 땔감 카드
└── useKindlings.ts          # 땔감 CRUD 훅

features/diary/
├── GenerationOptionsPanel.tsx  # 시점·가공 정도·문체 선택 UI
├── DiaryResult.tsx             # 생성된 일기 표시
└── useDiaryGeneration.ts       # 생성 흐름 제어 훅

features/media/
├── MediaUploader.tsx        # MediaAttachment 업로드
├── KeyImageUploader.tsx     # KeyImage 업로드 (별도 컴포넌트)
├── MediaPreview.tsx
└── useMediaAttachment.ts

features/style-ref/
├── StyleRefUploader.tsx
├── StyleRefList.tsx
└── useStyleReferences.ts
```

---

## 파일 분리 기준

| 기준 | 분리 |
|------|------|
| 동일 컴포넌트가 2개 이상 feature에서 사용 | `components/ui/`로 이동 |
| 훅이 2개 이상 feature에서 사용 | `hooks/`로 이동 |
| Claude API 호출 | 반드시 `services/claude/`에서만 |
| localStorage 접근 | 반드시 `services/storage/`에서만 |
| 순수 계산 함수 | `lib/`에 위치 |
