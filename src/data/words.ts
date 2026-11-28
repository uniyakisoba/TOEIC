import raw from './words.json'
import type { Word } from './types'

// JSON の中身を Word 型の配列として扱う（中身の正しさは scripts/validate-words.mjs で検査）
export const words = raw as Word[]
