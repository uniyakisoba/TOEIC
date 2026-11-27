// 単語データ（src/data/words.json）の検査スクリプト
// エラー（必須項目の欠け・重複・不正な値）があればビルドを止める。
// 警告（例文に単語が含まれていないかも）は表示だけする。
import { readFileSync } from 'node:fs'

const POS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'phrase']
const CATEGORIES = ['general', 'office', 'meeting', 'hr', 'finance', 'sales', 'logistics', 'travel', 'events']
const LEVELS = [600, 730, 860]
const FIELDS = ['id', 'word', 'pos', 'meaning', 'example', 'exampleJa', 'level', 'category']

const words = JSON.parse(readFileSync(new URL('../src/data/words.json', import.meta.url), 'utf8'))
const errors = []
const warnings = []
const seenIds = new Set()
const seenWords = new Set()

for (const w of words) {
  const label = `${w.id ?? '?'} (${w.word ?? '?'})`
  for (const f of FIELDS) {
    if (w[f] === undefined || w[f] === '') errors.push(`${label}: ${f} がありません`)
  }
  if (seenIds.has(w.id)) errors.push(`${label}: id が重複しています`)
  seenIds.add(w.id)
  const key = `${w.word?.toLowerCase()}|${w.pos}`
  if (seenWords.has(key)) errors.push(`${label}: 同じ単語・品詞が重複しています`)
  seenWords.add(key)
  if (!POS.includes(w.pos)) errors.push(`${label}: 品詞 "${w.pos}" が不正です`)
  if (!CATEGORIES.includes(w.category)) errors.push(`${label}: カテゴリ "${w.category}" が不正です`)
  if (!LEVELS.includes(w.level)) errors.push(`${label}: レベル "${w.level}" が不正です`)

  // 例文に見出し語（語尾変化を考慮して末尾の e / y を除いた形）が含まれているか
  const stem = String(w.word).toLowerCase().replace(/[ey]$/, '')
  if (!String(w.example).toLowerCase().includes(stem)) warnings.push(`${label}: 例文に単語が含まれていない可能性があります`)
}

for (const m of warnings) console.warn('⚠ ' + m)
if (errors.length) {
  for (const m of errors) console.error('✖ ' + m)
  console.error(`\n単語データに ${errors.length} 件のエラーがあります`)
  process.exit(1)
}

const count = (key) => Object.entries(words.reduce((a, w) => ((a[w[key]] = (a[w[key]] ?? 0) + 1), a), {}))
  .map(([k, v]) => `${k}:${v}`).join(' ')
console.log(`✔ 単語データ OK：${words.length} 語`)
console.log(`  カテゴリ別  ${count('category')}`)
console.log(`  レベル別    ${count('level')}`)
console.log(`  品詞別      ${count('pos')}`)
