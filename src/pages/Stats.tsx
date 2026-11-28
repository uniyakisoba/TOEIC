import { useEffect, useState } from 'react'
import { words } from '../data/words'
import { CATEGORY_LABELS, POS_LABELS } from '../data/types'
import { BarChart, type BarDatum } from '../components/BarChart'
import { SpeakButton } from '../components/SpeakButton'
import { today } from '../lib/date'
import { getAllCards, getAllDaily, type DailyLog } from '../lib/db'
import { calcStreak } from '../lib/progress'
import { categoryProgress, lastNDays, longestStreak, totals, weakWords } from '../lib/stats'
import type { CardState } from '../lib/srs'

const DAYS = 30

function formatDay(date: string) {
  const [, m, d] = date.split('-').map(Number)
  return { short: `${m}/${d}`, long: `${m}月${d}日` }
}

export default function Stats() {
  const [data, setData] = useState<{ cards: CardState[]; logs: DailyLog[] } | null>(null)

  useEffect(() => {
    void Promise.all([getAllCards(), getAllDaily()]).then(([cards, logs]) => setData({ cards, logs }))
  }, [])

  if (!data) return <p className="muted">読み込み中…</p>

  const date = today()
  const { cards, logs } = data
  const sum = totals(logs)
  const days = lastNDays(logs, date, DAYS)
  // 横軸の日付は1週間おき（右端＝今日から数えて）に表示
  const chartData: BarDatum[] = days.map((d, i) => ({
    key: d.date,
    label: formatDay(d.date).long,
    axisLabel: (DAYS - 1 - i) % 7 === 0 ? formatDay(d.date).short : undefined,
    value: d.reviewed,
  }))
  const recentTotal = days.reduce((s, d) => s + d.reviewed, 0)
  const categories = categoryProgress(words, cards)
  const weak = weakWords(words, cards)

  return (
    <section className="stack">
      <div className="card">
        <h2>これまでの記録</h2>
        <div className="stat-grid">
          <div className="stat"><span className="stat-value">{sum.studyDays}</span><span className="stat-label">学習日数</span></div>
          <div className="stat"><span className="stat-value">{sum.reviews.toLocaleString()}</span><span className="stat-label">総評価回数</span></div>
          <div className="stat"><span className="stat-value">{calcStreak(logs, date)}</span><span className="stat-label">連続日数</span></div>
          <div className="stat"><span className="stat-value">{longestStreak(logs)}</span><span className="stat-label">最長連続</span></div>
        </div>
      </div>

      <div className="card">
        <h2>日別の学習量</h2>
        <p className="muted small">直近{DAYS}日の評価回数（合計 {recentTotal.toLocaleString()} 回）。棒をタップすると値を表示</p>
        <BarChart data={chartData} unit="回" title={`直近${DAYS}日の日別評価回数`} />
        <details className="table-view">
          <summary>表で見る</summary>
          <table>
            <thead><tr><th>日付</th><th>評価回数</th><th>新しい単語</th></tr></thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.date}><td>{formatDay(d.date).long}</td><td>{d.reviewed}</td><td>{d.newLearned}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      <div className="card">
        <h2>カテゴリ別の進み具合</h2>
        <p className="muted small">学習を始めた単語の割合（かっこ内は習得済み）</p>
        <ul className="meter-list">
          {categories.map((c) => {
            const pct = Math.round((c.learned / c.total) * 100)
            return (
              <li key={c.category}>
                <div className="meter-head">
                  <span>{CATEGORY_LABELS[c.category]}</span>
                  <span className="muted small">{c.learned} / {c.total}（{c.mastered}）</span>
                </div>
                <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={c.learned}
                  aria-label={`${CATEGORY_LABELS[c.category]}：${c.total}語中${c.learned}語を学習、${c.mastered}語を習得`}>
                  {pct > 0 && <div style={{ width: `${pct}%` }} />}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="card">
        <h2>苦手な単語</h2>
        {weak.length === 0 ? (
          <p className="muted small">「もう一度」を押した単語やクイズで間違えた単語が、ここに多い順で表示されます。</p>
        ) : (
          <ul className="review-list">
            {weak.map(({ word, wrong, correct }) => (
              <li key={word.id} className="weak-row">
                <span className="weak-main">
                  <strong>{word.word}</strong>
                  <span className="muted"><span className="pos">{POS_LABELS[word.pos]}</span>{word.meaning}</span>
                </span>
                <span className="weak-count small muted" title={`正解 ${correct}回`}>ミス{wrong}回</span>
                <SpeakButton text={word.word} small />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
