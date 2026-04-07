# Naming Rules — Novel Diary App

---

## 기본 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| React 컴포넌트 | PascalCase | `KindlingInput`, `BonfireScene` |
| 훅 | camelCase, `use` 접두사 | `useKindlings`, `useDiaryGeneration` |
| 일반 함수 | camelCase | `calcFlameLevel`, `buildDiaryPrompt` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_GENERATION_THRESHOLD`, `MAX_MEDIA_COUNT` |
| TypeScript 타입/인터페이스 | PascalCase | `Kindling`, `DiarySession`, `Perspective` |
| 파일 — 컴포넌트 | PascalCase.tsx | `KindlingItem.tsx` |
| 파일 — 훅/유틸/서비스 | kebab-case.ts | `use-kindlings.ts`, `claude-service.ts` |
| 파일 — 타입 정의 | kebab-case.types.ts | `diary.types.ts` |
| 폴더 | kebab-case | `style-ref/`, `key-image/` |
| CSS 클래스 (Tailwind) | Tailwind 유틸리티 직접 사용 (별도 명명 불필요) | — |

---

## 도메인 용어 → 코드명 매핑

`glossary.md`의 코드명을 코드에서 그대로 사용한다. 임의로 축약하거나 바꾸지 않는다.

| UI 표현 | 코드명 | 잘못된 예 |
|---------|--------|----------|
| 땔감 | `kindling` / `Kindling` | ~~`log`~~, ~~`event`~~ |
| 모닥불 세션 | `diarySession` / `DiarySession` | ~~`session`~~ (단독 사용 금지) |
| 불꽃 단계 | `flameLevel` / `FlameLevel` | ~~`level`~~, ~~`flame`~~ |
| 참고 문체 | `styleReference` / `StyleReference` | ~~`style`~~, ~~`ref`~~ |
| 소설 일기 | `novelDiary` / `NovelDiary` | ~~`diary`~~ (단독 사용 금지) |
| 대표 이미지 | `keyImage` / `KeyImage` | ~~`thumbnail`~~, ~~`cover`~~ |
| 서술 시점 | `perspective` / `Perspective` | ~~`viewpoint`~~, ~~`pov`~~ |
| 가공 정도 | `processingLevel` / `ProcessingLevel` | ~~`level`~~, ~~`intensity`~~ |
| 연속성 맥락 | `continuityContext` | ~~`context`~~, ~~`history`~~ |

---

## 이벤트 핸들러

```typescript
// 컴포넌트 내부: handle + 동사
const handleAddKindling = () => { ... }
const handleGenerateDiary = () => { ... }

// props로 전달: on + 동사
<KindlingInput onAdd={handleAddKindling} />
<GenerationOptionsPanel onGenerate={handleGenerateDiary} />
```

---

## 서비스 함수 명명

```typescript
// services/claude/
generateNovelDiary(...)      // 소설 일기 생성
describeMediaAttachment(...) // MediaAttachment 묘사 변환
describeKeyImageAtmosphere(...) // KeyImage 분위기 묘사

// services/storage/
saveSession(...)
loadSession(sessionId)
saveKindling(...)
loadKindlings(sessionId)
saveKeyImage(...)
loadKeyImage(sessionId)
saveNovelDiary(...)
loadDiaries()
```

---

## 상수 목록 (lib/constants/)

```typescript
// generation.ts
export const DEFAULT_GENERATION_THRESHOLD = 3;
export const MAX_MEDIA_ATTACHMENTS_PER_SESSION = 3;
export const MAX_STYLE_REFERENCE_CHARS = 10_000;
export const MAX_STYLE_REFERENCES_PER_USER = 10;
export const MAX_KINDLING_CHARS = 500;
export const MAX_KEY_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;  // 5MB
export const MAX_MEDIA_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_MEDIA_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

// flame.ts
export const FLAME_LEVEL_THRESHOLDS = [0, 1, 2, 3, 5, 7] as const;
// index = FlameLevel, value = 해당 레벨 최소 땔감 수

// storage.ts
export const STORAGE_KEYS = {
  USER: 'novel-diary:user',
  STYLE_REFERENCES: 'novel-diary:style-references',
  SESSIONS: 'novel-diary:sessions',
  KINDLINGS: (sessionId: string) => `novel-diary:kindlings:${sessionId}`,
  ATTACHMENTS: (sessionId: string) => `novel-diary:attachments:${sessionId}`,
  KEY_IMAGE: (sessionId: string) => `novel-diary:key-image:${sessionId}`,
  DIARIES: 'novel-diary:diaries',
} as const;
```
