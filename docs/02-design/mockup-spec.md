# Mockup Spec — 타닥타닥 (Novel Diary App)

> Phase 3 산출물. 화면별 컴포넌트 구조와 Next.js 전환 매핑.

---

## 화면 목록

| 파일 | 화면 | 주요 기능 |
|------|------|----------|
| `mockup/pages/index.html` | 메인 모닥불 화면 | 땔감 입력, 불꽃 성장, 대표 이미지 업로드, 일기 생성 버튼 등장 |
| `mockup/pages/diary.html` | 일기 생성 옵션 + 결과 | 기간·시점·가공도·문체 선택 → Claude API 생성 → 등장인물 추출 |
| `mockup/pages/style-ref.html` | 참고 문체 관리 | 파일 업로드·텍스트 붙여넣기·목록·미리보기·삭제 (localStorage) |
| `mockup/pages/timeline.html` | 일기 타임라인 | 생성된 일기 목록, 대표 이미지 썸네일, 등장인물 픽셀 아바타 |

---

## 서비스 레이어

| 파일 | 역할 |
|------|------|
| `mockup/services/storage.js` | localStorage CRUD (prefix `tadak:`) |
| `mockup/services/claude.js` | Claude API 호출, 프롬프트 빌더, 비전 묘사, 등장인물 추출 |
| `mockup/services/avatar.js` | 16×16 픽셀 아바타 캔버스 렌더러 |
| `mockup/scripts/bonfire.js` | 픽셀 모닥불 애니메이션 (Canvas) |

---

## 화면 1: 메인 모닥불 (`index.html`)

### 레이아웃
```
[Header: 타닥타닥 | [타임라인] | [참고 문체]]
┌─────────────────────┬──────────────────┐
│  LEFT: Bonfire Stage │ RIGHT: 땔감 패널 │
│                      │                  │
│  날짜 (한국어 요일)   │ 패널 헤더 (카운트)│
│  🔥 모닥불 애니메이션 │                  │
│  불꽃 레벨 바         │ 땔감 목록 (스크롤)│
│  threshold 힌트       │                  │
│  대표 이미지 업로드   │ ──────────────── │
│                      │ 새 땔감 입력 폼  │
└─────────────────────┴──────────────────┘
[Floating: ▶ 일기 쓰기 ◀ (땔감 3개 이상 시 슬라이드 등장)]
```

### 상태 전환
| 땔감 수 | FlameLevel | 생성 버튼 | 힌트 텍스트 |
|--------|-----------|----------|------------|
| 0 | 0 | 숨김 | "땔감 3개 더 필요해요" |
| 1 | 1 | 숨김 | "땔감 2개 더 필요해요" |
| 2 | 2 | 숨김 | "땔감 1개 더 필요해요" |
| 3~4 | 3 | **등장** | "▶ 지금 일기를 쓸 수 있어요!" |
| 5~6 | 4 | 표시 | 동일 |
| 7+ | 5 | 표시 | 동일 |

### localStorage 연동
- 세션 ID: `YYYY-MM-DD` (오늘 날짜)
- 땔감: `tadak:kindlings:<sessionId>` — 앱 시작 시 복원
- 대표 이미지: `tadak:key-image:<sessionId>` — 앱 시작 시 복원

### 컴포넌트 → React 매핑
| Mockup 요소 | React 컴포넌트 | Props |
|------------|---------------|-------|
| `.bonfire-scene` | `features/bonfire/BonfireScene` | `flameLevel` |
| `#fire-canvas` | `features/bonfire/FlameAnimation` | `level: FlameLevel` |
| `.gauge-row` | `features/bonfire/FlameLevelBar` | `level, count` |
| `.generate-btn-wrap` | `features/diary/GenerateButton` | `visible: boolean`, `onClick` |
| `.kindling-item` | `features/kindling/KindlingItem` | `kindling: Kindling`, `onRemove` |
| `#kindling-input` | `features/kindling/KindlingInput` | `onAdd: (text) => void` |
| `.key-image-upload` | `features/media/KeyImageUploader` | `onUpload`, `keyImage?` |

---

## 화면 2: 일기 생성 (`diary.html`)

### 레이아웃
```
[Header: ← 모닥불로 | 날짜 배지 | 땔감 수 배지]
┌──────────────────┬───────────────────────────────┐
│  LEFT: 옵션 패널  │  RIGHT: 일기 결과 패널          │
│  (300px 고정)    │                               │
│  기간 선택        │  [빈 상태 — ASCII 불꽃]        │
│  서술 시점 (2×2)  │  → [생성 중 오버레이]          │
│  3인칭 닉네임 입력│  → [타이프라이터 출력]         │
│  가공 정도 슬라이더│                               │
│  참고 문체 다중선택│  등장인물 픽셀 아바타 그리드   │
│  + 새 문체 추가   │                               │
│                  │  [다시 생성 | 타임라인에 저장]  │
│  🔥 생성 버튼    │                               │
└──────────────────┴───────────────────────────────┘
```

