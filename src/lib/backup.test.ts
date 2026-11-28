import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { defaultSettings } from '../settings'
import { buildBackup, parseBackup } from './backup'
import { getAllCards, getAllDaily, replaceAll, saveReview } from './db'
import { newCardState, schedule } from './srs'

const D = '2026-11-28'
const card = schedule(newCardState('w0001', D), 'good', D)
const daily = { date: D, reviewed: 1, newLearned: 1, again: 0 }

describe('backup', () => {
  it('書き出した内容をそのまま読み戻せる', () => {
    const b = buildBackup([card], [daily], { ...defaultSettings, dailyNewWords: 30 }, new Date('2026-11-28T00:00:00Z'))
    const parsed = parseBackup(JSON.stringify(b))
    expect(parsed.cards).toEqual([card])
    expect(parsed.daily).toEqual([daily])
    expect(parsed.settings.dailyNewWords).toBe(30)
    expect(parsed.exportedAt).toBe('2026-11-28T00:00:00.000Z')
  })

  it('壊れたファイルや別のファイルはエラーにする', () => {
    expect(() => parseBackup('not json')).toThrow('JSON')
    expect(() => parseBackup('{"app":"other"}')).toThrow('このアプリのバックアップファイルではありません')
    const base = buildBackup([card], [daily], defaultSettings)
    expect(() => parseBackup(JSON.stringify({ ...base, version: 99 }))).toThrow('新しい版')
    expect(() => parseBackup(JSON.stringify({ ...base, cards: [{ wordId: 'x' }] }))).toThrow('単語')
    expect(() => parseBackup(JSON.stringify({ ...base, daily: [{ date: '11/28' }] }))).toThrow('日別')
  })

  it('復元すると今の記録が置き換わる', async () => {
    await saveReview(schedule(newCardState('w0099', D), 'again', D), 'again', true, '2026-11-01')
    await replaceAll([card], [daily])
    expect((await getAllCards()).map((c) => c.wordId)).toEqual(['w0001'])
    expect(await getAllDaily()).toEqual([daily])
  })
})
