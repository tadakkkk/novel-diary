# Glossary — Novel Diary App

> Phase 1 산출물. 프로젝트 전반에서 사용하는 용어를 통일합니다.

---

## 비즈니스 용어 (도메인 내부 용어)

| 한국어 | 영어 (코드명) | 정의 | 글로벌 표준 매핑 |
|--------|-------------|------|----------------|
| 땔감 | `Kindling` | 사용자가 입력하는 하루의 사건/일화 조각 한 개 | UserInput, Event |
| 모닥불 | `Bonfire` | 땔감들이 쌓이는 하루 단위 세션의 UI 상태 | Session |
| 불꽃 단계 | `FlameLevel` | 현재 세션에 쌓인 땔감 수에 따라 결정되는 불꽃 강도 (0~5) | Progress |
| 참고 문체 | `StyleReference` | 사용자가 업로드한 문체 학습용 텍스트 샘플 | WritingStyle, Template |
| 소설 일기 | `NovelDiary` | AI가 생성한 소설 문체의 일기 최종 결과물 | GeneratedContent |
| 가공 정도 | `ProcessingLevel` | 담백 ↔ 극적 스펙트럼 (1~5 슬라이더) | Intensity, Dramaturgy |
| 서술 시점 | `Perspective` | 소설 일기의 서술 시점. 4가지 선택지 — 자세한 설명은 아래 '서술 시점 상세' 참조 | Narrative Perspective |
| 대표 이미지 | `KeyImage` | 하루의 분위기를 대표하는 이미지 1장. 장면 묘사용 MediaAttachment와 별개이며, Claude가 색감·빛·공간감 등 하루의 감각적 분위기를 포착하는 데 활용 | Mood Image, Thumbnail |
| 연속성 맥락 | `ContinuityContext` | 이전 일기와 자연스럽게 연결되기 위한 요약 컨텍스트 | Context Window, History |
| 주인공 | `Protagonist` | 항상 앱 사용자 본인 | User |
| 생성 조건 | `GenerationThreshold` | 일기 생성 버튼이 활성화되기 위한 최소 땔감 수 (기본값: 3) | Minimum Requirement |

---

## 서술 시점 상세 (Perspective)

| 코드값 | 한국어 | 예시 문장 | 느낌 |
|--------|--------|----------|------|
| `'1인칭주인공'` | 1인칭 주인공 | "나는 오늘 그 골목 앞에서 오래 서 있었다." | 가장 내밀하고 주관적. 화자의 감정·생각이 직접 노출됨. 독자와 거리가 가장 가깝다. |
| `'1인칭관찰자'` | 1인칭 관찰자 | "나는 그가 천천히 문을 닫는 것을 지켜봤다." | 화자는 등장하되 주인공을 외부에서 관찰. 자신의 행동보다 주변 묘사 중심. 감정적 거리가 생겨 쓸쓸한 톤이 나기 쉽다. |
| `'3인칭관찰자'` | 3인칭 관찰자 | "그녀는 우산을 접고 계단을 올랐다." | 카메라처럼 외부에서 관찰. 인물의 내면은 서술하지 않고 행동·장면만 묘사. 영화적·건조한 느낌. |
| `'3인칭전지적'` | 3인칭 전지적 | "그날 그가 몰랐던 것은, 그게 마지막이라는 사실이었다." | 인물의 내면까지 꿰뚫는 전지적 화자. 소설적 서술의 전형. 드라마틱한 복선·아이러니 연출에 가장 유리. |

---

## 글로벌 표준 용어

| 용어 | 정의 | 참조 |
|------|------|------|
| UUID | 범용 고유 식별자 | RFC 4122 |
| localStorage | 브라우저 로컬 저장소 (MVP 저장소) | Web Storage API |
| Prompt | Claude API에 전달하는 지시문 | Anthropic Docs |
| Token | Claude API 처리 단위 (비용·길이 측정) | Anthropic Docs |
| Base64 | 이미지/파일 인코딩 형식 | RFC 4648 |
| Blob URL | 브라우저 내 임시 파일 URL | File API |

---

## 용어 사용 규칙

1. **코드**: 영어 코드명 사용 (`Kindling`, `StyleReference`, `NovelDiary`)
2. **UI/UX**: 한국어 사용 (땔감, 참고 문체, 소설 일기)
3. **API 응답**: snake_case 글로벌 표준 (`kindling_id`, `style_reference_id`)
4. **주석/문서**: 한국어 설명 + 영어 코드명 병기
