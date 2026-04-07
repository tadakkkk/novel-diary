# API Spec — 타닥타닥 (Phase 4)

> Phase 4 산출물. bkend.ai Service API + Claude API 호출 명세.
> Base URL은 `get_context` MCP 도구로 획득. 일반적으로 `https://api-client.bkend.ai/v1`.

---

## 공통

### Required Headers (bkend.ai)

```
x-project-id: {projectId}
x-environment: dev | staging | prod
Authorization: Bearer {accessToken}   # 인증 필요 엔드포인트
```

### 응답 ID 필드

bkend.ai는 `id` 필드를 사용한다 (`_id` 아님).

### 에러 코드

| HTTP | 상황 | 대응 |
|------|------|------|
| 401 | 토큰 만료 | POST /v1/auth/refresh 후 재시도 |
| 403 | 권한 없음 | RBAC 설정 확인 |
| 409 | Unique 충돌 | 중복 데이터 확인 |
| 429 | Rate limit | Retry-After 헤더 확인 |

---

## 1. Auth API (bkend 내장)

MVP는 이메일/패스워드 인증만 사용. 소셜 로그인은 Phase 7+에서 추가.

### 1-1. 회원가입

```
POST /v1/auth/email/signup
Body: { email, password }
Response: { user: { id, email }, accessToken, refreshToken }
```

### 1-2. 로그인

```
POST /v1/auth/email/signin
Body: { email, password }
Response: { user: { id, email }, accessToken, refreshToken }
```

### 1-3. 현재 사용자 조회

```
GET /v1/auth/me
Response: { id, email, createdAt }
```

### 1-4. 토큰 갱신

```
POST /v1/auth/refresh
Body: { refreshToken }
Response: { accessToken, refreshToken }
```

### 1-5. 로그아웃

```
POST /v1/auth/signout
```

---

## 2. User Profile API

### 2-1. 프로필 조회

```
GET /v1/data/user_profiles?filter[userId]={userId}
Response: { data: [UserProfile] }
```

### 2-2. 프로필 생성 (최초 가입 시)

```
POST /v1/data/user_profiles
Body: { userId, nickname: '' }
Response: UserProfile
```

### 2-3. 프로필 수정 (닉네임 변경 등)

```
PATCH /v1/data/user_profiles/{id}
Body: { nickname?, blockedCharacters? }
Response: UserProfile
```

---

## 3. Style Reference API

### 3-1. 목록 조회

```
GET /v1/data/style_references?sort=createdAt:desc
Response: { data: StyleReference[], total: number }
```

### 3-2. 생성

```
POST /v1/data/style_references
Body: { title, content, excerpt }
Response: StyleReference
```

클라이언트 처리:
- `excerpt` = `content.slice(0, 200)`
- 저장 전 목록 수 확인 (최대 10개 제한)

### 3-3. 삭제

```
DELETE /v1/data/style_references/{id}
```

---

## 4. Diary Session API

### 4-1. 오늘 세션 조회 (없으면 생성)

```
GET /v1/data/diary_sessions?filter[date]={YYYY-MM-DD}
```

세션이 없으면 클라이언트가 4-2로 생성.

### 4-2. 세션 생성

```
POST /v1/data/diary_sessions
Body: { date, status: 'collecting', kindlingCount: 0, flameLevel: 0 }
Response: DiarySession
```

### 4-3. 세션 상태 업데이트

```
PATCH /v1/data/diary_sessions/{id}
Body: { status?, kindlingCount?, flameLevel?, keyImageId?, generatedDiaryId? }
Response: DiarySession
```

FlameLevel 계산은 클라이언트에서 수행 (`calcFlameLevel(count)` → lib/constants).

---

## 5. Kindling API

### 5-1. 세션별 땔감 목록

```
GET /v1/data/kindlings?filter[sessionId]={sessionId}&sort=order:asc
Response: { data: Kindling[] }
```

### 5-2. 땔감 추가

```
POST /v1/data/kindlings
Body: { sessionId, text, order }
Response: Kindling
```

추가 후 클라이언트:
1. `kindlingCount` 업데이트 → `calcFlameLevel` → `diary_sessions PATCH`

### 5-3. 땔감 삭제

```
DELETE /v1/data/kindlings/{id}
```

삭제 후 클라이언트:
1. 남은 kindlings의 `order` 재정렬 (필요시 PATCH)
2. `kindlingCount` 업데이트 → session PATCH

---

## 6. Key Image API

### 6-1. 파일 업로드 (3단계 presigned URL)

```
# Step 1: presigned URL 발급
POST /v1/files/presigned-url
Body: { fileName, contentType, size, category: 'images' }
Response: { url, fileId }

# Step 2: S3에 직접 업로드
PUT {url}
Headers: { Content-Type: {contentType} }
Body: (binary)

# Step 3: 메타데이터 등록
POST /v1/files
Body: { fileId, fileName, contentType, size, visibility: 'private' }
Response: { id, url, ... }
```

### 6-2. 대표 이미지 레코드 생성

```
POST /v1/data/key_images
Body: { sessionId, fileId, fileUrl, fileName, fileSizeBytes }
Response: KeyImage
```

생성 후 session PATCH로 `keyImageId` 연결.

### 6-3. AI 분위기 묘사 저장

Claude API 호출 (클라이언트) → 결과를:

```
PATCH /v1/data/key_images/{id}
Body: { aiAtmosphereDescription }
```

