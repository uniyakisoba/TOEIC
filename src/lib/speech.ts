// 音声読み上げ（Web Speech API の speechSynthesis）。
// ブラウザ／OS に入っている音声エンジンを使うので無料・オフラインでも動くが、
// 使える声（voice）の種類や自然さは端末ごとに違う。
import type { Accent } from '../settings'

/** voice の情報のうち、選ぶのに使う部分だけ（テストで偽物を作りやすくするため） */
export interface VoiceLike {
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
 * アクセントに合う声を選ぶ。
 * 1. 言語コードが完全一致（en-US など）するもの → 端末内蔵（オフラインで使える）を優先
 * 2. なければ英語の声（en-〇〇）
 * 3. それもなければ null（ブラウザ任せ）
 */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], accent: Accent): V | null {
  const target = normalize(accent)
  const rank = (v: V) => (v.localService ? 0 : 1) + (v.default ? 0 : 0.5)
  const exact = voices.filter((v) => normalize(v.lang) === target).sort((a, b) => rank(a) - rank(b))
  if (exact.length) return exact[0]
  const english = voices.filter((v) => normalize(v.lang).startsWith('en')).sort((a, b) => rank(a) - rank(b))
  return english[0] ?? null
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
}

/** 読み上げる。前の読み上げが続いていたら止めてから話す */
export function speak(text: string, { accent, rate }: SpeakOptions) {
  if (!isSpeechSupported()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(voicesCache.length ? voicesCache : synth.getVoices(), accent)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? accent
  u.rate = rate
  synth.speak(u)
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
