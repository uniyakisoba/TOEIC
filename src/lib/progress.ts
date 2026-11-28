// 保存された記録から「今日やること」や「連続日数」を計算する（画面表示用の集計）
import type { Word } from '../data/types'
import { addDays, type DateString } from './date'
import type { DailyLog } from './db'
import { isMastered, type CardState } from './srs'

export interface QueueItem {
  word: Word
  state: CardState | null // null = まだ一度も学習していない新しい単語
}

/** 今日の学習キュー（出題順の並び）を作る：期限が来た復習 → 新しい単語 */
export function buildQueue(
  words: Word[], cards: Map<string, CardState>, date: DateString, newLimit: number,
): QueueItem[] {
  const due: QueueItem[] = []
  const fresh: QueueItem[] = []
  for (const word of words) {
    const state = cards.get(word.id)
    if (state) {
      if (state.due <= date) due.push({ word, state })
    } else if (fresh.length < newLimit) {
      fresh.push({ word, state: null })
    }
  }
  // 期限を長く過ぎているものから復習する
  due.sort((a, b) => a.state!.due.localeCompare(b.state!.due))
  return [...due, ...fresh]
}

/** 連続学習日数。今日まだ学習していなくても、昨日まで続いていれば途切れていない扱い */
export function calcStreak(logs: DailyLog[], date: DateString): number {
  const studied = new Set(logs.filter((l) => l.reviewed > 0).map((l) => l.date))
  let d = studied.has(date) ? date : addDays(date, -1)
  let streak = 0
  while (studied.has(d)) {
    streak++
    d = addDays(d, -1)
  }
  return streak
}

export interface Summary {
  dueCount: number
  newRemaining: number // 今日あと何語の新しい単語を学べるか
  newToday: number
  reviewedToday: number
  streak: number
  learning: number
  mastered: number
  unseen: number
}

export function summarize(
  words: Word[], cards: CardState[], logs: DailyLog[], date: DateString, dailyNewWords: number,
): Summary {
  const todayLog = logs.find((l) => l.date === date)
  const newToday = todayLog?.newLearned ?? 0
  const unseen = words.length - cards.length
  const mastered = cards.filter(isMastered).length
  return {
    dueCount: cards.filter((c) => c.due <= date).length,
    newRemaining: Math.max(0, Math.min(dailyNewWords - newToday, unseen)),
    newToday,
    reviewedToday: todayLog?.reviewed ?? 0,
    streak: calcStreak(logs, date),
    learning: cards.length - mastered,
    mastered,
    unseen,
  }
}