### 6-4. 대표 이미지 삭제

```
DELETE /v1/data/key_images/{id}
DELETE /v1/files/{fileId}
```

이후 session PATCH로 `keyImageId: null`.

---

## 7. Media Attachment API

### 7-1. 파일 업로드 (presigned URL, Key Image와 동일 패턴)

```
POST /v1/files/presigned-url
Body: { fileName, contentType, size, category: 'images' | 'media' }
```

### 7-2. 첨부 레코드 생성

```
POST /v1/data/media_attachments
Body: { sessionId, kindlingId, type, fileId, fileUrl, fileName, fileSizeBytes }
Response: MediaAttachment
```

저장 전 클라이언트가 세션 내 첨부 수 확인 (최대 3개).

### 7-3. AI 장면 묘사 저장

```
PATCH /v1/data/media_attachments/{id}
Body: { aiDescription }
```

### 7-4. 첨부 삭제

```
DELETE /v1/data/media_attachments/{id}
DELETE /v1/files/{fileId}
```

---

## 8. Novel Diary API

### 8-1. 타임라인 목록 (최신순)

```
GET /v1/data/novel_diaries?sort=sessionDate:desc&page=1&limit=20
Response: { data: NovelDiary[], total: number }
```

### 8-2. 단일 일기 조회

```
GET /v1/data/novel_diaries/{id}
Response: NovelDiary
```

### 8-3. 일기 저장 (생성 완료 후)

```
POST /v1/data/novel_diaries
Body: {
  sessionId,
  sessionDate,
  content,
  wordCount,
  continuityContext,
  previousDiaryId?,
  kindlingSnapshot,
  characterIds,
  genStyleReferenceId?,
  genPerspective,
  genProcessingLevel,
  genDuration,
  keyImageId?
}
Response: NovelDiary
```

저장 후 클라이언트:
1. session PATCH: `{ status: 'generated', generatedDiaryId: diary.id }`

### 8-4. 일기 삭제

```
DELETE /v1/data/novel_diaries/{id}
```

---

## 9. Character API

### 9-1. 등장인물 목록

```
GET /v1/data/characters?sort=createdAt:desc
Response: { data: Character[] }
```

### 9-2. 등장인물 Upsert (일기 생성 후 자동 처리)

이름 기준 조회 후 분기:

```
# 없으면 생성
POST /v1/data/characters
Body: { name, relationship, gender, appearances, episodes, avatarData }

# 있으면 업데이트 (appearances, episodes 누적)
PATCH /v1/data/characters/{id}
Body: { appearances, episodes, avatarData? }
```

### 9-3. 아바타 데이터 업데이트 (재생성)

```
PATCH /v1/data/characters/{id}
Body: { avatarData: { hairColor, skinTone, eyeColor, clothColor } }
```

### 9-4. 등장인물 차단/해제

```
# 차단: user_profiles의 blockedCharacters에 이름 추가
PATCH /v1/data/user_profiles/{profileId}
Body: { blockedCharacters: [...existingList, name] }

# characters 레코드의 isBlocked 업데이트
PATCH /v1/data/characters/{id}
Body: { isBlocked: true }
```

### 9-5. 등장인물 삭제

```
DELETE /v1/data/characters/{id}
```

---

## 10. Claude API 호출 (클라이언트 직접)

> MVP 단계: 클라이언트에서 직접 호출. Phase 9에서 서버 프록시 전환 검토.
> 참조: `src/services/claude/` (mockup의 claude.js 패턴 유지)

| 시나리오 | 함수 | 입력 | 출력 |
|---------|------|------|------|
| 대표 이미지 분위기 묘사 | `describeMedia(dataUrl, 'keyImage')` | 이미지 base64 | `aiAtmosphereDescription` → key_images PATCH |
| 첨부 이미지 장면 묘사 | `describeMedia(dataUrl, 'scene')` | 이미지 base64 | `aiDescription` → media_attachments PATCH |
| 소설 일기 생성 | `generateDiary(options)` | 땔감 목록 + 옵션 + 이미지 | `content` + `continuityContext` |
| 등장인물 추출 | `extractCharacters(content, date)` | 일기 본문 | `Character[]` → characters upsert |
| 아바타 색상 재생성 | `describeAvatarColors(character)` | 인물 정보 | `avatarData` → characters PATCH |
| 독자 반응 생성 | `generateReviews(diaries)` | 최근 일기 목록 | `{ comments, rating, criticReview }` |

---

## 11. 생성 파이프라인 (diary.html → React 전환 시 `useDiaryGeneration`)

```
1.  diary_sessions 조회 + kindlings 목록 조회
2.  key_images 조회 (있으면)
3.  media_attachments 조회 (있으면)
4.  style_references 로드 (선택된 ID 기준)
5.  최신 novel_diaries 조회 → previousDiaryId, continuityContext 추출
6.  [Claude] keyImage 있으면 → describeMedia('keyImage') → key_images PATCH
7.  [Claude] attachments 있으면 → 각각 describeMedia('scene') → media_attachments PATCH
8.  [Claude] generateDiary(모든 옵션 조합) → content + continuityContext
9.  [Claude] extractCharacters(content, date) → Character[]
10. characters upsert (POST or PATCH per character)
11. POST /v1/data/novel_diaries → diary 저장
12. PATCH diary_sessions/{id} → status: 'generated'
```
