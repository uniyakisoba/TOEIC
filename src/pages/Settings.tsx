import { useSettings, type Accent, type Theme } from '../settings'

const themes: { value: Theme; label: string }[] = [
  { value: 'system', label: '自動' },
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
]

const accents: { value: Accent; label: string }[] = [
  { value: 'en-US', label: 'アメリカ' },
  { value: 'en-GB', label: 'イギリス' },
  { value: 'en-AU', label: 'オーストラリア' },
  { value: 'en-CA', label: 'カナダ' },
]

export default function SettingsPage() {
  const { settings, update } = useSettings()

  return (
    <section className="stack">
      <div className="card">
        <h2>表示</h2>
        <div className="field">
          <span className="field-label">テーマ</span>
          <div className="segmented" role="radiogroup" aria-label="テーマ">
            {themes.map((t) => (
              <button key={t.value} role="radio" aria-checked={settings.theme === t.value}
                className={settings.theme === t.value ? 'active' : ''}
                onClick={() => update({ theme: t.value })}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>学習</h2>
        <label className="field">
          <span className="field-label">1日の新しい単語数：<strong>{settings.dailyNewWords}語</strong></span>
          <input type="range" min={5} max={50} step={5} value={settings.dailyNewWords}
            onChange={(e) => update({ dailyNewWords: Number(e.target.value) })} />
        </label>
      </div>

      <div className="card">
        <h2>音声</h2>
        <label className="field">
          <span className="field-label">アクセント</span>
          <select value={settings.accent} onChange={(e) => update({ accent: e.target.value as Accent })}>
            {accents.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">読み上げ速度：<strong>{settings.speechRate.toFixed(1)}倍</strong></span>
          <input type="range" min={0.5} max={1.5} step={0.1} value={settings.speechRate}
            onChange={(e) => update({ speechRate: Number(e.target.value) })} />
        </label>
        <label className="field row">
          <span className="field-label">カード表示時に自動で発音</span>
          <input type="checkbox" checked={settings.autoSpeak}
            onChange={(e) => update({ autoSpeak: e.target.checked })} />
        </label>
      </div>
    </section>
  )
}
