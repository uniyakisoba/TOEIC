import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useSettings, type Accent, type Theme } from '../settings'
import { englishVoices, isSpeechSupported, loadVoices, pickVoice, speak, voiceLabel, voiceTier } from '../lib/speech'
import { backupFileName, buildBackup, parseBackup } from '../lib/backup'
import { getAllCards, getAllDaily, replaceAll } from '../lib/db'
import { today } from '../lib/date'

const SAMPLE_SENTENCE = 'Thank you for your inquiry about our services.'

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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const supported = isSpeechSupported()

  useEffect(() => { void loadVoices().then(setVoices) }, [])

  // ===== バックアップ =====
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const exportBackup = async () => {
    const [cards, daily] = await Promise.all([getAllCards(), getAllDaily()])
    const json = JSON.stringify(buildBackup(cards, daily, settings), null, 2)
    // Blob（メモリ上のファイル）を作り、一時的なリンクをクリックしてダウンロードさせる
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName(today())
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ ok: true, text: `単語${cards.length}語・${daily.length}日分の記録を書き出しました。` })
  }

  const importBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 同じファイルをもう一度選んでも反応するように
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      const when = backup.exportedAt ? new Date(backup.exportedAt).toLocaleString('ja-JP') : '不明'
      const ok = window.confirm(
        `${when} のバックアップ（単語${backup.cards.length}語・${backup.daily.length}日分）を読み込みます。\n` +
        '今の端末の学習記録はすべて置き換わります。よろしいですか？',
      )
      if (!ok) return
      await replaceAll(backup.cards, backup.daily)
      update(backup.settings)
      setMessage({ ok: true, text: '学習記録を復元しました。' })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : '読み込みに失敗しました' })
    }
  }

  // 実際に使われる声と、選べる声の一覧
  const voice = pickVoice(voices, settings.accent, settings.voiceURI)
  const choices = englishVoices(voices, settings.accent)
  const accentLabel = accents.find((a) => a.value === settings.accent)?.label
  const exact = voice && voice.lang.replace('_', '-').toLowerCase() === settings.accent.toLowerCase()
  // 選んだ声が端末から消えている（別の端末から設定を読み込んだ等）場合も「自動」扱い
  const selectedURI = settings.voiceURI && choices.some((v) => v.voiceURI === settings.voiceURI) ? settings.voiceURI : ''
  // iPhone / iPad で、高品質な声が見つからないときだけダウンロード方法を案内する
  const isApple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const hasHighQuality = choices.some((v) => voiceTier(v) === 'premium' || voiceTier(v) === 'enhanced')

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
        {!supported && <p className="notice">このブラウザは音声読み上げに対応していません。</p>}
        <label className="field">
          <span className="field-label">アクセント</span>
          <select value={settings.accent} onChange={(e) => update({ accent: e.target.value as Accent, voiceURI: null })}>
            {accents.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        {supported && choices.length > 0 && (
          <label className="field">
            <span className="field-label">声</span>
            <select value={selectedURI}
              onChange={(e) => {
                const uri = e.target.value || null
                update({ voiceURI: uri })
                speak(SAMPLE_SENTENCE, { accent: settings.accent, rate: settings.speechRate, voiceURI: uri })
              }}>
              <option value="">自動（おすすめ）</option>
              {choices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{voiceLabel(v)}</option>)}
            </select>
          </label>
        )}
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
        {supported && (
          <div className="field">
            <button className="button block"
              onClick={() => speak(SAMPLE_SENTENCE, { accent: settings.accent, rate: settings.speechRate, voiceURI: settings.voiceURI })}>
              試しに聞く
            </button>
            <p className="muted small">
              {voices.length === 0
                ? '使用する声：端末の標準の声'
                : exact
                  ? `使用する声：${voiceLabel(voice!)}`
                  : `この端末には${accentLabel}英語の声がないため、${voice ? voiceLabel(voice) : '標準の声'}で読み上げます。`}
            </p>
          </div>
        )}
        {supported && isApple && !hasHighQuality && (
          <div className="notice">
            <strong>もっと自然な声にするには</strong>
            <p className="small">
              iPhone の「設定」→「アクセシビリティ」→「読み上げコンテンツ」→「声」→「英語」で、
              「（プレミアム）」または「（拡張）」と付いた声（例：Ava、Zoe、Evan）をダウンロードしてください。
              ダウンロード後にこのアプリを開き直すと、上の「声」の一覧に出てきます。
            </p>
          </div>
        )}
      </div>
      <div className="card">
        <h2>バックアップ</h2>
        <p className="muted small">
          学習記録はこの端末のブラウザ内だけに保存されています。ブラウザのデータを消去すると記録も消えるため、
          ときどきファイルに書き出しておくと安心です。機種変更のときも、このファイルで引き継げます。
        </p>
        <div className="button-row">
          <button className="button" onClick={() => void exportBackup()}>書き出す</button>
          <button className="button" onClick={() => fileRef.current?.click()}>読み込む</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void importBackup(e)} />
        {message && <p className={`notice ${message.ok ? 'ok' : 'ng'}`} role="status">{message.text}</p>}
      </div>
    </section>
  )
}
