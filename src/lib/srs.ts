// 間隔反復（SRS）の計算。SM-2 アルゴリズムを、4段階評価向けに少しアレンジしたもの。
//
// 各単語は「易しさ係数（ease）」を持ち、正解するたびに
//   次の間隔 = 今の間隔 × ease
// で間隔が伸びていく。苦手な単語は ease が下がり、伸び方がゆっくりになる。
import { addDays, type DateString } from './date'

export type Grade = 'again' | 'hard' | 'good' | 'easy'

export interface CardState {
  wordId: string
  ease: number // 易しさ係数（初期 2.5、下限 1.3）
  interval: number // 次の復習までの日数（0 = 今日中にもう一度）
  reps: number // 連続で覚えていた回数
  lapses: number // 覚えていたのに忘れた回数
  due: DateString // 次に出題する日
  lastReviewed: DateString | null
  correct: number // 「難しい」「普通」「簡単」を押した回数
  wrong: number // 「もう一度」を押した回数
}

export const INITIAL_EASE = 2.5
export const MIN_EASE = 1.3
export const MAX_INTERVAL = 365
/** 間隔がこの日数以上になった単語を「習得済み」とみなす */
export const MASTERED_INTERVAL = 21

export function newCardState(wordId: string, today: DateString): CardState {
  return {
    wordId, ease: INITIAL_EASE, interval: 0, reps: 0, lapses: 0,
    due: today, lastReviewed: null, correct: 0, wrong: 0,
  }
}

/** 評価ごとの次の間隔（日数）を求める */
export function nextInterval(state: CardState, grade: Grade): number {
  const { interval, reps, ease } = state
  let days: number
  switch (grade) {
    case 'again':
      return 0
    case 'hard':
      days = reps === 0 ? 1 : Math.max(interval + 1, Math.round(interval * 1.2))
      break
    case 'good':
      days = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(interval + 1, Math.round(interval * ease))
      break
    case 'easy':
      days = reps === 0 ? 4 : reps === 1 ? 7 : Math.max(interval + 1, Math.round(interval * ease * 1.3))
      break
  }
  return Math.min(days, MAX_INTERVAL)
}

/** 評価を反映した新しい状態を返す（元の state は書き換えない） */
export function schedule(state: CardState, grade: Grade, today: DateString): CardState {
  const interval = nextInterval(state, grade)
  const easeDelta = { again: -0.2, hard: -0.15, good: 0, easy: 0.15 }[grade]
  const forgot = grade === 'again'
  return {
    ...state,
    ease: Math.max(MIN_EASE, Math.round((state.ease + easeDelta) * 100) / 100),
    interval,
    reps: forgot ? 0 : state.reps + 1,
    lapses: forgot && state.reps > 0 ? state.lapses + 1 : state.lapses,
    due: addDays(today, interval),
    lastReviewed: today,
    correct: forgot ? state.correct : state.correct + 1,
    wrong: forgot ? state.wrong + 1 : state.wrong,
  }
}

/** ボタンに表示する「次はいつ出るか」の文言 */
export function formatInterval(days: number): string {
  if (days === 0) return 'すぐ'
  if (days < 30) return `${days}日`
  if (days < 365) return `${Math.round(days / 30)}か月`
  return '1年'
}

export function isMastered(state: CardState): boolean {
  return state.interval >= MASTERED_INTERVAL
}
