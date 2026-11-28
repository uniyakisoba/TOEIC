import { describe, expect, it } from 'vitest'
import { MIN_EASE, isMastered, newCardState, nextInterval, schedule, type Grade } from './srs'

const D = '2026-11-28'

/** 同じ評価を何回か続けたときの状態 */
function repeat(grades: Grade[]) {
  let s = newCardState('w0001', D)
  for (const g of grades) s = schedule(s, g, D)
  return s
}

describe('srs', () => {
  it('新しい単語：評価ごとの最初の間隔', () => {
    const s = newCardState('w0001', D)
    expect(nextInterval(s, 'again')).toBe(0)
    expect(nextInterval(s, 'hard')).toBe(1)
    expect(nextInterval(s, 'good')).toBe(1)
    expect(nextInterval(s, 'easy')).toBe(4)
  })

  it('「普通」を続けると間隔が 1 → 3 → 8 → 20 → 50日 と伸びる', () => {
    const intervals: number[] = []
    let s = newCardState('w0001', D)
    for (let i = 0; i < 5; i++) {
      s = schedule(s, 'good', D)
      intervals.push(s.interval)
    }
    expect(intervals).toEqual([1, 3, 8, 20, 50])
  })

  it('次の出題日は今日＋間隔', () => {
    const s = repeat(['good', 'good'])
    expect(s.interval).toBe(3)
    expect(s.due).toBe('2026-12-01')
  })

  it('「もう一度」で連続正解がリセットされ、忘れた回数が増える', () => {
    const s = repeat(['good', 'good', 'again'])
    expect(s.reps).toBe(0)
    expect(s.interval).toBe(0)
    expect(s.due).toBe(D)
    expect(s.lapses).toBe(1)
    expect(s.wrong).toBe(1)
    expect(s.correct).toBe(2)
  })

  it('初見で「もう一度」は忘れた回数に数えない', () => {
    expect(repeat(['again']).lapses).toBe(0)
  })

  it('易しさ係数は下限より下がらない', () => {
    expect(repeat(Array(20).fill('again')).ease).toBe(MIN_EASE)
  })

  it('「難しい」でも必ず前回より間隔が伸びる', () => {
    const s = repeat(['good', 'good', 'good'])
    expect(nextInterval(s, 'hard')).toBeGreaterThan(s.interval)
  })

  it('間隔21日以上で習得済み', () => {
    expect(isMastered(repeat(['good', 'good', 'good', 'good']))).toBe(false) // 20日
    expect(isMastered(repeat(['good', 'good', 'good', 'good', 'good']))).toBe(true) // 50日
  })

  it('元の状態を書き換えない', () => {
    const s = newCardState('w0001', D)
    schedule(s, 'easy', D)
    expect(s.interval).toBe(0)
  })
})
