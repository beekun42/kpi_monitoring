const currencyFmt = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

const countFmt = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 1,
})

export function formatKpiValue(metricId: string, v: number): string {
  const yenLike =
    metricId.includes('gms') ||
    metricId.endsWith('spending') ||
    metricId.endsWith('aov')
  if (yenLike) {
    if (Math.abs(v) >= 1e8) {
      return `${(v / 1e8).toFixed(2)}億円`
    }
    return currencyFmt.format(Math.round(v))
  }
  if (metricId.endsWith('soldout_rate') || metricId.endsWith('.rr')) {
    const ratio = Math.abs(v) <= 1.5 ? v : v / 100
    return `${(ratio * 100).toFixed(2)}%`
  }
  return countFmt.format(v)
}

export function gapLabel(name: 'TvF' | 'TvA'): string {
  return name
}
