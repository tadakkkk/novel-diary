// ── 프롬프트 세트 공용 타입 ────────────────────────────────────────────────
// claude-service.ts의 언어별 프롬프트 분리를 위한 인터페이스.
import { type Kindling, type Perspective, type ProcessingLevel, type StyleReference } from '@/types'

export interface BuildPromptOptions {
  kindlings: Kindling[]
  perspective: Perspective
  processingLevel: ProcessingLevel
  styleRefs?: StyleReference[]
  weather?: string | null
  nickname?: string | null
  continuityContext?: string | null
  keyImageDescription?: string | null
  mediaDescriptions?: string[]
}

// 동일인 매칭 정확도를 위해 프롬프트에 포함할 기존 인물 요약
export interface ExistingCharacterHint {
  name: string
  relationship?: string
  aliases?: string[]
  episodes?: Array<{ date: string; summary: string }>
  appearances?: string[]
}

// generateReviews의 이전 결과 참조용 (부분 형태)
export interface ReviewResultLike {
  comments?: Array<{ text: string }>
  rating?: number
  criticReview?: string
}

export interface StatEntry {
  label: string
  value: number
}

// 언어별 프롬프트 세트. ko.ts / en.ts가 이 인터페이스를 구현한다.
export interface PromptSet {
  // 1. 소설(일기) 생성 — generateDiary
  diarySystemPrompt: string
  buildDiaryPrompt(opts: BuildPromptOptions): string
  buildImageInstruction(hasKeyImage: boolean, hasAttachments: boolean): string

  // 2. 연속성 맥락 요약
  buildContinuityPrompt(content: string): string

  // 3. 인물 추출 — extractCharacters
  buildExtractCharactersPrompt(diaryContent: string, existing: ExistingCharacterHint[]): string

  // 4. 독자 댓글 — generateReviews
  buildReviewsPrompt(summary: string, prevReviews?: ReviewResultLike | null): string

  // 5. 과거의 주인공에게 묻기 — askPastSelf
  noDateLabel: string
  kindlingStyleHeader: string
  buildPastSelfSystemPrompt(diaryBlock: string, kindlingStyleBlock: string): string

  // 6. 캐릭터 스토리 — generateCharacterStory
  characterStoryFallback: string
  buildCharacterStoryPrompt(block: string): string

  // 7. 성향 스탯 — generateCharacterStats
  buildCharacterStatsPrompt(block: string): string
  characterStatsFallback: StatEntry[]

  // 8. 업적 배지 — detectBadge
  buildBadgePrompt(date: string, content: string): string

  // 9. 땔감 반문 질문 — generateKindlingQuestion
  buildKindlingQuestionPrompt(text: string): string

  // 10. -??? 편지 — generateNextChapterLetter
  letterSystemPrompt: string
  buildLetterUserMessage(diaryBlock: string): string
}