### 생성 파이프라인 (`doGenerate()`)
```
1. API 키 확인 (없으면 입력 모달)
2. 대표 이미지 있으면 → Claude Vision API (keyImage 묘사)
3. 첨부 이미지 있으면 → Claude Vision API (scene 묘사, 각각)
4. localStorage에서 선택된 참고 문체 내용 로드
5. 이전 일기의 continuityContext 로드
6. buildDiaryPrompt() → 완성 프롬프트
7. Claude API 호출 (temperature: 0.95) → 타이프라이터 출력
8. continuityContext 생성 (두 번째 API 호출)
9. extractCharacters() → 등장인물 JSON 파싱
10. 등장인물 localStorage upsert + 픽셀 아바타 렌더링
11. saveDiary() — kindlings, characters, keyImage, options 포함 저장
```

### 생성 옵션 상세

#### 기간 (`duration`)
| 값 | 표시 |
|---|------|
| `하루` | 하루 |
| `2~3일` | 2~3일 |
| `일주일` | 일주일 |
| `한 달` | 한 달 |
| `그 이상` | 그 이상 |
| custom | 직접 입력 |

#### 서술 시점 (`perspective`)
| 값 | 설명 |
|---|------|
| `1인칭주인공` | "나는..." 가장 내밀하고 주관적 |
| `1인칭관찰자` | 화자가 주인공을 외부에서 관찰 |
| `3인칭관찰자` | 행동과 장면만 묘사, 영화적 |
| `3인칭전지적` | 전지적 화자, 복선·아이러니 가능 |

- `3인칭*` 선택 시 닉네임 입력 행 자동 표시
- 닉네임은 `tadak:user-prefs`에 저장

#### 가공 정도 (`processingLevel`: 1~5)
| 값 | 설명 |
|---|------|
| 1 | 매우 담백, 사실 위주 |
| 3 | 보통 (기본값) |
| 5 | 매우 극적, 문학적 표현 극대화 |

### 등장인물 추출 (`extractCharacters`)
- 일기 생성 후 자동 실행
- 주인공(화자) 제외, 등장 인물만 추출
- JSON 파싱: name, relationship, role, hairColor, skinTone, eyeColor, clothColor, gender
- localStorage `tadak:characters` upsert (appearances, episodes 누적)
- 16×16 픽셀 아바타 자동 생성 (4px/pixel → 64×64 canvas)
- ↺ 아바타 재생성 버튼: `describeAvatarColors()` → API → 재렌더

### 컴포넌트 → React 매핑
| Mockup 요소 | React 컴포넌트 | Props |
|------------|---------------|-------|
| `.dur-grid` | `features/diary/DurationSelector` | `value`, `onChange` |
| `.pv-grid` | `features/diary/PerspectiveSelector` | `value`, `onChange` |
| `#nickname-row` | `features/diary/NicknameInput` | `show: boolean`, `value`, `onChange` |
| `input[type=range]` | `features/diary/ProcessingLevelSlider` | `value`, `onChange` |
| `.sr-list` | `features/diary/StyleRefSelector` | `refs`, `selected: Set<string>`, `onChange` |
| `#add-sr-form` | `features/style-ref/InlineStyleRefForm` | `onSave` |
| `.gen-overlay` | `features/diary/GeneratingOverlay` | `visible`, `step` |
| `.diary-content` | `features/diary/DiaryContent` | `content`, `isTyping` |
| `.char-grid` | `features/character/CharacterGrid` | `characters: Character[]` |
| `.char-card` | `features/character/CharacterCard` | `character`, `onRegenAvatar`, `onOpenModal` |
| `.modal-overlay` | `features/character/CharacterModal` | `character`, `onClose` |

---

## 화면 3: 참고 문체 (`style-ref.html`)

### 기능
- `.txt` / `.md` 파일 업로드 → FileReader → localStorage 저장 (최대 10,000자)
- 텍스트 직접 붙여넣기 → 저장
- 목록 표시: 제목, 글자 수, 본문 3줄 미리보기
- 미리보기 모달 (전체 내용)
- 삭제 (확인 다이얼로그)
- 최대 10개 제한

### localStorage
- `tadak:style-refs` — StyleReference[] 배열
- `{ id, title, content, createdAt }`

### 컴포넌트 → React 매핑
| Mockup 요소 | React 컴포넌트 | Props |
|------------|---------------|-------|
| `.upload-zone` | `features/style-ref/StyleRefUploader` | `onUpload` |
| `.paste-section` | `features/style-ref/StyleRefPasteForm` | `onSave` |
| `.sr-card` | `features/style-ref/StyleRefCard` | `ref: StyleReference`, `onDelete`, `onPreview` |
| `#preview-modal` | `features/style-ref/StyleRefPreviewModal` | `ref`, `onClose` |

