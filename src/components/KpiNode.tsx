import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import type { MouseEvent } from 'react'
import type { KpiNodeData } from '../kpi/buildGraph'
import { useKpiDrillOptional } from '../kpi/KpiDrillContext'

type KpiFlowNode = Node<KpiNodeData, 'kpi'>

function gapTone(v: number): string {
  if (v > 0) return 'var(--gap-pos)'
  if (v < 0) return 'var(--gap-neg)'
  return 'var(--muted)'
}

export function KpiNode({ data, selected }: NodeProps<KpiFlowNode>) {
  const drill = useKpiDrillOptional()

  const showDrillChrome =
    drill != null &&
    (data.drillable === true ||
      data.branchExpanded === true ||
      data.dismissible === true)

  const showExpand =
    drill != null &&
    data.drillable === true &&
    data.branchExpanded !== true
  const showClose =
    drill != null &&
    (data.branchExpanded === true || data.dismissible === true)

  const onExpandClick = (e: MouseEvent) => {
    e.stopPropagation()
    drill?.expandBranch(data.metricId)
  }

  const onCloseClick = (e: MouseEvent) => {
    e.stopPropagation()
    if (!drill) return
    if (data.branchExpanded === true) drill.collapseBranch(data.metricId)
    else if (data.dismissible === true) drill.dismissLeaf(data.metricId)
  }

  const bodyTitle = showDrillChrome
    ? 'クリックで右ペインに詳細・推移を表示'
    : undefined

  const targetsMet = data.tvf >= 0 && data.tva >= 0
  const statusClass = targetsMet ? 'kpi-node--status-met' : 'kpi-node--status-miss'

  const achievementHint = targetsMet
    ? 'TvF・TvAともにギャップ≥0（目標以上）'
    : 'TvFまたはTvAがギャップ＜0（目標未満）'

  const abbrevHint = 'A＝Actual · F＝Forecast · T＝Target'
  const titleAttr = [bodyTitle, abbrevHint, achievementHint].filter(Boolean).join(' · ')

  return (
    <div
      className={`kpi-node ${statusClass} ${selected ? 'selected' : ''} ${data.drillable && !data.branchExpanded ? 'kpi-node--drillable' : ''} ${data.branchExpanded ? 'kpi-node--branch-expanded' : ''} ${data.dismissible ? 'kpi-node--dismissible' : ''}`}
      title={titleAttr || undefined}
    >
      {showDrillChrome ? (
        <div className="kpi-node__toolbar" onClick={(e) => e.stopPropagation()}>
          {showExpand ? (
            <button
              type="button"
              className="kpi-node__tool kpi-node__tool--expand"
              title="下位KPIを追加表示"
              aria-label="下位KPIを追加表示"
              onClick={onExpandClick}
            >
              +
            </button>
          ) : null}
          {showClose ? (
            <button
              type="button"
              className="kpi-node__tool kpi-node__tool--close"
              title={
                data.branchExpanded
                  ? '下位の展開を閉じる'
                  : 'このKPIだけ非表示にする'
              }
              aria-label={
                data.branchExpanded ? '下位の展開を閉じる' : 'このKPIだけ非表示'
              }
              onClick={onCloseClick}
            >
              ×
            </button>
          ) : null}
        </div>
      ) : null}
      <Handle type="target" position={Position.Left} />
      <div className="kpi-node__scope">{data.scopeLabel}</div>
      <div className="kpi-node__title">{data.title}</div>
      <div className="kpi-node__compact" aria-label="Actual, Forecast, Target, TvF, TvA">
        <div className="kpi-node__row kpi-node__row--vals">
          <span>
            <span className="kpi-node__k muted">A</span>
            {data.fmt(data.actual)}
          </span>
          <span className="kpi-node__sep muted" aria-hidden>
            ·
          </span>
          <span>
            <span className="kpi-node__k muted">F</span>
            {data.fmt(data.forecast)}
          </span>
          <span className="kpi-node__sep muted" aria-hidden>
            ·
          </span>
          <span>
            <span className="kpi-node__k muted">T</span>
            {data.fmt(data.target)}
          </span>
        </div>
        <div className="kpi-node__row kpi-node__row--gaps">
          <span style={{ color: gapTone(data.tvf) }}>
            <span className="kpi-node__k muted">{data.gapF}</span>
            {data.fmt(data.tvf)}
          </span>
          <span className="kpi-node__sep muted" aria-hidden>
            ·
          </span>
          <span style={{ color: gapTone(data.tva) }}>
            <span className="kpi-node__k muted">{data.gapA}</span>
            {data.fmt(data.tva)}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
