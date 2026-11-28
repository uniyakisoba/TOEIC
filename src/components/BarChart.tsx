import { useEffect, useRef, useState } from 'react'
import { niceCeil } from '../lib/stats'

export interface BarDatum {
  key: string
  label: string // ツールチップ・表に出す名前（例：11月28日）
  axisLabel?: string // 横軸に出す短い名前（出さない棒は undefined）
  value: number
}

const HEIGHT = 160
const M = { top: 12, right: 4, bottom: 22, left: 30 } // 余白（目盛りの文字を置く場所）
const RADIUS = 4

/** 要素の横幅を測り、画面サイズが変わったら測り直す（ResizeObserver） */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

/** 上の角だけ丸い棒（下＝基準線側は四角） */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(RADIUS, h, w / 2)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

/**
 * 1系列の縦棒グラフ（SVG で自作）。
 * 棒にポインターを当てる／タップする／キーボードで選ぶと、値をツールチップで表示する。
 */
export function BarChart({ data, unit, title }: { data: BarDatum[]; unit: string; title: string }) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const max = niceCeil(Math.max(0, ...data.map((d) => d.value)))
  const ticks = [0, max / 2, max]
  const innerW = Math.max(0, width - M.left - M.right)
  const innerH = HEIGHT - M.top - M.bottom
  const slot = data.length ? innerW / data.length : 0
  const barW = Math.max(1, Math.min(24, slot - 2)) // 太さは最大24px、隣との間に2pxのすき間
  const y = (v: number) => M.top + innerH - (v / max) * innerH

  const activeDatum = active !== null ? data[active] : null
  const tipLeft = active !== null ? M.left + slot * (active + 0.5) : 0

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label={title} onPointerLeave={() => setActive(null)}>
          {/* 目盛り線（細く・控えめに） */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={M.left - 6} y={y(t)} className="chart-tick" textAnchor="end" dominantBaseline="middle">{t}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = M.left + slot * i + (slot - barW) / 2
            const h = (d.value / max) * innerH
            return (
              <g key={d.key}>
                {d.value > 0 && (
                  <path d={barPath(x, y(d.value), barW, h)} className={`chart-bar ${active === i ? 'active' : ''}`} />
                )}
                {d.axisLabel && (
                  <text x={M.left + slot * (i + 0.5)} y={HEIGHT - 6} className="chart-tick" textAnchor="middle">{d.axisLabel}</text>
                )}
                {/* 当たり判定は棒より大きく：その日の縦一列全体 */}
                <rect x={M.left + slot * i} y={M.top} width={slot} height={innerH} fill="transparent"
                  tabIndex={0} aria-label={`${d.label}：${d.value}${unit}`}
                  onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)}
                  onFocus={() => setActive(i)} onBlur={() => setActive(null)} />
              </g>
            )
          })}
        </svg>
      )}
      {activeDatum && (
        <div className="chart-tooltip" style={{ left: Math.min(Math.max(tipLeft, 50), width - 50) }} role="status">
          <strong>{activeDatum.value}{unit}</strong>
          <span>{activeDatum.label}</span>
        </div>
      )}
    </div>
  )
}
