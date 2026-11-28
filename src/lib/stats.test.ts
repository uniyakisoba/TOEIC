import { describe, expect, it } from 'vitest'
import type { Word } from '../data/types'
import type { DailyLog } from './db'
import { categoryProgress, lastNDays, longestStreak, niceCeil, totals, weakWords } from './stats'
import { newCardState } from './srs'

const D = '2026-11-28'
const log = (date: string, reviewed = 5, newLearned = 1): DailyLog => ({ date, reviewed, newLearned, again: 0 })
const mk = (id: string, category: Word['category']): Word => ({
  id, word: id, pos: 'noun', meaning: id, example: '', exampleJa: '', level: 600, category,
})

describe('stats', () => {
  it('直近 n 日を古い順に、記録のない日は 0 で埋める', () => {
    const days = lastNDays([log('2026-11-26', 7), log(D, 3)], D, 4)
    expect(days.map((d) => [d.date, d.reviewed])).toEqual([
      ['2026-11-25', 0], ['2026-11-26', 7], ['2026-11-27', 0], ['2026-11-28', 3],
    ])
  })

  it('最長連続日数（月またぎ・評価0の日は数えない）', () => {
    const logs = [log('2026-10-30'), log('2026-10-31'), log('2026-11-01'), log('2026-11-03'), log('2026-11-04', 0)]
    expect(longestStreak(logs)).toBe(3)
    expect(longestStreak([])).toBe(0)
  })

  it('合計', () => {
    expect(totals([log('2026-11-01', 4), log('2026-11-02', 0), log('2026-11-03', 6)])).toEqual({ studyDays: 2, reviews: 10 })
  })

  it('カテゴリ別の進み具合', () => {
    const words = [mk('a', 'office'), mk('b', 'office'), mk('c', 'travel')]
    const cards = [newCardState('a', D), { ...newCardState('b', D), interval: 30 }]
    expect(categoryProgress(words, cards)).toEqual([
      { category: 'office', total: 2, learned: 2, mastered: 1 },
      { category: 'travel', total: 1, learned: 0, mastered: 0 },
    ])
  })

  it('苦手な単語は「もう一度」の多い順、同数なら正解率の低い順', () => {
    const words = ['a', 'b', 'c', 'd'].map((id) => mk(id, 'general'))
    const cards = [
      { ...newCardState('a', D), wrong: 2, correct: 5 },
      { ...newCardState('b', D), wrong: 3, correct: 1 },
      { ...newCardState('c', D), wrong: 2, correct: 1 },
      { ...newCardState('d', D), wrong: 0, correct: 4 },
    ]
    expect(weakWords(words, cards).map((w) => w.word.id)).toEqual(['b', 'c', 'a'])
  })

  it('目盛りの上限はきりのいい数', () => {
    expect([0, 3, 12, 37, 120].map(niceCeil)).toEqual([10, 5, 20, 50, 200])
  })
})
