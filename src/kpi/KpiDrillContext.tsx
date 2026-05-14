import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { collectDescendants, computeVisibleMetricIds, hasChildren } from './drillTree'
import type { LaneFilter } from './types'

export type KpiDrillContextValue = {
  lane: LaneFilter
  expandBranch: (metricId: string) => void
  collapseBranch: (metricId: string) => void
  dismissLeaf: (metricId: string) => void
}

const KpiDrillContext = createContext<KpiDrillContextValue | null>(null)

export function useKpiDrillOptional(): KpiDrillContextValue | null {
  return useContext(KpiDrillContext)
}

type ProviderProps = {
  children: ReactNode
  lane: LaneFilter
  expandedMetrics: string[]
  collapsedMetrics: string[]
  setExpandedMetrics: Dispatch<SetStateAction<string[]>>
  setCollapsedMetrics: Dispatch<SetStateAction<string[]>>
}

export function KpiDrillProvider({
  children,
  lane,
  expandedMetrics,
  collapsedMetrics,
  setExpandedMetrics,
  setCollapsedMetrics,
}: ProviderProps) {
  const expandedSet = useMemo(() => new Set(expandedMetrics), [expandedMetrics])
  const collapsedSet = useMemo(() => new Set(collapsedMetrics), [collapsedMetrics])

  const expandBranch = useCallback(
    (mid: string) => {
      if (!hasChildren(mid, lane)) return
      setExpandedMetrics((e) => (e.includes(mid) ? e : [...e, mid]))
      setCollapsedMetrics((c) => c.filter((x) => x !== mid))
    },
    [lane, setExpandedMetrics, setCollapsedMetrics],
  )

  const collapseBranch = useCallback(
    (mid: string) => {
      if (!expandedSet.has(mid)) return
      setExpandedMetrics((e) => e.filter((x) => x !== mid))
      if (mid === 'gms') {
        setCollapsedMetrics([])
      } else {
        const sub = new Set([mid, ...collectDescendants(mid, lane)])
        setCollapsedMetrics((c) => c.filter((x) => !sub.has(x)))
      }
    },
    [lane, expandedSet, setExpandedMetrics, setCollapsedMetrics],
  )

  const dismissLeaf = useCallback(
    (mid: string) => {
      if (mid === 'gms') return
      const vis = computeVisibleMetricIds(expandedSet, collapsedSet, lane)
      if (vis.has(mid)) {
        setCollapsedMetrics((c) => (c.includes(mid) ? c : [...c, mid]))
      }
    },
    [lane, expandedSet, collapsedSet, setCollapsedMetrics],
  )

  const value = useMemo(
    () => ({ lane, expandBranch, collapseBranch, dismissLeaf }),
    [lane, expandBranch, collapseBranch, dismissLeaf],
  )

  return <KpiDrillContext.Provider value={value}>{children}</KpiDrillContext.Provider>
}
