// 音声読み上げ（Web Speech API の speechSynthesis）。
// ブラウザ／OS に入っている音声エンジンを使うので無料・オフラインでも動くが、
// 使える声（voice）の種類や自然さは端末ごとに違う。
import type { Accent } from '../settings'

/** voice の情報のうち、選ぶのに使う部分だけ（テストで偽物を作りやすくするため） */
export interface VoiceLike {
  voiceURI: string
  lang: string
  name: string
  default: boolean
  localService: boolean
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

// Android では "en_US" のように _ 区切りのことがあるので "en-us" にそろえる
const normalize = (lang: string) => lang.replace('_', '-').toLowerCase()

/**
 * 学習に向かない声。Apple の端末には、わざと機械的・ふざけた声に作られたもの（ノベルティ音声）や、
 * 昔の読み上げ機の音を再現した声（Eloquence 音声）が入っている。
 */
const UNNATURAL_VOICES = new Set([
  // ノベルティ音声
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester', 'organ',
  'pipe organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox', 'fred', 'junior', 'ralph', 'kathy',
  'princess', 'deranged', 'hysterical',
  // Eloquence 音声
  'eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley',
])

/** 声の名前の「(English (US))」のような付け足しを除いた、本来の名前 */
const baseName = (v: VoiceLike) => v.name.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase()

export function isUnnatural(v: VoiceLike): boolean {
  return UNNATURAL_VOICES.has(baseName(v)) || /eloquence/i.test(v.voiceURI)
}

export type VoiceTier = 'premium' | 'enhanced' | 'natural' | 'standard'

/**
 * 声の品質。iPhone / Mac では voiceURI（声の識別子）に
 *   com.apple.voice.premium.en-US.Ava   ← プレミアム（最高品質）
 *   com.apple.voice.enhanced.en-US.Ava  ← 拡張
 *   com.apple.voice.compact.en-US.Ava   ← 簡易版
 * のように品質が書かれている。Windows の Edge は "(Natural)" が付く声が高品質
 */
export function voiceTier(v: VoiceLike): VoiceTier {
  const id = `${v.voiceURI} ${v.name}`.toLowerCase()
  if (id.includes('premium') || id.includes('プレミアム')) return 'premium'
  if (id.includes('enhanced') || id.includes('拡張')) return 'enhanced'
  if (id.includes('natural') || id.includes('neural')) return 'natural'
  return 'standard'
}

function qualityScore(v: VoiceLike): number {
  const tier = { premium: 30, natural: 25, enhanced: 20, standard: 0 }[voiceTier(v)]
  const google = /google/i.test(v.name) ? 10 : 0 // Android / PC の Chrome の Google 音声は比較的自然
  const compact = /compact/i.test(v.voiceURI) ? -5 : 0
  return tier + google + compact + (v.default ? 1 : 0) + (v.localService ? 0.5 : 0)
}

const byQuality = <V extends VoiceLike>(a: V, b: V) => qualityScore(b) - qualityScore(a)

/** 学習に使える英語の声の一覧：選んだアクセントの声を先に、それぞれ品質の高い順 */
export function englishVoices<V extends VoiceLike>(voices: readonly V[], accent: Accent): V[] {
  const target = normalize(accent)
  const usable = voices.filter((v) => normalize(v.lang).startsWith('en') && !isUnnatural(v))
  return [
    ...usable.filter((v) => normalize(v.lang) === target).sort(byQuality),
    ...usable.filter((v) => normalize(v.lang) !== target).sort(byQuality),
  ]
}

/**
 * 使う声を決める。
 * 1. 設定で声を選んでいて、その声が端末にあればそれ
 * 2. なければ、アクセントが一致する声の中で品質の一番高いもの（不自然な声は除く）
 * 3. なければ、他の英語の声で品質の一番高いもの
 * 4. それもなければ null（ブラウザ任せ）
 */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], accent: Accent, preferredURI?: string | null): V | null {
  if (preferredURI) {
    const chosen = voices.find((v) => v.voiceURI === preferredURI)
    if (chosen) return chosen
  }
  return englishVoices(voices, accent)[0] ?? null
}

const TIER_LABELS: Record<VoiceTier, string> = { premium: 'プレミアム', enhanced: '拡張', natural: 'ナチュラル', standard: '' }
const REGION_LABELS: Record<string, string> = {
  'en-us': 'アメリカ', 'en-gb': 'イギリス', 'en-au': 'オーストラリア', 'en-ca': 'カナダ',
  'en-ie': 'アイルランド', 'en-in': 'インド', 'en-za': '南アフリカ', 'en-nz': 'ニュージーランド',
}

/** 設定画面に出す声の名前（例：Ava・アメリカ・プレミアム） */
export function voiceLabel(v: VoiceLike): string {
  const region = REGION_LABELS[normalize(v.lang)] ?? v.lang
  const tier = TIER_LABELS[voiceTier(v)]
  return [v.name.replace(/\s*\(.*\)\s*$/, ''), region, tier].filter(Boolean).join('・')
}

/** 端末の声の一覧。読み込みが遅れるブラウザがあるので、届くまで少し待つ */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([])
  const synth = window.speechSynthesis
  const now = synth.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener('voiceschanged', done)
      resolve(synth.getVoices())
    }
    synth.addEventListener('voiceschanged', done)
    setTimeout(done, timeoutMs)
  })
}

let voicesCache: SpeechSynthesisVoice[] = []
void loadVoices().then((v) => (voicesCache = v))

export interface SpeakOptions {
  accent: Accent
  rate: number
  voiceURI?: string | null
}

/** 読み上げる。前の読み上げが続いていたら止めてから話す */
export function speak(text: string, { accent, rate, voiceURI }: SpeakOptions) {
  if (!isSpeechSupported()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(voicesCache.length ? voicesCache : synth.getVoices(), accent, voiceURI)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? accent
  u.rate = rate
  synth.speak(u)
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
