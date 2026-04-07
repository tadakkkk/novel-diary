# Schema — Novel Diary App

> Phase 1 산출물. 앱의 핵심 엔티티와 데이터 구조를 정의합니다.
> 저장소: localStorage (MVP), 향후 bkend.ai 마이그레이션 고려

---

## 엔티티 관계도

```
User
 ├── StyleReference[]     (참고 문체 목록)
 └── DiarySession[]       (날짜별 모닥불 세션)
      ├── Kindling[]       (땔감 목록)
      │    └── MediaAttachment[]  (장면 묘사용 미디어, 최대 3개/세션)
      ├── KeyImage?        (대표 이미지, 1개/세션 — 분위기 묘사용)
      └── NovelDiary?      (생성된 소설 일기, 1개)
           └── GenerationOptions (생성 시 선택한 옵션)
```

---

## 엔티티 정의

### User

앱 사용자 (= 소설 일기의 주인공)

```typescript
interface User {
  id: string;           // UUID
  name: string;         // 주인공 이름 (일기에 사용)
  createdAt: string;    // ISO 8601
}
```

---

### StyleReference (참고 문체)

사용자가 업로드한 문체 학습용 텍스트. Claude가 이 글의 문체를 분석해 일기 생성에 반영한다.

```typescript
interface StyleReference {
  id: string;           // UUID
  userId: string;
  title: string;        // 예: "내가 쓴 단편소설", "좋아하는 작가 문체"
  content: string;      // 업로드한 원문 텍스트 (최대 10,000자)
  excerpt: string;      // UI 미리보기용 앞 200자
  createdAt: string;    // ISO 8601
}
```

**제약 조건:**
- `content` 최대 10,000자 (Claude 컨텍스트 비용 고려)
- 사용자당 최대 10개

---

### DiarySession (모닥불 세션)

하루 단위의 일기 작성 세션. 땔감을 담는 그릇이자 모닥불 UI의 상태 컨테이너.

```typescript
interface DiarySession {
  id: string;           // UUID
  userId: string;
  date: string;         // YYYY-MM-DD (하루 1개)
  status: SessionStatus;
  kindlingCount: number; // 현재 땔감 수 (캐시)
  flameLevel: FlameLevel; // 0~5 (UI 불꽃 강도)
  keyImage?: KeyImage;  // 하루 대표 이미지 (분위기 묘사용, 선택)
  generatedDiary?: NovelDiary;
  createdAt: string;
  updatedAt: string;
}

type SessionStatus =
  | 'collecting'   // 땔감 수집 중 (기본)
  | 'ready'        // GenerationThreshold 이상 → 생성 버튼 활성화
  | 'generated';   // 일기 생성 완료

type FlameLevel = 0 | 1 | 2 | 3 | 4 | 5;
// 0: 불씨 없음, 1~2: 약한 불, 3~4: 중간 불, 5: 활활
```

**FlameLevel 계산 기준:**

| 땔감 수 | FlameLevel |
|--------|-----------|
| 0 | 0 |
| 1 | 1 |
| 2 | 2 |
| 3~4 | 3 (생성 가능) |
| 5~6 | 4 |
| 7+ | 5 |

---

### Kindling (땔감)

사용자가 입력한 하나의 사건/일화 조각.

```typescript
interface Kindling {
  id: string;           // UUID
  sessionId: string;
  text: string;         // 사건 텍스트 (최대 500자)
  order: number;        // 세션 내 입력 순서 (0-indexed)
  mediaAttachments: MediaAttachment[]; // 최대 3개/세션 공유
  createdAt: string;
}
```

**제약 조건:**
- `text` 최대 500자
- 세션당 땔감 수 제한 없음

---

### MediaAttachment (미디어 첨부)

땔감에 첨부하는 이미지 또는 영상. AI가 시각·청각적 묘사로 변환한다.

```typescript
interface MediaAttachment {
  id: string;           // UUID
  sessionId: string;    // 세션 단위로 최대 3개 제한
  kindlingId: string;   // 연결된 땔감
  type: 'image' | 'video';
  dataUrl: string;      // Base64 데이터 URL (localStorage 저장)
  fileName: string;
  fileSizeBytes: number;
  aiDescription?: string; // Claude가 생성한 시각·청각적 묘사
  createdAt: string;
}
```

