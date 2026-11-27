import { Link } from 'react-router-dom'
import { useSettings } from '../settings'

export default function Home() {
  const { settings } = useSettings()
  return (
    <section className="stack">
      <div className="card">
        <h2>今日の学習</h2>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-value">0</span>
            <span className="stat-label">復習</span>
          </div>
          <div className="stat">
            <span className="stat-value">{settings.dailyNewWords}</span>
            <span className="stat-label">新しい単語</span>
          </div>
          <div className="stat">
            <span className="stat-value">0</span>
            <span className="stat-label">連続日数</span>
          </div>
        </div>
        <Link to="/study" className="button primary block">学習をはじめる</Link>
      </div>
      <div className="card">
        <h2>目標</h2>
        <p className="muted">TOEIC 730点レベルの語彙 約2,500語の習得</p>
        <div className="progress" aria-label="習得率 0%"><div style={{ width: '0%' }} /></div>
        <p className="muted small">習得済み 0 / 2,500 語</p>
      </div>
    </section>
  )
}
