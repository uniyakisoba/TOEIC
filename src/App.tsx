import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { Icon, type IconName } from './components/Icon'
import Home from './pages/Home'
import Study from './pages/Study'
import Quiz from './pages/Quiz'
import Words from './pages/Words'
import Stats from './pages/Stats'
import SettingsPage from './pages/Settings'

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'ホーム', icon: 'home' },
  { to: '/study', label: '学習', icon: 'cards' },
  { to: '/quiz', label: 'クイズ', icon: 'quiz' },
  { to: '/words', label: '単語', icon: 'list' },
  { to: '/stats', label: '記録', icon: 'chart' },
]

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="app-title">TOEIC 単語トレーナー</Link>
        <Link to="/settings" className="icon-button" aria-label="設定">
          <Icon name="gear" />
        </Link>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/study" element={<Study />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/words" element={<Words />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <nav className="tab-bar" aria-label="メインメニュー">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} className="tab">
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
