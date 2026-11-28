// 「記録」画面用の集計（画面とは切り離した計算だけの関数）
import type { Category, Word } from '../data/types'
import { addDays, diffDays, type DateString } from './date'
import type { DailyLog } from './db'
import { isMastered, type CardState } from './srs'

export interface DayPoint {
  date: DateString
  reviewed: number
  newLearned: number
}

/** 直近 n 日分（古い順）。記録のない日は 0 で埋める */
export function lastNDays(logs: DailyLog[], date: DateString, n: number): DayPoint[] {
  const byDate = new Map(logs.map((l) => [l.date, l]))
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(date, i - n + 1)
    const l = byDate.get(d)
    return { date: d, reviewed: l?.reviewed ?? 0, newLearned: l?.newLearned ?? 0 }
  })
}

/** これまでで最も長く続いた連続学習日数 */
export function longestStreak(logs: DailyLog[]): number {
  const days = logs.filter((l) => l.reviewed > 0).map((l) => l.date).sort()
  let best = 0
  let run = 0
  days.forEach((d, i) => {
    run = i > 0 && diffDays(days[i - 1], d) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

export interface Totals {
  studyDays: number
  reviews: number
}

export function totals(logs: DailyLog[]): Totals {
  return {
    studyDays: logs.filter((l) => l.reviewed > 0).length,
    reviews: logs.reduce((sum, l) => sum + l.reviewed, 0),
  }
}

export interface CategoryProgress {
  category: Category
  total: number
  learned: number // 学習を始めた単語（習得済みを含む）
  mastered: number
}

export function categoryProgress(words: Word[], cards: CardState[]): CategoryProgress[] {
  const cardMap = new Map(cards.map((c) => [c.wordId, c]))
  const result = new Map<Category, CategoryProgress>()
  for (const w of words) {
    const p = result.get(w.category) ?? { category: w.category, total: 0, learned: 0, mastered: 0 }
    p.total++
    const c = cardMap.get(w.id)
    if (c) {
      p.learned++
      if (isMastered(c)) p.mastered++
    }
    result.set(w.category, p)
  }
  return [...result.values()]
}

export interface WeakWord {
  word: Word
  wrong: number
  correct: number
}

/** 苦手な単語：「もう一度」の回数が多い順（同数なら正解率が低い順） */
export function weakWords(words: Word[], cards: CardState[], limit = 10): WeakWord[] {
  const wordMap = new Map(words.map((w) => [w.id, w]))
  return cards
    .filter((c) => c.wrong > 0 && wordMap.has(c.wordId))
    .map((c) => ({ word: wordMap.get(c.wordId)!, wrong: c.wrong, correct: c.correct }))
    .sort((a, b) => b.wrong - a.wrong || a.correct / (a.correct + a.wrong) - b.correct / (b.correct + b.wrong))
    .slice(0, limit)
}

/** グラフの目盛り用：max 以上で「きりのいい」数（1, 2, 5 × 10^n） */
export function niceCeil(max: number): number {
  if (max <= 0) return 10
  const exp = 10 ** Math.floor(Math.log10(max))
  for (const m of [1, 2, 5, 10]) if (m * exp >= max) return m * exp
  return 10 * exp
}
