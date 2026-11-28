import { describe, expect, it } from 'vitest'
import { words } from '../data/words'
import type { Word } from '../data/types'
import { buildQuestions, pickDistractors, shuffle } from './quiz'

/** 毎回同じ乱数列を返す簡単な乱数（テストの結果を安定させるため） */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

describe('shuffle', () => {
  it('要素を失わず、元の配列を書き換えない', () => {
    const src = [1, 2, 3, 4, 5]
    const out = shuffle(src, seeded(1))
    expect([...out].sort()).toEqual(src)
    expect(src).toEqual([1, 2, 3, 4, 5])
  })
})

describe('pickDistractors', () => {
  it('同じ品詞から3つ、重複なしで選ぶ', () => {
    const answer = words.find((w) => w.word === 'invoice')!
    for (let s = 0; s < 50; s++) {
      const d = pickDistractors(answer, words, 'en-ja', seeded(s))
      expect(d).toHaveLength(3)
      expect(d.every((w) => w.pos === 'noun')).toBe(true)
      expect(d.some((w) => w.id === answer.id)).toBe(false)
      expect(new Set(d.map((w) => w.meaning)).size).toBe(3)
    }
  })

  it('同じ品詞が足りないときは他の品詞で補う', () => {
    // 接続詞は unless と whereas の2語しかない
    const answer = words.find((w) => w.word === 'unless')!
    const d = pickDistractors(answer, words, 'en-ja', seeded(3))
    expect(d).toHaveLength(3)
    expect(d[0].pos).toBe('conjunction')
  })

  it('表示が同じになる選択肢は出さない', () => {
    const mk = (id: string, word: string, meaning: string): Word => ({
      id, word, meaning, pos: 'noun', example: '', exampleJa: '', level: 600, category: 'general',
    })
    const pool = [mk('a', 'cat', '猫'), mk('b', 'kitty', '猫'), mk('c', 'dog', '犬'), mk('d', 'bird', '鳥'), mk('e', 'fish', '魚')]
    for (let s = 0; s < 20; s++) {
      const d = pickDistractors(pool[0], pool, 'en-ja', seeded(s))
      expect(d.map((w) => w.meaning)).not.toContain('猫')
    }
  })
})

describe('buildQuestions', () => {
  it('指定数の問題を作り、各問に正解を含む4択がある', () => {
    const qs = buildQuestions(words.slice(0, 30), words, 10, 'ja-en', seeded(7))
    expect(qs).toHaveLength(10)
    expect(new Set(qs.map((q) => q.word.id)).size).toBe(10)
    for (const q of qs) {
      expect(q.choices).toHaveLength(4)
      expect(q.choices.filter((c) => c.id === q.word.id)).toHaveLength(1)
    }
  })

  it('出題対象が少なければその数だけ作る', () => {
    expect(buildQuestions(words.slice(0, 3), words, 10, 'en-ja', seeded(1))).toHaveLength(3)
  })
})
