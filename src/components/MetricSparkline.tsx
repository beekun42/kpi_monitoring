type MetricSparklineProps = {
  months: string[]
  values: (number | null)[]
  selectedMonth: string
  /** ツールチップ用（短いラベル） */
  valueLabel?: string
}

function monthTickLabel(ym: string): string {
  const tail = ym.slice(5)
  if (tail.length >= 2) return tail.replace(/^0/, '')
  return ym
}

/** 数値をコンパクトに（大きい数は k / M） */
function compactNum(n: number): string {
  const ax = Math.abs(n)
  if (ax >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (ax >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (ax >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  if (ax >= 100) return n.toFixed(0)
  if (ax >= 10) return n.toFixed(1)
  return n.toFixed(2)
}

export function MetricSparkline({
  months,
  values,
  selectedMonth,
  valueLabel = 'Actual',
}: MetricSparklineProps) {
  const W = 280
  const H = 82
  const pad = { t: 8, r: 8, b: 18, l: 8 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const n = months.length

  const finite = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (n === 0 || finite.length === 0) {
    return (
      <div className="sparkline sparkline--empty muted small">
        この指標の Actual がなく、推移を描画できません。
      </div>
    )
  }

  let minV = Math.min(...finite)
  let maxV = Math.max(...finite)
  if (minV === maxV) {
    const d = Math.abs(minV) * 0.05 || 1
    minV -= d
    maxV += d
  }

  const xAt = (i: number) =>
    pad.l + (n <= 1 ? iw / 2 : (i / Math.max(1, n - 1)) * iw)

  let pathD = ''
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v == null || !Number.isFinite(v)) continue
    const x = xAt(i)
    const y = pad.t + ih - ((v - minV) / (maxV - minV)) * ih
    const prevOk =
      i > 0 && values[i - 1] != null && Number.isFinite(values[i - 1] as number)
    if (!pathD) pathD = `M ${x} ${y}`
    else pathD += prevOk ? ` L ${x} ${y}` : ` M ${x} ${y}`
  }

  const selIdx = months.indexOf(selectedMonth)
  const markX = selIdx >= 0 ? xAt(selIdx) : 0
  const markVal = selIdx >= 0 ? values[selIdx] : null
  const markY =
    selIdx >= 0 && markVal != null && Number.isFinite(markVal)
      ? pad.t + ih - ((markVal - minV) / (maxV - minV)) * ih
      : null

  const title = `${valueLabel}: ${months.map((m, i) => `${m}=${values[i] != null ? compactNum(values[i] as number) : '—'}`).join(' / ')}`

  return (
    <div className="sparkline">
      <svg
        className="sparkline__svg"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${valueLabel}の月次推移。選択中は ${selectedMonth}。`}
      >
        <title>{title}</title>
        <line
          className="sparkline__grid0"
          x1={pad.l}
          y1={pad.t + ih}
          x2={pad.l + iw}
          y2={pad.t + ih}
        />
        {selIdx >= 0 ? (
          <line
            className="sparkline__cursor"
            x1={markX}
            y1={pad.t}
            x2={markX}
            y2={pad.t + ih}
          />
        ) : null}
        <path className="sparkline__line" d={pathD} fill="none" />
        {markY != null ? (
          <circle className="sparkline__dot" cx={markX} cy={markY} r={3.5} />
        ) : null}
        {months.map((m, i) => (
          <text
            key={m}
            className="sparkline__tick"
            x={xAt(i)}
            y={H - 3}
            textAnchor="middle"
          >
            {monthTickLabel(m)}
          </text>
        ))}
      </svg>
      <div className="sparkline__legend muted small">
        <span>
          {valueLabel} 全期間／<strong className="sparkline__sel">{selectedMonth}</strong>
          {markVal != null && Number.isFinite(markVal) && selIdx >= 0 ? (
            <>
              {' '}
              <span className="sparkline__selval">{compactNum(markVal)}</span>
            </>
          ) : null}
        </span>
      </div>
    </div>
  )
}
