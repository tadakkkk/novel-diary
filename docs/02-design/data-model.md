# Data Model — 타닥타닥 (bkend.ai)

> Phase 4 산출물. bkend.ai 기준 컬렉션 설계.
> localStorage MVP 스키마(schema.md)를 기반으로 bkend.ai 테이블로 전환한다.

---

## 엔티티 → 테이블 매핑

| Phase 3 localStorage 키 | bkend.ai 테이블 | 비고 |
|------------------------|----------------|------|
| `tadak:user` + `tadak:user-prefs` | bkend 내장 Auth User + `user_profiles` | Auth는 bkend 내장 사용 |
| `tadak:style-refs` | `style_references` | content는 Storage로 분리 고려 |
| `tadak:sessions` | `diary_sessions` | |
| `tadak:kindlings:{id}` | `kindlings` | sessionId FK로 쿼리 |
| `tadak:attachments:{id}` | `media_attachments` | 파일 본문은 bkend Storage |
| `tadak:key-image:{id}` | `key_images` | 파일 본문은 bkend Storage |
| `tadak:diaries` | `novel_diaries` | |
| `tadak:characters` | `characters` | |
| `tadak:blocked-chars` | `user_profiles.blockedCharacters` | 배열 필드로 내장 |

---

## 테이블 상세 스키마

> **공통 자동 필드**: `id` (String, auto), `createdBy` (String, auto), `createdAt` (Date, auto), `updatedAt` (Date, auto)

---

### `user_profiles`

bkend Auth User를 보완하는 프로필 테이블. 앱 전용 설정 저장.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `userId` | String | required, unique | bkend Auth User.id (FK) |
| `nickname` | String | | 3인칭 서술 시 사용할 주인공 이름 |
| `blockedCharacters` | Array | default: [] | 등장인물 등록 차단 이름 목록 |

**RBAC**: self (본인만 읽기/쓰기)

---

### `style_references`

사용자가 업로드한 문체 학습용 텍스트.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `title` | String | required | 예: "내가 쓴 단편소설" |
| `content` | String | required, maxLength: 10000 | 원문 텍스트 |
| `excerpt` | String | required | UI 미리보기용 앞 200자 |

**제약**:
- 사용자당 최대 10개 (앱 레이어에서 강제)
- `createdBy` 기반 자동 소유자 필터링

**RBAC**: self (본인만 CRUD)

**인덱스**: `createdBy` (목록 조회 성능)

---

### `diary_sessions`

하루 단위 모닥불 세션. 땔감 수집 상태 컨테이너.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `date` | String | required | YYYY-MM-DD (하루 1개) |
| `status` | String | required, default: 'collecting' | collecting / ready / generated |
| `kindlingCount` | Number | required, default: 0 | 현재 땔감 수 (캐시) |
| `flameLevel` | Number | required, default: 0 | 0~5 (UI 불꽃 강도) |
| `keyImageId` | String | | key_images.id FK (optional) |
| `generatedDiaryId` | String | | novel_diaries.id FK (optional) |

**제약**:
- 사용자+날짜 조합 unique (앱 레이어에서 강제)

**RBAC**: self (본인만 CRUD)

**인덱스**: `createdBy + date` (날짜 조회)

---

### `kindlings`

사용자가 입력한 하나의 사건/일화 조각.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `sessionId` | String | required | diary_sessions.id FK |
| `text` | String | required, maxLength: 500 | 사건 텍스트 |
| `order` | Number | required | 세션 내 입력 순서 (0-indexed) |

**RBAC**: self (본인만 CRUD)

**인덱스**: `sessionId` (세션별 목록 조회)

---

### `media_attachments`

땔감에 첨부하는 장면 묘사용 미디어. 파일 본문은 bkend Storage.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `sessionId` | String | required | diary_sessions.id FK |
| `kindlingId` | String | required | kindlings.id FK |
| `type` | String | required | 'image' / 'video' |
| `fileId` | String | required | bkend Storage 파일 ID |
| `fileUrl` | String | required | bkend Storage CDN URL (public) 또는 presigned |
| `fileName` | String | required | 원본 파일명 |
| `fileSizeBytes` | Number | required | |
| `aiDescription` | String | | Claude가 생성한 시각·청각적 묘사 |

