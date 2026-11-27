// 単語データの「型」。どの項目がどんな種類の値を持つかを決めておくと、
// 書き間違い（例：meaning を meening と書く）をビルド時に検出できる

export const POS_LABELS = {
  noun: '名詞',
  verb: '動詞',
  adjective: '形容詞',
  adverb: '副詞',
  preposition: '前置詞',
  conjunction: '接続詞',
  phrase: '熟語',
} as const

export const CATEGORY_LABELS = {
  general: '頻出一般語',
  office: 'オフィス',
  meeting: '会議',
  hr: '人事・採用',
  finance: '財務・会計',
  sales: '営業・マーケ',
  logistics: '物流・製造',
  travel: '旅行・交通',
  events: '飲食・イベント',
} as const

export const LEVELS = [600, 730, 860] as const

export type PartOfSpeech = keyof typeof POS_LABELS
export type Category = keyof typeof CATEGORY_LABELS
export type Level = (typeof LEVELS)[number]

export interface Word {
  id: string
  word: string
  pos: PartOfSpeech
  meaning: string
  example: string
  exampleJa: string
  level: Level
  category: Category
}
