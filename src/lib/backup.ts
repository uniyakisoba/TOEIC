// バックアップ：学習記録と設定を1つの JSON ファイルにして書き出す／読み込む
import type { Settings } from '../settings'
import type { DailyLog } from './db'
import type { CardState } from './srs'

export const BACKUP_APP = 'toeic-vocab'
export const BACKUP_VERSION = 1

export interface Backup {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  cards: CardState[]
  daily: DailyLog[]
  settings: Partial<Settings>
}

export function buildBackup(cards: CardState[], daily: DailyLog[], settings: Settings, now = new Date()): Backup {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), cards, daily, settings }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v)

function isCard(v: unknown): v is CardState {
  return isObj(v) && typeof v.wordId === 'string' && isNum(v.ease) && isNum(v.interval) && isNum(v.reps)
    && isNum(v.lapses) && isDate(v.due) && (v.lastReviewed === null || isDate(v.lastReviewed))
    && isNum(v.correct) && isNum(v.wrong)
}

function isDaily(v: unknown): v is DailyLog {
  return isObj(v) && isDate(v.date) && isNum(v.reviewed) && isNum(v.newLearned) && isNum(v.again)
}

/**
 * ファイルの中身を検査してから Backup として返す。
 * 外から来たファイルは壊れていたり別物だったりするので、形を一つずつ確かめてから使う
 */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('ファイルを読み取れませんでした（JSON 形式ではありません）')
  }
  if (!isObj(data) || data.app !== BACKUP_APP) throw new Error('このアプリのバックアップファイルではありません')
  if (!isNum(data.version) || (data.version as number) > BACKUP_VERSION) {
    throw new Error('新しい版のアプリで作られたバックアップのため読み込めません')
  }
  if (!Array.isArray(data.cards) || !data.cards.every(isCard)) throw new Error('学習記録（単語）の形式が正しくありません')
  if (!Array.isArray(data.daily) || !data.daily.every(isDaily)) throw new Error('学習記録（日別）の形式が正しくありません')
  return {
    app: BACKUP_APP,
    version: data.version as number,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    cards: data.cards,
    daily: data.daily,
    settings: isObj(data.settings) ? (data.settings as Partial<Settings>) : {},
  }
}

export function backupFileName(date: string) {
  return `toeic-vocab-backup-${date}.json`
}
