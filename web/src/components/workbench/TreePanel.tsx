'use client'
import { useState, useEffect, useRef, useCallback, useMemo, type MutableRefObject } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildDAG } from '@/lib/tree/dagBuilder'
import { computeLayout } from '@/lib/tree/layout'
import { exportAsPNG, exportAsSVG } from '@/lib/tree/export'
import type { PositionedNode, PositionedEdge, Orientation } from '@/lib/tree/layout'
import type { IsnadTreeRef } from './IsnadTree'
import { IsnadTree } from './IsnadTree'
import TreeControls from './TreeControls'
import { TreeErrorBoundary } from './TreeErrorBoundary'

interface TreePanelProps {
  studyId: string
  studyTitle: string
  refreshKey?: number
  onFitRef?: MutableRefObject<(() => void) | null>
  onExportPNGRef?: MutableRefObject<(() => void) | null>
  onToggleOrientationRef?: MutableRefObject<(() => void) | null>
}

export default function TreePanel({
  studyId,
  studyTitle,
  refreshKey = 0,
  onFitRef,
  onExportPNGRef,
  onToggleOrientationRef,
}: TreePanelProps) {
  const [orientation, setOrientation] = useState<Orientation>('top-down')
  const [positionedNodes, setPositionedNodes] = useState<PositionedNode[]>([])
  const [positionedEdges, setPositionedEdges] = useState<PositionedEdge[]>([])
  const [sourceBookColors, setSourceBookColors] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const treeRef = useRef<IsnadTreeRef>(null)

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Chain isolation filter
  const [activeBooks, setActiveBooks] = useState<Set<string>>(new Set())

  const toggleBook = (code: string) =>
    setActiveBooks(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })

  // Legend: unique source books present in this study
  const legendBooks = useMemo(() => {
    const seen = new Map<string, { code: string; name: string; color: string }>()
    for (const edge of positionedEdges) {
      for (const v of edge.versions) {
        if (v.sourceBookCode && !seen.has(v.sourceBookCode)) {
          seen.set(v.sourceBookCode, {
            code: v.sourceBookCode,
            name: v.sourceBook,
            color: sourceBookColors.get(v.sourceBookCode) ?? '#6B7280',
          })
        }
      }
    }
    return Array.from(seen.values())
  }, [positionedEdges, sourceBookColors])

  // Node editing
  const [selectedNode, setSelectedNode] = useState<PositionedNode | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync edit name when selection changes
  useEffect(() => {
    if (selectedNode) {
      setEditName(selectedNode.label)
      setSaveError(null)
    }
  }, [selectedNode])

  // Fit after fullscreen toggle
  useEffect(() => {
    const timer = setTimeout(() => treeRef.current?.fitToScreen(), 150)
    return () => clearTimeout(timer)
  }, [isFullscreen])

  // Expose actions to keyboard shortcuts
  useEffect(() => {
    if (onFitRef) onFitRef.current = () => treeRef.current?.fitToScreen()
    if (onExportPNGRef) {
      onExportPNGRef.current = async () => {
        const svgEl = treeRef.current?.getSVGElement()
        if (svgEl) await exportAsPNG(svgEl, studyTitle)
      }
    }
    if (onToggleOrientationRef) {
      onToggleOrientationRef.current = () =>
        setOrientation(prev => (prev === 'top-down' ? 'rtl' : 'top-down'))
    }
  }, [onFitRef, onExportPNGRef, onToggleOrientationRef, studyTitle])

  const loadTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: colorRows } = await supabase.from('source_book_colors').select('book_code, color_hex')
      const colorMap = new Map<string, string>()
      for (const row of colorRows ?? []) colorMap.set(row.book_code, row.color_hex)
      setSourceBookColors(colorMap)

      const dag = await buildDAG(studyId, supabase)
      const { nodes, edges } = await computeLayout(dag, orientation)
      setPositionedNodes(nodes)
      setPositionedEdges(edges)
    } catch (err) {
      console.error('Tree build error:', err)
      setError('Tree rendering failed. Try refreshing.')
    } finally {
      setLoading(false)
    }
  }, [studyId, orientation, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadTree() }, [loadTree])

  useEffect(() => {
    if (!loading && positionedNodes.length > 0) {
      const timer = setTimeout(() => treeRef.current?.fitToScreen(), 100)
      return () => clearTimeout(timer)
    }
  }, [loading, positionedNodes])

  const handleExport = async (format: 'png' | 'svg') => {
    const svgEl = treeRef.current?.getSVGElement()
    if (!svgEl) return
    if (format === 'png') await exportAsPNG(svgEl, studyTitle)
    else await exportAsSVG(svgEl, studyTitle)
  }

  const handleSaveNode = async () => {
    if (!selectedNode || selectedNode.isProphet || selectedNode.isCompiler || selectedNode.isUnresolved) return
    const trimmed = editName.trim()
    if (!trimmed || trimmed === selectedNode.label) { setSelectedNode(null); return }
    setSaving(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { error: dbErr } = await supabase
        .from('study_narrators')
        .update({ canonical_name: trimmed })
        .eq('study_id', studyId)
        .eq('narrator_key', selectedNode.id)
      if (dbErr) throw dbErr
      // Update label locally so tree reflects change immediately
      setPositionedNodes(prev =>
        prev.map(n => n.id === selectedNode.id ? { ...n, label: trimmed } : n)
      )
      setSelectedNode(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const isEditable = selectedNode && !selectedNode.isProphet && !selectedNode.isCompiler && !selectedNode.isUnresolved

  const controls = (
    <TreeControls
      orientation={orientation}
      onOrientationChange={setOrientation}
      onZoomIn={() => treeRef.current?.zoomBy(1.2)}
      onZoomOut={() => treeRef.current?.zoomBy(1 / 1.2)}
      onFitScreen={() => treeRef.current?.fitToScreen()}
      onExport={handleExport}
      isFullscreen={isFullscreen}
      onFullscreen={() => setIsFullscreen(prev => !prev)}
    />
  )

  const treeCanvas = (
    <div className="flex-1 relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: 'var(--ms-parchment)' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ms-gold)', borderTopColor: 'transparent' }} />
            <p className="text-xs" style={{ color: 'var(--ms-ink-muted)' }}>Building isnād tree…</p>
          </div>
        </div>
      )}
      <TreeErrorBoundary>
        <IsnadTree
          ref={treeRef}
          nodes={positionedNodes}
          edges={positionedEdges}
          sourceBookColors={sourceBookColors}
          activeBooks={activeBooks.size > 0 ? activeBooks : undefined}
          onNodeClick={node => setSelectedNode(prev => prev?.id === node.id ? null : node)}
          selectedNodeId={selectedNode?.id}
        />
      </TreeErrorBoundary>

      {/* Chain isolation legend */}
      {legendBooks.length > 1 && (
        <div className="absolute bottom-4 left-4 z-20 backdrop-blur-sm rounded-xl border shadow-md px-3 py-2 flex items-center gap-2 flex-wrap max-w-xs" style={{ background: 'rgba(250,243,228,0.93)', borderColor: 'var(--ms-border)' }}>
          {activeBooks.size > 0 && (
            <button
              onClick={() => setActiveBooks(new Set())}
              className="text-xs font-medium mr-1 shrink-0 transition-colors"
              style={{ color: 'var(--ms-gold)' }}
              title="Show all chains"
            >
              All
            </button>
          )}
          {legendBooks.map(book => {
            const active = activeBooks.has(book.code)
            return (
              <button
                key={book.code}
                onClick={() => toggleBook(book.code)}
                title={book.name}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all border"
                style={active
                  ? { borderColor: 'var(--ms-border)', background: 'var(--ms-parchment-deep)', color: 'var(--ms-ink)', fontWeight: 500 }
                  : activeBooks.size > 0
                  ? { borderColor: 'var(--ms-border-light)', background: 'var(--ms-parchment-card)', color: 'var(--ms-ink-muted)', opacity: 0.5 }
                  : { borderColor: 'var(--ms-border-light)', background: 'var(--ms-parchment-card)', color: 'var(--ms-ink-mid)' }}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: book.color }} />
                <span style={{ fontFamily: "'Amiri', serif" }} dir="rtl">{book.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Node edit panel */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 w-72 rounded-xl border shadow-lg z-20 overflow-hidden" style={{ background: 'var(--ms-parchment-card)', borderColor: 'var(--ms-border)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--ms-border-light)' }}>
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ms-ink-muted)' }}>
              {selectedNode.isProphet ? 'Prophet ﷺ' : selectedNode.isCompiler ? 'Compiler' : selectedNode.isUnresolved ? 'Unresolved Narrator' : 'Narrator'}
            </span>
            <button onClick={() => setSelectedNode(null)} className="transition-colors" style={{ color: 'var(--ms-ink-muted)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-3">
            {isEditable ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveNode(); if (e.key === 'Escape') setSelectedNode(null) }}
                  dir="rtl"
                  autoFocus
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none text-base"
                  style={{ border: '1px solid var(--ms-border)', background: 'var(--ms-parchment)', color: 'var(--ms-ink)', fontFamily: "'Amiri', serif" }}
                  placeholder="Narrator name…"
                />
                {selectedNode.variants.length > 0 && (
                  <div>
                    <p className="text-xs mb-1.5" style={{ color: 'var(--ms-ink-muted)' }}>Name variants in this study</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.variants.slice(0, 5).map((v, i) => (
                        <button
                          key={i}
                          onClick={() => setEditName(v)}
                          title="Use this variant"
                          className="px-2 py-0.5 text-xs rounded-md transition-colors cursor-pointer"
                          style={{ background: 'var(--ms-parchment-deep)', color: 'var(--ms-ink-mid)', fontFamily: "'Amiri', serif" }}
                          dir="rtl"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {saveError && <p className="text-xs text-red-500">{saveError}</p>}
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={() => setSelectedNode(null)} className="px-3 py-1.5 text-xs transition-colors" style={{ color: 'var(--ms-ink-muted)' }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNode}
                    disabled={saving || !editName.trim()}
                    className="px-4 py-1.5 text-xs text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    style={{ background: 'var(--ms-gold)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ms-gold-dark)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--ms-gold)')}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm mb-2" dir="rtl" style={{ fontFamily: "'Amiri', serif", color: 'var(--ms-ink-mid)' }}>{selectedNode.label}</p>
                <p className="text-xs" style={{ color: 'var(--ms-ink-muted)' }}>
                  {selectedNode.isProphet && 'The Prophet ﷺ is the terminal source of this chain.'}
                  {selectedNode.isCompiler && 'Compiler nodes are derived from the source book and cannot be edited here.'}
                  {selectedNode.isUnresolved && 'This narrator has not been linked yet. Use the Narrator Registry to link them.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  if (error) {
    return (
      <div className="flex flex-col h-full">
        {controls}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="text-sm text-neutral-600 font-medium">{error}</p>
            <button onClick={loadTree} className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--ms-parchment)' }}>
        {controls}
        {treeCanvas}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {controls}
      {treeCanvas}
    </div>
  )
}
