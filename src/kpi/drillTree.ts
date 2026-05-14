import {
  BUYER_COHORTS,
  BUYER_ROOT,
  BUYER_SPENDING,
  SELLER_COHORTS,
  SELLER_FREQ,
  SELLER_FUNNEL,
  SELLER_LISTING,
  SELLER_UU,
} from './labels'
import type { LaneFilter } from './types'

/**
 * ドリル用: 各指標の直下の子（metricId キーは scope なし）
 * Seller: GMS→Order・AOV / Order→Listing・Sold out / Listing→Seller・Freq / Seller→コホート
 */
export const DRIVER_CHILDREN: Record<string, readonly string[]> = {
  gms: [BUYER_ROOT, BUYER_SPENDING, SELLER_FUNNEL[0], SELLER_FUNNEL[2]],
  [BUYER_ROOT]: [...BUYER_COHORTS],
  [BUYER_SPENDING]: [],
  [SELLER_FUNNEL[0]]: [SELLER_LISTING, SELLER_FUNNEL[1]],
  [SELLER_LISTING]: [SELLER_UU, SELLER_FREQ],
  [SELLER_UU]: [...SELLER_COHORTS],
  [SELLER_FREQ]: [],
  [SELLER_FUNNEL[1]]: [],
  [SELLER_FUNNEL[2]]: [],
  ...Object.fromEntries(
    [...BUYER_COHORTS, ...SELLER_COHORTS].map((id) => [id, [] as const]),
  ),
}

export function childrenOf(metricId: string, lane: LaneFilter): string[] {
  const raw = [...(DRIVER_CHILDREN[metricId] ?? [])]
  if (metricId === 'gms') {
    if (lane === 'buyer') return raw.filter((c) => !c.startsWith('seller.'))
    if (lane === 'seller') return raw.filter((c) => !c.startsWith('buyer.'))
  }
  return raw
}

export function hasChildren(metricId: string, lane: LaneFilter): boolean {
  return childrenOf(metricId, lane).length > 0
}

/** metricId 以下の全 descendant（子・孫… metricId 自身は含まない） */
export function collectDescendants(root: string, lane: LaneFilter): Set<string> {
  const out = new Set<string>()
  const stack = [...childrenOf(root, lane)]
  while (stack.length) {
    const n = stack.pop()!
    if (out.has(n)) continue
    out.add(n)
    for (const ch of childrenOf(n, lane)) stack.push(ch)
  }
  return out
}

/** ルート gms ＋ expanded の子の閉包から、collapsed およびその子孫を除く */
export function computeVisibleMetricIds(
  expanded: ReadonlySet<string>,
  collapsed: ReadonlySet<string>,
  lane: LaneFilter,
): Set<string> {
  const visible = new Set<string>(['gms'])
  let changed = true
  while (changed) {
    changed = false
    for (const mid of visible) {
      if (!expanded.has(mid)) continue
      for (const c of childrenOf(mid, lane)) {
        if (!visible.has(c)) {
          visible.add(c)
          changed = true
        }
      }
    }
  }
  for (const hid of collapsed) {
    if (!visible.has(hid)) continue
    visible.delete(hid)
    for (const d of collectDescendants(hid, lane)) {
      visible.delete(d)
    }
  }
  return visible
}
