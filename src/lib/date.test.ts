import { describe, expect, it } from 'vitest'
import { addDays, diffDays, toDateString } from './date'

describe('date', () => {
  it('月末・年末・うるう年をまたいで日付を足せる', () => {
    expect(addDays('2026-11-28', 3)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('日数の差を求められる', () => {
    expect(diffDays('2026-11-28', '2026-12-05')).toBe(7)
  })
  it('Date を現地日付の文字列にする', () => {
    expect(toDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
