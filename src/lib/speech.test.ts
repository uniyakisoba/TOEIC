import { describe, expect, it } from 'vitest'
import { pickVoice, type VoiceLike } from './speech'

const v = (name: string, lang: string, localService = true, isDefault = false): VoiceLike =>
  ({ name, lang, localService, default: isDefault })

describe('pickVoice', () => {
  const voices = [
    v('Kyoko', 'ja-JP'),
    v('Google US English', 'en-US', false),
    v('Samantha', 'en-US', true),
    v('Daniel', 'en-GB'),
    v('Karen', 'en_AU'), // Android 風の表記
  ]

  it('アクセントに一致する声を、端末内蔵のものを優先して選ぶ', () => {
    expect(pickVoice(voices, 'en-US')?.name).toBe('Samantha')
    expect(pickVoice(voices, 'en-GB')?.name).toBe('Daniel')
  })

  it('en_AU のような表記ゆれにも対応する', () => {
    expect(pickVoice(voices, 'en-AU')?.name).toBe('Karen')
  })

  it('一致する声がなければ他の英語の声で代用する', () => {
    expect(pickVoice(voices, 'en-CA')?.lang).toMatch(/^en/)
  })

  it('英語の声がなければ null', () => {
    expect(pickVoice([v('Kyoko', 'ja-JP')], 'en-US')).toBeNull()
    expect(pickVoice([], 'en-US')).toBeNull()
  })
})
