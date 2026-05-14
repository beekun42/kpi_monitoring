import type { Edge, Node } from '@xyflow/react'
import type { KpiValues, LaneFilter } from './types'
import { computeVisibleMetricIds, hasChildren } from './drillTree'
import {
  BUYER_COHORTS,
  BUYER_ROOT,
  BUYER_SPENDING,
  SELLER_COHORTS,
  SELLER_FREQ,
  SELLER_FUNNEL,
  SELLER_LISTING,
  SELLER_UU,
  titleFor,
} from './labels'
import { formatKpiValue, gapLabel } from './format'

export type KpiNodeData = {
  metricId: string
  title: string
  scopeLabel: string
  forecast: number
  actual: number
  target: number
  tvf: number
  tva: number
  fmt: (n: number) => string
  gapF: string
  gapA: string
  /** クリックで下位を追加表示できる */
  drillable?: boolean
  /** 下位が展開済み（クリックで閉じる） */
  branchExpanded?: boolean
  /** 子を持たないノードを個別に非表示にできる */
  dismissible?: boolean
}

const scopeLabels: Record<string, string> = {
  ttl: '全体',
  high: 'High（購買1万円以上）',
  low: 'Low（購買1万円未満）',
  ttl_nodup: 'TTL（重複なし）',
}

function vals(
  bundle: Record<string, KpiValues> | undefined,
  id: string,
): KpiValues | undefined {
  return bundle?.[id]
}

function nodeData(
  metricId: string,
  scopeKey: string,
  v: KpiValues | undefined,
): KpiNodeData | null {
  if (!v) return null
  const tvf = v.forecast - v.target
  const tva = v.actual - v.target
  return {
    metricId,
    title: titleFor(metricId),
    scopeLabel: scopeLabels[scopeKey] ?? scopeKey,
    forecast: v.forecast,
    actual: v.actual,
    target: v.target,
    tvf,
    tva,
    fmt: (n) => formatKpiValue(metricId, n),
    gapF: gapLabel('TvF'),
    gapA: gapLabel('TvA'),
  }
}

/** .kpi-node 想定の高さ（同階層コホートの縦積み間隔に使用） */
const LAYOUT_NODE_H = 118
const LAYOUT_PAD = 10
/** ドライバー横方向の列幅（Seller ツリーの深さごと） */
const DRIVER_COL_W = 300
/** 同階層コホート（NewR13 等）の縦積み間隔 */
const COHORT_STACK_DY = LAYOUT_NODE_H + LAYOUT_PAD