---

## 화면 4: 일기 타임라인 (`timeline.html`)

### 레이아웃
```
[Header: 타닥타닥 ← 모닥불로]
N DIARIES                          [▸ 새 일기 쓰기]
┌──────────────────────────────────────────────────┐
│  YYYY.MM.DD  기간  시점  땔감 N개                  │
│  일기 첫 2줄 미리보기 텍스트...                    │  [썸네일]
│  [👤 이름] [👤 이름] [👤 이름]                    │
└──────────────────────────────────────────────────┘
(반복)
```

### 일기 카드 상세
- 날짜, 기간, 시점, 땔감 수 메타 표시
- 일기 본문 첫 2줄 미리보기 (120자 truncate)
- 우측: KeyImage 썸네일 (110px, object-fit: cover) / 없으면 NO IMAGE
- 하단: 등장인물 픽셀 아바타 32×32, 최대 6명 + `+N` 오버플로우
- 카드 클릭 → 전체 일기 모달

### 전체 일기 모달
- KeyImage 풀 와이드 (있을 경우)
- 날짜, 시점, 기간, 땔감 수 헤더
- 일기 전문 (pre-wrap, keep-all)
- 등장인물 섹션: 48×48 아바타 + 이름 + 관계
- 땔감 섹션: 번호 + 내용 목록
- ESC / 배경 클릭으로 닫기

### 컴포넌트 → React 매핑
| Mockup 요소 | React 컴포넌트 | Props |
|------------|---------------|-------|
| `.diary-card` | `features/timeline/DiaryCard` | `diary: NovelDiary`, `onClick` |
| `.card-thumb` | `features/timeline/DiaryThumbnail` | `keyImage?: string` |
| `.card-chars` | `features/timeline/CharacterAvatarRow` | `characters: Character[]`, `max?: number` |
| `#diary-modal` | `features/timeline/DiaryDetailModal` | `diary`, `onClose` |

---

## 디자인 토큰 (CSS Variables → Tailwind 커스텀)

| CSS 변수 | 값 | 용도 |
|---------|---|------|
| `--black` | `#050301` | 페이지 배경 |
| `--white` | `#f8f0e3` | 테두리, 강조 텍스트 |
| `--fire-tip` | `#ffe680` | 불꽃 끝 (게이지 밝음) |
| `--fire-amb` | `#ffaa00` | 불꽃 중간 (주요 강조) |
| `--fire-org` | `#ff5a00` | 불꽃 아래 (버튼, 태그) |
| `--fire-red` | `#cc1100` | 불씨 (경고) |
| `--gray-2` | `#1e1e1e` | 구분선 |
| `--gray-3` | `#333333` | 비활성 테두리 |
| `--gray-4` | `#666666` | 보조 텍스트 |
| `--gray-5` | `#cccccc` | 본문 텍스트 |
| `--text-off` | `#444444` | 힌트, 비활성 |
| `--font-pixel` | `'Press Start 2P'` | 레이블, 태그 (영문) |
| `--font-korean` | `system-ui` | 본문, 입력 (한국어) |

### Pixel Border (Double Border 패턴)
```css
border: 3px solid var(--white);
box-shadow: inset 0 0 0 2px var(--white), inset 0 0 0 5px var(--black);
```

---

## 인터랙션 정의

| 동작 | 트리거 | 결과 |
|------|--------|------|
| 땔감 추가 | 추가 버튼 클릭 / Ctrl+Enter | 목록 카드 + FlameLevel 업 + 스파크 파티클 |
| 땔감 3개 달성 | count >= 3 | 생성 버튼 아래→위 슬라이드인 |
| 일기 생성 클릭 | 버튼 클릭 | `diary.html?session=<date>` 이동 |
| 생성 버튼 (diary.html) | 클릭 | API 키 확인 → Vision → Claude API → 타이프라이터 |
| 3인칭 시점 선택 | `.pv-card` 클릭 | 닉네임 입력 행 `.show` 추가 |
| 참고 문체 선택 | `.sr-item` 클릭 | toggle `.sel`, selectedRefs Set 업데이트 |
| 아바타 재생성 | ↺ 클릭 | `describeAvatarColors()` → 캔버스 재렌더 |
| 등장인물 클릭 | `.char-card` 클릭 | 캐릭터 상세 모달 (appearances, episodes) |
| 일기 저장 | "타임라인에 저장" 클릭 | `saveDiary()` → `timeline.html` 이동 |
| 타임라인 카드 클릭 | 클릭 | 전체 일기 모달 오픈 |
| 모달 닫기 | ESC / 배경 클릭 | 모달 닫기 |
