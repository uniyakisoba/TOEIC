import { describe, expect, it } from 'vitest'
import type { Word } from '../data/types'
import { buildQueue, calcStreak, summarize } from './progress'
import { newCardState, schedule } from './srs'
import type { DailyLog } from './db'

const D = '2026-11-28'
const mkWord = (n: number): Word => ({
  id: `w${n}`, word: `word${n}`, pos: 'noun', meaning: '意味', example: 'ex', exampleJa: '例',
  level: 600, category: 'general',
})
const words = Array.from({ length: 10 }, (_, i) => mkWord(i + 1))
const log = (date: string, reviewed = 5, newLearned = 0): DailyLog => ({ date, reviewed, newLearned, again: 0 })

describe('buildQueue', () => {
  it('期限が来た復習を先に、その後に新しい単語を上限まで並べる', () => {
    const due = { ...newCardState('w3', '2026-11-20'), due: '2026-11-27' }
    const future = { ...newCardState('w5', D), due: '2026-12-10' }
    const cards = new Map([[due.wordId, due], [future.wordId, future]])
    const q = buildQueue(words, cards, D, 3)
    expect(q.map((i) => i.word.id)).toEqual(['w3', 'w1', 'w2', 'w4'])
    expect(q[0].state).not.toBeNull()
    expect(q[1].state).toBeNull()
  })
})

describe('calcStreak', () => {
  it('今日を含めて連続した日数を数える', () => {
    expect(calcStreak([log('2026-11-26'), log('2026-11-27'), log(D)], D)).toBe(3)
  })
  it('今日まだでも昨日まで続いていれば途切れない', () => {
    expect(calcStreak([log('2026-11-26'), log('2026-11-27')], D)).toBe(2)
  })
  it('間が空いたら途切れる', () => {
    expect(calcStreak([log('2026-11-25'), log(D)], D)).toBe(1)
    expect(calcStreak([log('2026-11-26')], D)).toBe(0)
  })
})

describe('summarize', () => {
  it('今日学んだ分だけ新しい単語の残り枠が減る', () => {
    const cards = ['w1', 'w2'].map((id) => schedule(newCardState(id, D), 'good', D))
    const s = summarize(words, cards, [log(D, 2, 2)], D, 5)
    expect(s.newRemaining).toBe(3)
    expect(s.unseen).toBe(8)
    expect(s.dueCount).toBe(0) // 2語とも明日が期限
    expect(s.learning).toBe(2)
    expect(s.streak).toBe(1)
  })
  it('未学習の単語数より多くは出さない', () => {
    expect(summarize(words, [], [], D, 50).newRemaining).toBe(10)
  })
})
