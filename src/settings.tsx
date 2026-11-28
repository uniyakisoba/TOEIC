import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// アプリの設定。学習記録とは別に、小さなデータなので localStorage に保存する
export type Theme = 'system' | 'light' | 'dark'
export type Accent = 'en-US' | 'en-GB' | 'en-AU' | 'en-CA'

export interface Settings {
  theme: Theme
  dailyNewWords: number
  accent: Accent
  speechRate: number
  autoSpeak: boolean
  voiceURI: string | null // 選んだ声の識別子。null は「自動」
}

export const defaultSettings: Settings = {
  theme: 'system',
  dailyNewWords: 20,
  accent: 'en-US',
  speechRate: 1,
  autoSpeak: false,
  voiceURI: null,
}

const STORAGE_KEY = 'toeic-settings'

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return { ...defaultSettings, ...saved }
  } catch {
    return defaultSettings
  }
}

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // プライベートブラウズ等で保存できない場合は何もしない
    }
    // テーマを <html data-theme="..."> に反映。'system' のときは属性を外して端末設定に従う
    const root = document.documentElement
    if (settings.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = settings.theme
  }, [settings])

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }))

  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings は SettingsProvider の中で使う必要があります')
  return ctx
}
