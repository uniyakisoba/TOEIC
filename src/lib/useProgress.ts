import { useCallback, useEffect, useState } from 'react'
import { words } from '../data/words'
import { useSettings } from '../settings'
import { today } from './date'
import { getAllCards, getAllDaily } from './db'
import { summarize, type Summary } from './progress'

/** 画面から使う「学習状況の集計」。DB の読み込みは非同期なので、読み込み中は null */
export function useProgress() {
  const { settings } = useSettings()
  const [summary, setSummary] = useState<Summary | null>(null)

  const reload = useCallback(async () => {
    const [cards, logs] = await Promise.all([getAllCards(), getAllDaily()])
    setSummary(summarize(words, cards, logs, today(), settings.dailyNewWords))
  }, [settings.dailyNewWords])

  useEffect(() => { void reload() }, [reload])

  return { summary, reload }
}