**제약 조건:**
- 세션 전체 합산 최대 3개
- 이미지: JPG/PNG/WEBP, 최대 5MB
- 영상: MP4, 최대 50MB (썸네임 추출 후 처리)

---

### KeyImage (대표 이미지)

하루의 분위기를 담은 이미지 1장. `MediaAttachment`(땔감에 연결된 장면 묘사용)와 역할이 다르다.
Claude가 이 이미지를 분석해 색감·빛·공간감 등 하루 전체의 감각적 분위기를 포착하고, 일기 생성 시 배경 묘사에 활용한다.

```typescript
interface KeyImage {
  id: string;                       // UUID
  sessionId: string;
  dataUrl: string;                  // Base64 데이터 URL (localStorage 저장)
  fileName: string;
  fileSizeBytes: number;
  aiAtmosphereDescription?: string; // Claude가 생성한 분위기 묘사
                                    // (색감·빛·공간감·계절감 등 시각적 감각)
  createdAt: string;
}
```

**제약 조건:**
- 세션당 1개 (optional)
- 이미지만 허용: JPG/PNG/WEBP, 최대 5MB
- `MediaAttachment`와 독립적 — 땔감에 종속되지 않음

**MediaAttachment와 차이:**

| | `MediaAttachment` | `KeyImage` |
|-|------------------|------------|
| 목적 | 특정 장면의 시각·청각 묘사 | 하루 전체 분위기 포착 |
| 연결 대상 | 특정 `Kindling` | `DiarySession` 전체 |
| 개수 제한 | 세션 합산 최대 3개 | 1개 |
| 파일 형식 | 이미지 + 영상 | 이미지만 |
| AI 묘사 포커스 | 사건의 시각·청각 디테일 | 색감, 빛, 공간감, 계절감 |

---

### GenerationOptions (생성 옵션)

일기 생성 시 사용자가 선택하는 옵션.

```typescript
interface GenerationOptions {
  styleReferenceId: string | null; // null이면 기본 문체
  processingLevel: ProcessingLevel; // 1~5
  perspective: Perspective;
}

type ProcessingLevel = 1 | 2 | 3 | 4 | 5;
// 1: 담백하게, 3: 보통, 5: 극적으로

type Perspective =
  | '1인칭주인공'    // "나는 오늘..." — 가장 내밀하고 주관적
  | '1인칭관찰자'    // "나는 그를 지켜봤다..." — 자신이 관찰자로 등장
  | '3인칭관찰자'    // "그녀는 걸었다..." — 영화적·건조한 외부 시선
  | '3인칭전지적';   // "그날 그가 몰랐던 것은..." — 전지적, 복선·아이러니 연출
```

---

### NovelDiary (소설 일기)

Claude가 생성한 소설 문체 일기 최종 결과물.

```typescript
interface NovelDiary {
  id: string;           // UUID
  sessionId: string;
  content: string;      // 생성된 소설 일기 본문
  generationOptions: GenerationOptions;
  continuityContext: string; // 다음 일기 생성을 위한 요약 (Claude가 함께 생성)
  previousDiaryId?: string;  // 연속성 연결
  wordCount: number;
  createdAt: string;
}
```

---

## localStorage 키 구조

```
novel-diary:user                      → User
novel-diary:style-references          → StyleReference[]
novel-diary:sessions                  → DiarySession[]
novel-diary:kindlings:{sessionId}     → Kindling[]
novel-diary:attachments:{sessionId}   → MediaAttachment[]
novel-diary:key-image:{sessionId}     → KeyImage
novel-diary:diaries                   → NovelDiary[]
```

---

## 생성 조건 (GenerationThreshold)

```
DEFAULT_GENERATION_THRESHOLD = 3  // 땔감 3개 이상 시 생성 버튼 활성화
```

---

## Claude API 호출 시나리오

| 시나리오 | 입력 | 출력 |
|----------|------|------|
| 미디어 묘사 변환 | 이미지/영상 + "이 장면의 시각·청각적 디테일을 묘사해줘" | `MediaAttachment.aiDescription` |
| 대표 이미지 분위기 묘사 | 이미지 + "색감·빛·공간감·계절감 등 분위기를 묘사해줘" | `KeyImage.aiAtmosphereDescription` |
| 소설 일기 생성 | 땔감 목록 + 대표 이미지 분위기 + 참고 문체 + 생성 옵션(perspective 포함) + 연속성 맥락 | `NovelDiary.content` + `continuityContext` |