export function buildDriverNodes(
  scopeKey: 'high' | 'low' | 'ttl_nodup',
  monthData: Record<string, Record<string, KpiValues>> | undefined,
  lane: LaneFilter,
): { nodes: Node<KpiNodeData, 'kpi'>[]; edges: Edge[] } {
  const scope = monthData?.[scopeKey]
  const nodes: Node<KpiNodeData, 'kpi'>[] = []
  const edges: Edge[] = []

  const gms = vals(scope, 'gms')
  const gmsId = `${scopeKey}-gms`
  const dGms = nodeData('gms', scopeKey, gms)

  const showBuyer = lane !== 'seller'
  const showSeller = lane !== 'buyer'

  const gmsPos = { x: 40, y: 320 }
  let buyerColX = 360
  let cohortColX = 680
  let sellerColX = 360

  if (showBuyer) {
    buyerColX = 360
    cohortColX = 680
  } else {
    sellerColX = 360
  }

  if (dGms) nodes.push({ id: gmsId, type: 'kpi', position: gmsPos, data: dGms })

  if (showBuyer) {
    const rootId = `${scopeKey}-${BUYER_ROOT}`
    const spendId = `${scopeKey}-${BUYER_SPENDING}`
    const dRoot = nodeData(BUYER_ROOT, scopeKey, vals(scope, BUYER_ROOT))
    const dSpend = nodeData(BUYER_SPENDING, scopeKey, vals(scope, BUYER_SPENDING))
    const buyerHubY = 160
    if (dRoot) {
      nodes.push({
        id: rootId,
        type: 'kpi',
        position: { x: buyerColX, y: buyerHubY },
        data: dRoot,
      })
      edges.push({ id: `e-${rootId}`, source: gmsId, target: rootId })
      let cy = 36
      for (const m of BUYER_COHORTS) {
        const id = `${scopeKey}-${m}`
        const d = nodeData(m, scopeKey, vals(scope, m))
        if (!d) continue
        nodes.push({
          id,
          type: 'kpi',
          position: { x: cohortColX, y: cy },
          data: d,
        })
        edges.push({ id: `e-${id}`, source: rootId, target: id })
        cy += COHORT_STACK_DY
      }
    }
    if (dSpend) {
      nodes.push({
        id: spendId,
        type: 'kpi',
        position: { x: buyerColX, y: 240 },
        data: dSpend,
      })
      edges.push({ id: `e-${spendId}`, source: gmsId, target: spendId })
    }
  }

  if (showSeller) {
    const [oM, soM, aM] = SELLER_FUNNEL
    const orderId = `${scopeKey}-${oM}`
    const soldoutId = `${scopeKey}-${soM}`
    const aovId = `${scopeKey}-${aM}`
    const listingId = `${scopeKey}-${SELLER_LISTING}`
    const sellerUuId = `${scopeKey}-${SELLER_UU}`
    const freqId = `${scopeKey}-${SELLER_FREQ}`

    const dOrder = nodeData(oM, scopeKey, vals(scope, oM))
    const dSo = nodeData(soM, scopeKey, vals(scope, soM))
    const dAov = nodeData(aM, scopeKey, vals(scope, aM))
    const dListing = nodeData(SELLER_LISTING, scopeKey, vals(scope, SELLER_LISTING))
    const dSeller = nodeData(SELLER_UU, scopeKey, vals(scope, SELLER_UU))
    const dFreq = nodeData(SELLER_FREQ, scopeKey, vals(scope, SELLER_FREQ))

    /** Seller ツリー左端 */
    const sellerX0 = sellerColX
    const colX = (col: number) => sellerX0 + col * DRIVER_COL_W
    const hubY = 280

    if (dOrder) {
      nodes.push({
        id: orderId,
        type: 'kpi',
        position: { x: colX(0), y: hubY - 100 },
        data: dOrder,
      })
      if (dGms) edges.push({ id: `es-${orderId}`, source: gmsId, target: orderId })
    }
    if (dAov) {
      nodes.push({
        id: aovId,
        type: 'kpi',
        position: { x: colX(0), y: hubY + 110 },
        data: dAov,
      })
      if (dGms) edges.push({ id: `es-${aovId}`, source: gmsId, target: aovId })
    }

    if (dListing && dOrder) {
      nodes.push({
        id: listingId,
        type: 'kpi',
        position: { x: colX(1), y: hubY - 110 },
        data: dListing,
      })
      edges.push({ id: `es-${listingId}`, source: orderId, target: listingId })
    }
    if (dSo && dOrder) {
      nodes.push({
        id: soldoutId,
        type: 'kpi',
        position: { x: colX(1), y: hubY + 100 },
        data: dSo,
      })
      edges.push({ id: `es-${soldoutId}`, source: orderId, target: soldoutId })
    }

    if (dFreq && dListing && dOrder) {
      nodes.push({
        id: freqId,
        type: 'kpi',
        position: { x: colX(2), y: hubY + 100 },
        data: dFreq,
      })
      edges.push({ id: `es-${freqId}`, source: listingId, target: freqId })
    }

    if (dSeller && dListing && dOrder) {
      nodes.push({
        id: sellerUuId,
        type: 'kpi',
        position: { x: colX(2), y: hubY - 110 },
        data: dSeller,
      })
      edges.push({ id: `es-${sellerUuId}`, source: listingId, target: sellerUuId })

      let cy =
        hubY -
        Math.floor(((SELLER_COHORTS.length - 1) * COHORT_STACK_DY) / 2)
      for (const m of SELLER_COHORTS) {
        const id = `${scopeKey}-${m}`
        const d = nodeData(m, scopeKey, vals(scope, m))
        if (!d) continue
        nodes.push({
          id,
          type: 'kpi',
          position: { x: colX(3), y: cy },
          data: d,
        })
        edges.push({ id: `es-${id}`, source: sellerUuId, target: id })
        cy += COHORT_STACK_DY
      }
    }
  }

  return { nodes, edges }
}

export function buildExpandedDriverNodes(
  scopeKey: 'high' | 'low' | 'ttl_nodup',
  monthData: Record<string, Record<string, KpiValues>> | undefined,
  lane: LaneFilter,
  expanded: ReadonlySet<string>,
  collapsed: ReadonlySet<string>,
): { nodes: Node<KpiNodeData, 'kpi'>[]; edges: Edge[] } {
  const full = buildDriverNodes(scopeKey, monthData, lane)
  const visible = computeVisibleMetricIds(expanded, collapsed, lane)
  const nodes = full.nodes
    .filter((n) => visible.has(n.data.metricId))
    .map((n) => {
      const mid = n.data.metricId
      const h = hasChildren(mid, lane)
      return {
        ...n,
        data: {
          ...n.data,
          drillable: h,
          branchExpanded: expanded.has(mid),
          dismissible: mid !== 'gms' && !h,
        },
      }
    })
  const idSet = new Set(nodes.map((n) => n.id))
  const edges = full.edges.filter((e) => idSet.has(e.source) && idSet.has(e.target))
  return { nodes, edges }
}