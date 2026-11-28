import { useMemo, useState } from 'react'
import { words } from '../data/words'
import { CATEGORY_LABELS, POS_LABELS, type Category } from '../data/types'
import { SpeakButton } from '../components/SpeakButton'

type CategoryFilter = Category | 'all'

const categoryOptions = Object.entries(CATEGORY_LABELS) as [Category, string][]

export default function Words() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  // 検索語・カテゴリが変わったときだけ絞り込みを計算し直す（useMemo）
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return words.filter((w) =>
      (category === 'all' || w.category === category) &&
      (q === '' || w.word.toLowerCase().includes(q) || w.meaning.includes(q)),
    )
  }, [query, category])

  return (
    <section className="stack">
      <div className="card stack-sm">
        <input className="search" type="search" placeholder="英単語・意味で検索"
          value={query} onChange={(e) => setQuery(e.target.value)} aria-label="単語を検索" />
        <div className="chips" role="radiogroup" aria-label="カテゴリ">
          <button role="radio" aria-checked={category === 'all'}
            className={`chip ${category === 'all' ? 'active' : ''}`} onClick={() => setCategory('all')}>
            すべて
          </button>
          {categoryOptions.map(([value, label]) => (
            <button key={value} role="radio" aria-checked={category === value}
              className={`chip ${category === value ? 'active' : ''}`} onClick={() => setCategory(value)}>
              {label}
            </button>
          ))}
        </div>
        <p className="muted small">{filtered.length} 語</p>
      </div>

      <ul className="word-list">
        {filtered.map((w) => {
          const open = openId === w.id
          return (
            <li key={w.id} className="card word-item">
              <button className="word-row" aria-expanded={open} onClick={() => setOpenId(open ? null : w.id)}>
                <span className="word-en">{w.word}</span>
                <span className="word-ja">
                  <span className="pos">{POS_LABELS[w.pos]}</span>
                  {w.meaning}
                </span>
              </button>
              {open && (
                <div className="word-detail">
                  <p className="inline-speak">
                    <SpeakButton text={w.word} small />
                    <span className="muted small">単語を発音</span>
                  </p>
                  <p className="inline-speak">{w.example}<SpeakButton text={w.example} label="例文を読み上げ" small /></p>
                  <p className="muted">{w.exampleJa}</p>
                  <p className="small muted">{CATEGORY_LABELS[w.category]}・{w.level}点レベル</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {filtered.length === 0 && <p className="muted">該当する単語がありません</p>}
    </section>
  )
}
