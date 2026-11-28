import { Link } from 'react-router-dom'
import { words } from '../data/words'
import { useProgress } from '../lib/useProgress'

const GOAL_WORDS = 2500

export default function Home() {
  const { summary } = useProgress()
  if (!summary) return <p className="muted">読み込み中…</p>

  const todo = summary.dueCount + summary.newRemaining
  const masteredPct = Math.round((summary.mastered / GOAL_WORDS) * 1000) / 10

  return (
    <section className="stack">
      <div className="card">
        <h2>今日の学習</h2>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-value">{summary.dueCount}</span>
            <span className="stat-label">復習</span>
          </div>
          <div className="stat">
            <span className="stat-value">{summary.newRemaining}</span>
            <span className="stat-label">新しい単語</span>
          </div>
          <div className="stat">
            <span className="stat-value">{summary.streak}</span>
            <span className="stat-label">連続日数</span>
          </div>
        </div>
        <Link to="/study" className="button primary block">
          {todo > 0 ? `学習をはじめる（${todo}語）` : '今日の分は完了！'}
        </Link>
        {summary.reviewedToday > 0 && (
          <p className="muted small center mt">今日は {summary.reviewedToday} 回評価、新しい単語 {summary.newToday} 語</p>
        )}
      </div>

      <div className="card">
        <h2>習得状況</h2>
        <div className="stat-row">
          <div className="stat"><span className="stat-value">{summary.mastered}</span><span className="stat-label">習得済み</span></div>
          <div className="stat"><span className="stat-value">{summary.learning}</span><span className="stat-label">学習中</span></div>
          <div className="stat"><span className="stat-value">{summary.unseen}</span><span className="stat-label">未学習</span></div>
        </div>
        <p className="muted small">目標：TOEIC 730点レベルの語彙 {GOAL_WORDS.toLocaleString()} 語</p>
        <div className="progress" aria-label={`習得率 ${masteredPct}%`}>
          <div style={{ width: `${masteredPct}%` }} />
        </div>
        <p className="muted small">
          習得済み {summary.mastered} / {GOAL_WORDS.toLocaleString()} 語（現在の収録：{words.length}語）
        </p>
        <p className="muted small">※ 次の復習まで21日以上空いた単語を「習得済み」としています</p>
      </div>
    </section>
  )
}
