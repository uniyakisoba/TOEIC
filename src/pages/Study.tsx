import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { words } from '../data/words'
import { CATEGORY_LABELS, POS_LABELS } from '../data/types'
import { SpeakButton } from '../components/SpeakButton'
import { useSpeech } from '../lib/useSpeech'
import { useSettings } from '../settings'
import { today } from '../lib/date'
import { getAllCards, getAllDaily, saveReview } from '../lib/db'
import { buildQueue, summarize, type QueueItem } from '../lib/progress'
import { formatInterval, newCardState, nextInterval, schedule, type CardState, type Grade } from '../lib/srs'

const GRADES: { grade: Grade; label: string; key: string }[] = [
  { grade: 'again', label: 'もう一度', key: '1' },
  { grade: 'hard', label: '難しい', key: '2' },
  { grade: 'good', label: '普通', key: '3' },
  { grade: 'easy', label: '簡単', key: '4' },
]
const EXTRA_NEW_WORDS = 10

type Phase = 'loading' | 'studying' | 'done'

interface SessionStats {
  reviewed: number
  again: number
  wordIds: Set<string>
}

export default function Study() {
  const { settings } = useSettings()
  const { say, autoSpeak } = useSpeech()
  const [date] = useState(today) // 学習開始時の日付で固定（日付をまたいでも途中で変わらない）
  const [phase, setPhase] = useState<Phase>('loading')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [saving, setSaving] = useState(false)
  const [unseen, setUnseen] = useState(0)
  const [stats, setStats] = useState<SessionStats>({ reviewed: 0, again: 0, wordIds: new Set() })

  // 保存済みの記録を読み込み、出題キューを作る。extraNew を指定すると1日の上限を超えて新しい単語を出す
  const start = useCallback(async (extraNew?: number) => {
    setPhase('loading')
    const [cards, logs] = await Promise.all([getAllCards(), getAllDaily()])
    const summary = summarize(words, cards, logs, date, settings.dailyNewWords)
    const cardMap = new Map(cards.map((c) => [c.wordId, c]))
    const q = buildQueue(words, cardMap, date, extraNew ?? summary.newRemaining)
    setUnseen(summary.unseen)
    setQueue(q)
    setIndex(0)
    setFlipped(false)
    setPhase(q.length > 0 ? 'studying' : 'done')
  }, [date, settings.dailyNewWords])

  useEffect(() => { void start() }, [start])

  const current = queue[index]

  // 自動発音：新しいカードが表示されたら単語を読み上げる
  const currentWord = phase === 'studying' ? current?.word.word : undefined
  useEffect(() => {
    if (autoSpeak && currentWord) say(currentWord)
  }, [autoSpeak, currentWord, index, say])
  const baseState: CardState | null = current ? current.state ?? newCardState(current.word.id, date) : null

  const grade = useCallback(async (g: Grade) => {
    if (!current || !baseState || saving) return
    setSaving(true)
    const next = schedule(baseState, g, date)
    await saveReview(next, g, current.state === null, date)
    setStats((s) => ({
      reviewed: s.reviewed + 1,
      again: s.again + (g === 'again' ? 1 : 0),
      wordIds: new Set(s.wordIds).add(current.word.id),
    }))
    // 「もう一度」の単語はキューの最後に回して、今日中にもう一度出す
    const nextQueue = g === 'again' ? [...queue, { word: current.word, state: next }] : queue
    if (g !== 'again' && current.state === null) setUnseen((u) => u - 1)
    setQueue(nextQueue)
    setFlipped(false)
    setSaving(false)
    if (index + 1 >= nextQueue.length) setPhase('done')
    else setIndex(index + 1)
  }, [current, baseState, saving, date, queue, index])

  // PC 用のキーボード操作：スペースで答えを表示、1〜4 で評価
  useEffect(() => {
    if (phase !== 'studying') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped(true)
      } else if (flipped) {
        const hit = GRADES.find((b) => b.key === e.key)
        if (hit) void grade(hit.grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, flipped, grade])

  if (phase === 'loading') return <p className="muted">読み込み中…</p>

  if (phase === 'done') {
    return (
      <section className="card stack-sm center">
        <h2>{stats.reviewed > 0 ? 'おつかれさまでした！' : '今日の学習は完了しています'}</h2>
        {stats.reviewed > 0 && (
          <div className="stat-row">
            <div className="stat"><span className="stat-value">{stats.wordIds.size}</span><span className="stat-label">単語</span></div>
            <div className="stat"><span className="stat-value">{stats.reviewed}</span><span className="stat-label">評価回数</span></div>
            <div className="stat"><span className="stat-value">{stats.again}</span><span className="stat-label">もう一度</span></div>
          </div>
        )}
        <p className="muted small">復習が必要な単語は、最適なタイミングで自動的に出題されます。</p>
        <Link to="/" className="button primary block">ホームへ</Link>
        {unseen > 0 && (
          <button className="button block" onClick={() => void start(Math.min(EXTRA_NEW_WORDS, unseen))}>
            新しい単語をあと{Math.min(EXTRA_NEW_WORDS, unseen)}語学ぶ
          </button>
        )}
      </section>
    )
  }

  const { word } = current
  const isNew = current.state === null
  const remaining = queue.length - index

  return (
    <section className="study">
      <div className="study-meta">
        <span className={`badge ${isNew ? 'badge-new' : ''}`}>{isNew ? '新しい単語' : '復習'}</span>
        <span className="muted small">残り {remaining}</span>
      </div>

      {/* カード全体をタップしてもめくれる（ボタン操作は下の「答えを見る」でも可能） */}
      <div className="flashcard" onClick={() => setFlipped(true)}>
        <span className="muted small">{CATEGORY_LABELS[word.category]}</span>
        <span className="flash-word-row">
          <span className="flash-word">{word.word}</span>
          <SpeakButton text={word.word} />
        </span>
        {flipped ? (
          <span className="flash-answer">
            <span className="flash-meaning"><span className="pos">{POS_LABELS[word.pos]}</span>{word.meaning}</span>
            <span className="flash-example">
              {word.example}
              <SpeakButton text={word.example} label="例文を読み上げ" small />
            </span>
            <span className="muted">{word.exampleJa}</span>
          </span>
        ) : (
          <span className="muted small flash-hint">タップして答えを表示</span>
        )}
      </div>

      {flipped ? (
        <div className="grade-buttons">
          {GRADES.map((b) => (
            <button key={b.grade} className={`grade grade-${b.grade}`} disabled={saving} onClick={() => void grade(b.grade)}>
              <span>{b.label}</span>
              <span className="grade-interval">{formatInterval(nextInterval(baseState!, b.grade))}</span>
            </button>
          ))}
        </div>
      ) : (
        <button className="button primary block" onClick={() => setFlipped(true)}>答えを見る</button>
      )}
    </section>
  )
}
