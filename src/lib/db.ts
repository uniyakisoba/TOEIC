// 学習記録の保存（IndexedDB）。
// IndexedDB はブラウザ内のデータベースで、「ストア」という表のような入れ物にデータを入れる。
//   cards : 単語ごとの学習状態（CardState）。wordId で検索
//   daily : 日ごとの学習量。date で検索（グラフや連続日数に使う）
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CardState, Grade } from './srs'
import type { DateString } from './date'

export interface DailyLog {
  date: DateString
  reviewed: number // その日に評価した回数（延べ）
  newLearned: number // その日に初めて学んだ単語数
  again: number // 「もう一度」の回数
}

interface VocabDB extends DBSchema {
  cards: { key: string; value: CardState }
  daily: { key: string; value: DailyLog }
}

const DB_NAME = 'toeic-vocab'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<VocabDB>> | null = null

function getDB() {
  // 初回だけデータベースを開き、以降は同じ接続を使い回す
  dbPromise ??= openDB<VocabDB>(DB_NAME, DB_VERSION, {
    // upgrade はデータベースを初めて作るとき（や版を上げたとき）だけ呼ばれる
    upgrade(db) {
      db.createObjectStore('cards', { keyPath: 'wordId' })
      db.createObjectStore('daily', { keyPath: 'date' })
    },
  })
  return dbPromise
}

export async function getAllCards(): Promise<CardState[]> {
  return (await getDB()).getAll('cards')
}

export async function getAllDaily(): Promise<DailyLog[]> {
  return (await getDB()).getAll('daily')
}

/**
 * 1回の評価を保存する。単語の状態と日別記録を「トランザクション」でまとめて書き込むので、
 * 途中でアプリを閉じても片方だけ保存される、ということが起きない
 */
export async function saveReview(card: CardState, grade: Grade, isNew: boolean, date: DateString) {
  const db = await getDB()
  const tx = db.transaction(['cards', 'daily'], 'readwrite')
  const daily = (await tx.objectStore('daily').get(date)) ?? { date, reviewed: 0, newLearned: 0, again: 0 }
  daily.reviewed += 1
  if (isNew) daily.newLearned += 1
  if (grade === 'again') daily.again += 1
  await Promise.all([tx.objectStore('cards').put(card), tx.objectStore('daily').put(daily), tx.done])
}

/** テスト用：接続を閉じて次回は開き直す */
export async function resetConnectionForTest() {
  if (dbPromise) (await dbPromise).close()
  dbPromise = null
}
