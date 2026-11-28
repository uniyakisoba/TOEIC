import 'fake-indexeddb/auto' // テスト環境（Node.js）には IndexedDB がないので、メモリ上の偽物を使う
import { describe, expect, it } from 'vitest'
import { getAllCards, getAllDaily, saveReview } from './db'
import { newCardState, schedule } from './srs'

const D = '2026-11-28'

describe('db', () => {
  it('評価を保存すると、単語の状態と日別記録が両方更新される', async () => {
    const first = schedule(newCardState('w1', D), 'again', D)
    await saveReview(first, 'again', true, D)
    const second = schedule(first, 'good', D)
    await saveReview(second, 'good', false, D)

    const cards = await getAllCards()
    expect(cards).toHaveLength(1)
    expect(cards[0].interval).toBe(1)

    const daily = await getAllDaily()
    expect(daily).toEqual([{ date: D, reviewed: 2, newLearned: 1, again: 1 }])
  })
})
