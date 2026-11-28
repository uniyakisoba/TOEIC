import { useCallback, useEffect, useRef, useState } from 'react'
import { words } from '../data/words'
import { POS_LABELS, type Word } from '../data/types'
import { SpeakButton } from '../components/SpeakButton'
import { useSpeech } from '../lib/useSpeech'
import { today } from '../lib/date'
import { getAllCards, saveReview } from '../lib/db'
import { buildQuestions, type Direction, type Question } from '../lib/quiz'
import { schedule, type CardState } from '../lib/srs'

type Scope = 'learned' | 'all'
type Phase = 'setup' | 'playing' | 'result'

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'en-ja', label: '英 → 日' },
  { value: 'ja-en', label: '日 → 英' },
]
const COUNTS = [10, 20, 30]

interface Answer {
  question: Question
  chosenId: string
  correct: boolean
}

export default function Quiz() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [cards, setCards] = useState<Map<string, CardState> | null>(null)
  const [direction, setDirection] = useState<Direction>('en-ja')
  const [scope, setScope] = useState<Scope>('learned')
  const [count, setCount] = useState(10)
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const feedbackRef = useRef<HTMLDivElement>(null)
  const { say, autoSpeak } = useSpeech()

  // 学習済みの単語（SRS に記録がある単語）を読み込む
  useEffect(() => {
    void getAllCards().then((list) => {
      const map = new Map(list.map((c) => [c.wordId, c]))
      setCards(map)
      if (map.size === 0) setScope('all')
    })
  }, [])

  const learnedWords = cards ? words.filter((w) => cards.has(w.id)) : []
  const pool = scope === 'learned' ? learnedWords : words

  const begin = (target: readonly Word[], n: number) => {
    setQuestions(buildQuestions(target, words, n, direction))
    setIndex(0)
    setAnswers([])
    setPhase('playing')
  }

  const question = questions[index]
  const answered = answers.length > index ? answers[index] : null

  // 回答したら、解説と「次へ」ボタンが画面内に入るようにスクロールする
  useEffect(() => {
    if (answered) feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [answered])

  // 自動発音：英→日は問題表示時、日→英は答えがわかってから単語を読み上げる
  const promptWord = phase === 'playing' ? question?.word.word : undefined
  useEffect(() => {
    if (autoSpeak && promptWord && direction === 'en-ja') say(promptWord)
  }, [autoSpeak, promptWord, direction, index, say])
  useEffect(() => {
    if (autoSpeak && answered && direction === 'ja-en') say(answered.question.word.word)
  }, [autoSpeak, answered, direction, say])

  // 次の問題に進んだら画面の一番上に戻る
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [index])

  const choose = useCallback(async (choice: Word) => {
    if (!question || answered || !cards) return
    const correct = choice.id === question.word.id
    setAnswers((a) => [...a, { question, chosenId: choice.id, correct }])
    // 間違えた単語が学習中なら、SRS でも「もう一度」扱いにして今日の復習に戻す
    const state = cards.get(question.word.id)
    if (!correct && state) {
      const date = today()
      const next = schedule(state, 'again', date)
      await saveReview(next, 'again', false, date)
      setCards((m) => new Map(m).set(next.wordId, next))
    }
  }, [question, answered, cards])

  const next = useCallback(() => {
    if (index + 1 >= questions.length) setPhase('result')
    else setIndex(index + 1)
  }, [index, questions.length])

  // PC 用のキーボード操作：1〜4 で回答、Enter / スペースで次へ
  useEffect(() => {
    if (phase !== 'playing' || !question) return
    const onKey = (e: KeyboardEvent) => {
      if (!answered) {
        const n = Number(e.key)
        if (n >= 1 && n <= question.choices.length) void choose(question.choices[n - 1])
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, question, answered, choose, next])

  if (!cards) return <p className="muted">読み込み中…</p>

  // ===== 設定画面 =====
  if (phase === 'setup') {
    return (
      <section className="stack">
        <div className="card">
          <h2>4択クイズ</h2>
          <div className="field">
            <span className="field-label">出題形式</span>
            <div className="segmented cols-2" role="radiogroup" aria-label="出題形式">
              {DIRECTIONS.map((d) => (
                <button key={d.value} role="radio" aria-checked={direction === d.value}
                  className={direction === d.value ? 'active' : ''} onClick={() => setDirection(d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">出題範囲</span>
            <div className="segmented cols-2" role="radiogroup" aria-label="出題範囲">
              <button role="radio" aria-checked={scope === 'learned'} disabled={learnedWords.length === 0}
                className={scope === 'learned' ? 'active' : ''} onClick={() => setScope('learned')}>
                学習した単語（{learnedWords.length}）
              </button>
              <button role="radio" aria-checked={scope === 'all'}
                className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>
                すべて（{words.length}）
              </button>
            </div>
          </div>
          <div className="field">
            <span className="field-label">問題数</span>
            <div className="segmented" role="radiogroup" aria-label="問題数">
              {COUNTS.map((n) => (
                <button key={n} role="radio" aria-checked={count === n}
                  className={count === n ? 'active' : ''} onClick={() => setCount(n)}>
                  {n}問
                </button>
              ))}
            </div>
          </div>
          {scope === 'learned' && pool.length < count && (
            <p className="muted small">学習した単語が{pool.length}語なので、{pool.length}問になります。</p>
          )}
          <button className="button primary block" disabled={pool.length === 0} onClick={() => begin(pool, count)}>
            スタート
          </button>
        </div>
        <p className="muted small">
          ※ 学習中の単語を間違えると、フラッシュカードの「もう一度」と同じ扱いになり、今日の復習に追加されます。
        </p>
      </section>
    )
  }

  // ===== 結果画面 =====
  if (phase === 'result') {
    const correctCount = answers.filter((a) => a.correct).length
    const wrong = answers.filter((a) => !a.correct)
    const pct = Math.round((correctCount / answers.length) * 100)
    return (
      <section className="stack">
        <div className="card center stack-sm">
          <h2>結果</h2>
          <p className="score">{correctCount} <span className="muted">/ {answers.length}</span></p>
          <p className="muted">正答率 {pct}%{pct === 100 ? '　全問正解！' : ''}</p>
          {wrong.length > 0 && (
            <button className="button primary block" onClick={() => begin(wrong.map((a) => a.question.word), wrong.length)}>
              間違えた{wrong.length}問をもう一度
            </button>
          )}
          <button className="button block" onClick={() => setPhase('setup')}>新しいクイズ</button>
        </div>
        {wrong.length > 0 && (
          <div className="card">
            <h2>間違えた単語</h2>
            <ul className="review-list">
              {wrong.map(({ question: q }) => (
                <li key={q.word.id}>
                  <strong>{q.word.word}</strong>
                  <span className="muted"><span className="pos">{POS_LABELS[q.word.pos]}</span>{q.word.meaning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    )
  }

  // ===== 出題画面 =====
  const { word } = question
  const label = (w: Word) => (direction === 'en-ja' ? w.meaning : w.word)
  const choiceClass = (c: Word) => {
    if (!answered) return ''
    if (c.id === word.id) return 'correct'
    if (c.id === answered.chosenId) return 'wrong'
    return 'dim'
  }

  return (
    <section className="study">
      <div className="study-meta">
        <span className="muted small">{index + 1} / {questions.length}</span>
        <span className="muted small">正解 {answers.filter((a) => a.correct).length}</span>
      </div>
      <div className="progress thin"><div style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }} /></div>

      <div className="card quiz-prompt">
        <span className="pos">{POS_LABELS[word.pos]}</span>
        <span className="flash-word-row">
          <span className={direction === 'en-ja' ? 'flash-word' : 'quiz-ja'}>
            {direction === 'en-ja' ? word.word : word.meaning}
          </span>
          {direction === 'en-ja' && <SpeakButton text={word.word} />}
        </span>
      </div>

      <div className="choices">
        {question.choices.map((c, i) => (
          <button key={c.id} className={`choice ${choiceClass(c)}`} disabled={!!answered} onClick={() => void choose(c)}>
            <span className="choice-num">{i + 1}</span>
            <span>{label(c)}</span>
          </button>
        ))}
      </div>

      {answered && (
        <div className="stack-sm" ref={feedbackRef}>
          <div className={`card feedback ${answered.correct ? 'ok' : 'ng'}`}>
            <strong>{answered.correct ? '正解！' : '不正解'}</strong>
            <span className="inline-speak"><strong>{word.word}</strong>：{word.meaning}<SpeakButton text={word.word} small /></span>
            <span className="inline-speak">{word.example}<SpeakButton text={word.example} label="例文を読み上げ" small /></span>
            <span className="muted">{word.exampleJa}</span>
          </div>
          <button className="button primary block" onClick={next}>
            {index + 1 >= questions.length ? '結果を見る' : '次へ'}
          </button>
        </div>
      )}
    </section>
  )
}
