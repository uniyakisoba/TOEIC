import { describe, expect, it } from 'vitest'
import { englishVoices, isUnnatural, pickVoice, voiceLabel, voiceTier, type VoiceLike } from './speech'

const v = (name: string, lang: string, voiceURI = `com.example.${name}`, localService = true, isDefault = false): VoiceLike =>
  ({ name, lang, voiceURI, localService, default: isDefault })

// iPhone の Safari で実際に並ぶ声を模した一覧
const iphone = [
  v('Albert', 'en-US', 'com.apple.speech.synthesis.voice.Albert'),
  v('Eddy (English (US))', 'en-US', 'com.apple.eloquence.en-US.Eddy', true, true),
  v('Samantha', 'en-US', 'com.apple.voice.compact.en-US.Samantha'),
  v('Ava', 'en-US', 'com.apple.voice.enhanced.en-US.Ava'),
  v('Zoe', 'en-US', 'com.apple.voice.premium.en-US.Zoe'),
  v('Daniel', 'en-GB', 'com.apple.voice.compact.en-GB.Daniel'),
  v('Karen', 'en_AU', 'com.apple.voice.compact.en-AU.Karen'),
  v('Kyoko', 'ja-JP', 'com.apple.voice.compact.ja-JP.Kyoko'),
]

describe('voice quality', () => {
  it('品質を voiceURI から判定する', () => {
    expect(voiceTier(iphone[4])).toBe('premium')
    expect(voiceTier(iphone[3])).toBe('enhanced')
    expect(voiceTier(iphone[2])).toBe('standard')
    expect(voiceTier(v('Microsoft Aria Online (Natural) - English (United States)', 'en-US'))).toBe('natural')
  })

  it('ノベルティ音声・Eloquence 音声を見分ける', () => {
    expect(isUnnatural(iphone[0])).toBe(true)
    expect(isUnnatural(iphone[1])).toBe(true)
    expect(isUnnatural(iphone[3])).toBe(false)
  })
})

describe('pickVoice', () => {
  it('端末の既定が Eddy でも選ばず、品質の高い声を選ぶ', () => {
    expect(pickVoice(iphone, 'en-US')?.name).toBe('Zoe')
  })

  it('アクセントに一致する声を優先する（en_AU の表記ゆれも対応）', () => {
    expect(pickVoice(iphone, 'en-GB')?.name).toBe('Daniel')
    expect(pickVoice(iphone, 'en-AU')?.name).toBe('Karen')
  })

  it('一致する声がなければ他の英語の声の中で品質の高いもので代用する', () => {
    expect(pickVoice(iphone, 'en-CA')?.name).toBe('Zoe')
  })

  it('設定で選んだ声があればそれを使い、端末になければ自動に戻る', () => {
    expect(pickVoice(iphone, 'en-US', 'com.apple.voice.compact.en-US.Samantha')?.name).toBe('Samantha')
    expect(pickVoice(iphone, 'en-US', 'com.apple.voice.premium.en-US.Missing')?.name).toBe('Zoe')
  })

  it('Android / PC の Chrome では Google の声を優先する', () => {
    const chrome = [v('Microsoft David', 'en-US'), v('Google US English', 'en-US', 'Google US English', false)]
    expect(pickVoice(chrome, 'en-US')?.name).toBe('Google US English')
  })

  it('英語の声がなければ null', () => {
    expect(pickVoice([iphone[7]], 'en-US')).toBeNull()
    expect(pickVoice([], 'en-US')).toBeNull()
  })
})

describe('englishVoices', () => {
  it('不自然な声と英語以外を除き、選んだアクセント → 品質順に並べる', () => {
    expect(englishVoices(iphone, 'en-GB').map((x) => x.name)).toEqual(['Daniel', 'Zoe', 'Ava', 'Samantha', 'Karen'])
  })

  it('表示名', () => {
    expect(voiceLabel(iphone[4])).toBe('Zoe・アメリカ・プレミアム')
    expect(voiceLabel(iphone[6])).toBe('Karen・オーストラリア')
  })
})
