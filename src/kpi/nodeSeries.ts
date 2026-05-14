import type { KpiPayload, ScopeKey } from './types'

/** React Flow の KPI ノード id（例: high-buyer.buyer, ttl-gms_ttl）を分解 */
export function parseKpiFlowNodeId(
  id: string,
): { scope: ScopeKey; metricId: string } | null {
  const pairs: readonly [prefix: string, scope: ScopeKey][] = [
    ['ttl_nodup-', 'ttl_nodup'],
    ['ttl-', 'ttl'],
    ['high-', 'high'],
    ['low-', 'low'],
  ] as const
  for (const [pref, scope] of pairs) {
    if (id.startsWith(pref)) return { scope, metricId: id.slice(pref.length) }
  }
  return null
}

/** 全月の Actual 系列（欠損月は null） */
export function seriesActualForMetric(
  payload: KpiPayload,
  scope: ScopeKey,
  metricId: string,
): { months: string[]; actuals: (number | null)[] } {
  const months = payload.months
  const actuals = months.map((m) => {
    const v = payload.metrics[m]?.[scope]?.[metricId]?.actual
    return v != null && Number.isFinite(v) ? v : null
  })
  return { months, actuals }
}
