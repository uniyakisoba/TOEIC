// 4択クイズの問題作成
import type { Word } from '../data/types'

export type Direction = 'en-ja' | 'ja-en'

export interface Question {
  word: Word // 正解の単語
  choices: Word[] // 4つの選択肢（正解を含む、並びはランダム）
}

/** 0以上1未満の乱数を返す関数。テストでは結果が毎回同じになる乱数に差し替える */
export type Random = () => number

/**
 * フィッシャー–イェーツのシャッフル：後ろから順に「自分より前のどれか」と入れ替える。
 * どの並び順も同じ確率で出る、偏りのない混ぜ方
 */
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 誤答の選択肢を選ぶ。
 * - 同じ品詞から優先して選ぶ（品詞で正解がバレないように）
 * - 表示される文字が正解や他の選択肢と同じものは除く（英→日なら意味、日→英なら英単語）
 * - 同じ品詞が足りなければ他の品詞で補う
 */
export function pickDistractors(
  answer: Word, allWords: readonly Word[], direction: Direction, random: Random = Math.random, count = 3,
): Word[] {
  const label = (w: Word) => (direction === 'en-ja' ? w.meaning : w.word.toLowerCase())
  const used = new Set([label(answer)])
  const picked: Word[] = []
  const samePos = shuffle(allWords.filter((w) => w.pos === answer.pos), random)
  const otherPos = shuffle(allWords.filter((w) => w.pos !== answer.pos), random)
  for (const w of [...samePos, ...otherPos]) {
    if (picked.length >= count) break
    if (w.id === answer.id || used.has(label(w))) continue
    used.add(label(w))
    picked.push(w)
  }
  return picked
}

/** 出題対象 pool から count 問を作る。誤答の選択肢は allWords 全体から選ぶ */
export function buildQuestions(
  pool: readonly Word[], allWords: readonly Word[], count: number, direction: Direction,
  random: Random = Math.random,
): Question[] {
  return shuffle(pool, random)
    .slice(0, count)
    .map((word) => ({
      word,
      choices: shuffle([word, ...pickDistractors(word, allWords, direction, random)], random),
    }))
}
