# CONVENTIONS — Novel Diary App

> Phase 2 산출물. AI와 협업 시 이 파일을 기준으로 코드를 작성한다.
> 세부 내용: `docs/01-plan/naming.md`, `docs/01-plan/structure.md`

---

## 1. 코드 스타일

- **언어**: TypeScript (strict mode)
- **들여쓰기**: 2 spaces
- **따옴표**: 작은따옴표 (`'`)
- **세미콜론**: 없음 (ASI 사용)
- **줄 길이**: 100자 이하
- **포맷터**: Prettier (설정 파일 기준)

```typescript
// ✅
const title = 'novel diary'
const flameLevel: FlameLevel = 3

// ❌
const title = "novel diary";
const flameLevel:FlameLevel=3;
```

---

## 2. 명명 규칙 (요약)

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `KindlingInput` |
| 훅 | camelCase + `use` 접두사 | `useKindlings` |
| 함수/변수 | camelCase | `calcFlameLevel` |
| 상수 | UPPER_SNAKE_CASE | `MAX_MEDIA_ATTACHMENTS_PER_SESSION` |
| 타입/인터페이스 | PascalCase | `DiarySession`, `Perspective` |
| 컴포넌트 파일 | PascalCase.tsx | `BonfireScene.tsx` |
| 훅·서비스·유틸 파일 | kebab-case.ts | `claude-service.ts` |
| 폴더 | kebab-case | `style-ref/`, `key-image/` |

→ 도메인 용어 매핑 상세: `docs/01-plan/naming.md`

---

## 3. 폴더 구조 (요약)

```
src/
├── components/ui/      # 도메인 무관 재사용 UI
├── features/           # 도메인별 기능 모듈
│   ├── bonfire/        # 모닥불 세션
│   ├── kindling/       # 땔감
│   ├── media/          # 미디어 첨부 + 대표 이미지
│   ├── diary/          # 소설 일기 생성
│   └── style-ref/      # 참고 문체
├── hooks/              # 공유 커스텀 훅
├── services/
│   ├── claude/         # Claude API (여기서만 호출)
│   └── storage/        # localStorage (여기서만 접근)
├── types/              # 전역 타입 (schema.md 기반)
└── lib/constants/      # 앱 전역 상수
```

→ 상세: `docs/01-plan/structure.md`

---

## 4. 아키텍처 규칙

### 레이어 의존 방향

```
컴포넌트 → 훅 → 서비스 → (Claude API / localStorage)
```

- 컴포넌트가 `services/` 또는 `localStorage`를 직접 호출하는 것은 금지
- Claude API 호출은 `services/claude/`에서만
- localStorage 접근은 `services/storage/`에서만

### 예시

```typescript
// ✅ 올바른 흐름
// components: useDiaryGeneration 훅 호출
// hooks: claude service 호출
// services/claude: Claude API 호출

// ❌ 금지
// KindlingInput.tsx 안에서 localStorage.setItem(...) 직접 호출
// DiaryResult.tsx 안에서 fetch('https://api.anthropic.com/...') 직접 호출
```

---

## 5. TypeScript 규칙

- `any` 사용 금지 — `unknown` 또는 적절한 타입 사용
- 전역 엔티티 타입은 `src/types/`에서 import
  - `Kindling`, `DiarySession`, `NovelDiary`, `KeyImage` 등
- `interface`와 `type` 사용 기준:
  - 객체 형태: `interface`
  - 유니온·리터럴·유틸리티 타입: `type`

```typescript
// ✅
interface Kindling { id: string; text: string; ... }
type Perspective = '1인칭주인공' | '1인칭관찰자' | '3인칭관찰자' | '3인칭전지적'
type FlameLevel = 0 | 1 | 2 | 3 | 4 | 5

// ❌
const processKindling = (k: any) => { ... }
```

---

## 6. 환경변수

| 변수 | 용도 | 노출 범위 |
|------|------|----------|
| `VITE_ANTHROPIC_API_KEY` | Claude API 키 | 클라이언트 (MVP 한정) |
| `VITE_APP_TITLE` | 앱 이름 | 클라이언트 |

> ⚠️ MVP 한정으로 API 키를 클라이언트에서 직접 사용한다.
> 프로덕션 배포 시 서버 프록시(`/api/claude`) 도입 필요 (Phase 9에서 검토).

`.env.example` 참조.

---

## 7. 컴포넌트 작성 규칙

```typescript
// 함수 선언식 사용 (화살표 함수 컴포넌트 지양)
export function KindlingInput({ onAdd }: KindlingInputProps) {
  // 1. 훅 호출
  // 2. 이벤트 핸들러 (handle + 동사)
  // 3. return JSX
}

// props 타입은 컴포넌트 파일 내 상단에 선언
interface KindlingInputProps {
  onAdd: (text: string) => void
}
```

---

## 8. 주석 규칙

- 로직이 자명한 경우 주석 생략
- Claude 프롬프트 구성 로직은 반드시 주석으로 의도 설명
- TODO는 `// TODO:` 형식 사용

```typescript
// TODO: 영상 파일 썸네일 추출 후 Base64 변환 구현 필요
```
