export type ScopeKey = 'ttl' | 'high' | 'low' | 'ttl_nodup'

export type KpiValues = {
  actual: number
  forecast: number
  target: number
}

export type MonthBundle = Record<ScopeKey, Record<string, KpiValues>>

export type KpiPayload = {
  months: string[]
  metrics: Record<string, MonthBundle>
}

export type LaneFilter = 'buyer' | 'seller'

/** ドライバ分解のレイアウト */
export type DriverLayout = 'drill' | 'full'