**제약**:
- 세션 합산 최대 3개 (앱 레이어에서 강제)
- 이미지: JPG/PNG/WEBP, 최대 5MB
- 영상: MP4, 최대 50MB

**RBAC**: self (본인만 CRUD)

**인덱스**: `sessionId`

---

### `key_images`

하루의 분위기를 담은 대표 이미지. `media_attachments`와 별도.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `sessionId` | String | required, unique | diary_sessions.id FK (1:1) |
| `fileId` | String | required | bkend Storage 파일 ID |
| `fileUrl` | String | required | bkend Storage CDN URL |
| `fileName` | String | required | |
| `fileSizeBytes` | Number | required | |
| `aiAtmosphereDescription` | String | | Claude가 생성한 분위기 묘사 |

**제약**:
- 세션당 1개 (unique sessionId)
- 이미지만 허용: JPG/PNG/WEBP, 최대 5MB

**RBAC**: self (본인만 CRUD)

---

### `novel_diaries`

Claude가 생성한 소설 문체 일기 최종 결과물.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `sessionId` | String | required, unique | diary_sessions.id FK (1:1) |
| `sessionDate` | String | required | YYYY-MM-DD (타임라인 정렬용 비정규화) |
| `content` | String | required | 생성된 소설 일기 본문 |
| `wordCount` | Number | required | |
| `continuityContext` | String | required | 다음 일기 생성을 위한 요약 (Claude 생성) |
| `previousDiaryId` | String | | 이전 일기 ID (연속성 연결) |
| `kindlingSnapshot` | Array | required | 생성 시 땔감 텍스트 목록 (비정규화, 읽기 전용 표시용) |
| `characterIds` | Array | default: [] | characters.id[] (추출된 등장인물) |
| `genStyleReferenceId` | String | | 생성 시 선택한 style_references.id |
| `genPerspective` | String | required | 1인칭주인공 / 1인칭관찰자 / 3인칭관찰자 / 3인칭전지적 |
| `genProcessingLevel` | Number | required | 1~5 |
| `genDuration` | String | required | 하루 / 2~3일 / 일주일 / 한 달 / 그 이상 / custom |
| `keyImageId` | String | | key_images.id (생성 시 사용한 대표 이미지) |

**RBAC**: self (본인만 CRUD)

**인덱스**: `createdBy + sessionDate desc` (타임라인 목록)

---

### `characters`

일기에서 추출된 등장인물 누적 레코드.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `name` | String | required | 이름 또는 호칭 |
| `relationship` | String | | 주인공과의 관계 |
| `gender` | String | | male / female / unknown |
| `appearances` | Array | default: [] | 등장 날짜 목록 (YYYY-MM-DD[]) |
| `episodes` | Array | default: [] | 에피소드 요약 [{date, summary}], 최대 20개 |
| `avatarData` | Object | | { hairColor, skinTone, eyeColor, clothColor } |
| `isBlocked` | Boolean | default: false | 등록 차단 여부 |

**제약**:
- 사용자+이름 조합 unique (앱 레이어에서 upsert 처리)

**RBAC**: self (본인만 CRUD)

**인덱스**: `createdBy` (목록 조회)

---

## 파일 저장소 (bkend Storage) 구성

| 카테고리 | 용도 | visibility | 크기 제한 |
|---------|------|-----------|----------|
| `images` | key_images, media_attachments(이미지) | private | 5MB |
| `media` | media_attachments(영상) | private | 50MB |

> **MVP 단계**: public visibility로 시작해서 URL을 DB에 저장. 추후 private으로 전환 시 presigned URL 패턴 적용.

---

## 관계 다이어그램

```
Auth User
 ├── user_profiles (1:1, userId FK)
 ├── style_references (1:N, createdBy)
 ├── diary_sessions (1:N, createdBy)
 │    ├── kindlings (1:N, sessionId FK)
 │    ├── media_attachments (1:N, sessionId FK)
 │    │    └── kindlings (N:1, kindlingId FK)
 │    ├── key_images (1:1, sessionId FK)
 │    └── novel_diaries (1:1, sessionId FK)
 │         └── characters (N:M, characterIds array)
 └── characters (1:N, createdBy)
```
