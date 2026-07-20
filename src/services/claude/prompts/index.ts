// ── 프롬프트 세트 진입점 ───────────────────────────────────────────────────
import { koPrompts } from './ko'
import { enPrompts } from './en'
import { type AppLanguage } from './language'
import { type PromptSet } from './types'

export { getAppLanguage, type AppLanguage } from './language'
export type { PromptSet, BuildPromptOptions, ExistingCharacterHint, ReviewResultLike, StatEntry } from './types'

export function getPrompts(lang: AppLanguage): PromptSet {
  return lang === 'en' ? enPrompts : koPrompts
}
