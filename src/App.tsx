import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { MetricSparkline } from './components/MetricSparkline'
import { KpiNode } from './components/KpiNode'
import {
  buildDriverNodes,
  buildExpandedDriverNodes,
  type KpiNodeData,
} from './kpi/buildGraph'
import { titleFor } from './kpi/labels'
import { KpiDrillProvider } from './kpi/KpiDrillContext'
import { parseKpiFlowNodeId, seriesActualForMetric } from './kpi/nodeSeries'
import type { DriverLayout, KpiPayload, LaneFilter } from './kpi/types'

const nodeTypes = { kpi: KpiNode }

type KpiFlowNode = Node<KpiNodeData, 'kpi'>

type ActionRow = { nodeId: string; owner: string; text: string }

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(path)
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

export default function App() {
  const [payload, setPayload] = useState<KpiPayload | null>(null)
  const [actions, setActions] = useState<ActionRow[]>([])
  const [month, setMonth] = useState<string>('')
  const [driverScope, setDriverScope] = useState<'high' | 'low' | 'ttl_nodup'>('high')
  const [lane, setLane] = useState<LaneFilter>('buyer')
  const [driverLayout, setDriverLayout] = useState<DriverLayout>('drill')
  const [expandedMetrics, setExpandedMetrics] = useState<string[]>([])
  const [collapsedMetrics, setCollapsedMetrics] = useState<string[]>([])
  /** 右ペイン用。RF の `selected` はグラフ再生成で消えるため ID で保持する */
  const [sidePanelNodeId, setSidePanelNodeId] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<KpiFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    void (async () => {
      const [p, a] = await Promise.all([
        loadJson<KpiPayload>('/data/kpi-from-excel.json'),
        loadJson<ActionRow[]>('/data/actions.json'),
      ])
      if (p?.months?.length) {
        setPayload(p)
        setMonth(p.months[p.months.length - 1]!)
      }
      if (a) setActions(a)
    })()
  }, [])

  const expandedSet = useMemo(() => new Set(expandedMetrics), [expandedMetrics])
  const collapsedSet = useMemo(() => new Set(collapsedMetrics), [collapsedMetrics])

  useEffect(() => {
    setExpandedMetrics([])
    setCollapsedMetrics([])
    setSidePanelNodeId(null)
  }, [month, driverScope, lane, driverLayout])

  const monthBundle = payload?.metrics[month]

  useEffect(() => {
    if (!monthBundle) {
      setNodes([])
      setEdges([])
      return
    }
    if (driverLayout === 'full') {
      const { nodes: n, edges: e } = buildDriverNodes(driverScope, monthBundle, lane)
      setNodes(n)
      setEdges(e)
      return
    }
    const { nodes: n, edges: e } = buildExpandedDriverNodes(
      driverScope,
      monthBundle,
      lane,
      expandedSet,
      collapsedSet,
    )
    setNodes(n)
    setEdges(e)
  }, [
    monthBundle,
    driverScope,
    lane,
    driverLayout,
    expandedSet,
    collapsedSet,
    setEdges,
    setNodes,
  ])

  /** グラフ再生成後も `selected` を同期（右ペインは sidePanelNodeId で解決） */
  useEffect(() => {
    setNodes((nds) => {
      if (nds.length === 0) return nds
      return nds.map((n) => ({
        ...n,
        selected: sidePanelNodeId != null && n.id === sidePanelNodeId,
      }))
    })
  }, [
    sidePanelNodeId,
    monthBundle,
    driverScope,
    lane,
    driverLayout,
    expandedSet,
    collapsedSet,
    setNodes,
  ])

  const onNodeClick = useCallback((_evt: MouseEvent, node: KpiFlowNode) => {
    setSidePanelNodeId(node.id)
  }, [])

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge(c, eds)),
    [setEdges],
  )

  const selected = useMemo(
    () => (sidePanelNodeId ? nodes.find((n) => n.id === sidePanelNodeId) : undefined),
    [nodes, sidePanelNodeId],
  )

  const relatedActions = useMemo(() => {
    if (!selected?.id) return []
    return actions.filter((x) => x.nodeId === selected.id)
  }, [actions, selected?.id])

  const sideTrendSeries = useMemo(() => {
    if (!payload || !selected?.id) return null
    const parsed = parseKpiFlowNodeId(selected.id)
    if (!parsed) return null
    return seriesActualForMetric(payload, parsed.scope, parsed.metricId)
  }, [payload, selected?.id])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>GMS KPI</strong>
          <span className="muted small">MVP（Excel Fcst＋デモのAct/Tgt）</span>
        </div>
        <div className="topbar__actions">
          <div className="toolbar">
            <label className="field">
              <span>月</span>
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                {(payload?.months ?? []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>スコープ</span>
              <select
                value={driverScope}
                onChange={(e) =>
                  setDriverScope(e.target.value as typeof driverScope)
                }
              >
                <option value="high">High</option>
                <option value="low">Low</option>
                <option value="ttl_nodup">TTL（重複なし）</option>
              </select>
            </label>
            <label className="field">
              <span>レーン</span>
              <select value={lane} onChange={(e) => setLane(e.target.value as LaneFilter)}>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
            </label>
            <label className="field">
              <span>表示</span>
              <select
                value={driverLayout}
                onChange={(e) => setDriverLayout(e.target.value as DriverLayout)}
              >
                <option value="drill">累積展開（クリックで下位を追加）</option>
                <option value="full">全体ツリー</option>
              </select>
            </label>
          </div>
          {__AUTH_ENABLED__ ? (
            <a className="topbar__logout muted small" href="/api/logout">
              ログアウト
            </a>
          ) : null}
        </div>
      </header>

      <div className="note">
        High / Low は購買単価1万円境界。TTLのUUは High UU＋Low UU と一致しない場合があります（同一ユーザーが両方購買）。
        Luxury は初版では非表示です。
      </div>

      {driverLayout === 'drill' ? (
        <>
          <div className="breadcrumb">
            <button
              type="button"
              onClick={() => {
                setExpandedMetrics([])
                setCollapsedMetrics([])
              }}
            >
              展開をクリア
            </button>
            <span className="muted small" style={{ marginLeft: '12px' }}>
              破線＝下位を追加可（右上の＋）／緑枠＝展開中（右上の×で閉じる）／点線＝非表示可（右上の×）。ノード本体クリックは右ペイン表示。
              <br />
              カード左の色条＋背景: TvF・TvA ともギャップ≥0 は緑系、いずれか＜0 は赤系。
              {expandedMetrics.length > 0 ? ` 展開中: ${expandedMetrics.length}` : ''}
              {collapsedMetrics.length > 0 ? ` ／非表示: ${collapsedMetrics.length}` : ''}
            </span>
          </div>
          {collapsedMetrics.length > 0 ? (
            <div className="collapsed-chips">
              <span className="muted small">非表示中（表示で戻す）: </span>
              {collapsedMetrics.map((mid) => (
                <span key={mid} className="chip">
                  <span>{titleFor(mid)}</span>
                  <button
                    type="button"
                    onClick={() => setCollapsedMetrics((c) => c.filter((x) => x !== mid))}
                  >
                    表示
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="layout">
        <div className="canvas-wrap">
          <KpiDrillProvider
            lane={lane}
            expandedMetrics={expandedMetrics}
            collapsedMetrics={collapsedMetrics}
            setExpandedMetrics={setExpandedMetrics}
            setCollapsedMetrics={setCollapsedMetrics}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.2}
              maxZoom={1.8}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={() => setSidePanelNodeId(null)}
              proOptions={{ hideAttribution: true }}
            >
              <MiniMap pannable zoomable />
              <Controls />
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            </ReactFlow>
          </KpiDrillProvider>
        </div>

        <aside className="side">
          <h2 className="side__title">詳細</h2>
          {!selected ? (
            <p className="muted side__placeholder">
              KPI ノードをクリックで推移と数値を表示。キャンバス空白で解除。
            </p>
          ) : (
            <div className="side__split">
              <section className="side__trend" aria-label="月次 Actual の推移">
                <h3 className="side__trend-heading">Actual 推移</h3>
                {sideTrendSeries ? (
                  <MetricSparkline
                    months={sideTrendSeries.months}
                    values={sideTrendSeries.actuals}
                    selectedMonth={month}
                  />
                ) : (
                  <p className="muted small">このノードは推移表示の対象外です。</p>
                )}
              </section>
              <div className="side__detail">
                <div className="pill">{selected.data.scopeLabel}</div>
                <h3 className="side__metric-title">{selected.data.title}</h3>
                <dl className="dl dl--compact">
                  <dt>A</dt>
                  <dd>{selected.data.fmt(selected.data.actual)}</dd>
                  <dt>F</dt>
                  <dd>{selected.data.fmt(selected.data.forecast)}</dd>
                  <dt>T</dt>
                  <dd>{selected.data.fmt(selected.data.target)}</dd>
                  <dt>{selected.data.gapF}</dt>
                  <dd>{selected.data.fmt(selected.data.tvf)}</dd>
                  <dt>{selected.data.gapA}</dt>
                  <dd>{selected.data.fmt(selected.data.tva)}</dd>
                </dl>
                <p className="muted small side__gap-hint">TvF＝F−T、TvA＝A−T</p>
                <h3 className="side__section-heading">アクション</h3>
                {relatedActions.length === 0 ? (
                  <p className="muted small">
                    このノード向けの行は <code>public/data/actions.json</code> に追加してください。
                  </p>
                ) : (
                  <ul className="actions">
                    {relatedActions.map((x, i) => (
                      <li key={i}>
                        <div className="owner">{x.owner}</div>
                        <div>{x.text}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
