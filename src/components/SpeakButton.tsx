import type { MouseEvent } from 'react'
import { useSpeech } from '../lib/useSpeech'
import { Icon } from './Icon'

/** スピーカーボタン。押すと text を読み上げる。読み上げ非対応の端末では表示しない */
export function SpeakButton({ text, label, small }: { text: string; label?: string; small?: boolean }) {
  const { say, supported } = useSpeech()
  if (!supported) return null
  const onClick = (e: MouseEvent) => {
    e.stopPropagation() // カードの「タップでめくる」など、外側のクリック処理を動かさない
    say(text)
  }
  return (
    <button type="button" className={`speak-button ${small ? 'small' : ''}`} onClick={onClick}
      aria-label={label ?? `「${text}」を読み上げ`}>
      <Icon name="speaker" />
    </button>
  )
}
