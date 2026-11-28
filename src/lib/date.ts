// 日付は "2026-11-28" のような文字列（端末の現地時間の日付）で扱う。
// 「何日後に復習」という日単位の管理には、時刻まで持つ Date より文字列のほうが比較しやすい

export type DateString = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateString(d: Date): DateString {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): DateString {
  return toDateString(new Date())
}

// 計算はタイムゾーンや夏時間の影響を受けない UTC で行う
function toUtc(s: DateString): number {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function addDays(s: DateString, days: number): DateString {
  const d = new Date(toUtc(s) + days * 86_400_000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** b - a の日数 */
export function diffDays(a: DateString, b: DateString): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000)
}
