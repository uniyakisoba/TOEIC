import { useCallback } from 'react'
import { useSettings } from '../settings'
import { isSpeechSupported, speak } from './speech'

/** 設定（アクセント・速度）を反映した読み上げ関数を返す */
export function useSpeech() {
  const { settings } = useSettings()
  const say = useCallback(
    (text: string) => speak(text, { accent: settings.accent, rate: settings.speechRate }),
    [settings.accent, settings.speechRate],
  )
  return { say, supported: isSpeechSupported(), autoSpeak: settings.autoSpeak }
}
