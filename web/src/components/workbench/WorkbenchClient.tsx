'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import VersionPanel from './VersionPanel'
import RightPanel from './RightPanel'
import TreePanel from './TreePanel'
import KeyboardHint from './KeyboardHint'
import { useWorkbenchKeyboard } from '@/hooks/useWorkbenchKeyboard'

interface WorkbenchClientProps {
  studyId: string
  studyTitle: string
}

const MIN_LEFT = 200
const MAX_LEFT = 500
const MIN_RIGHT = 200
const MAX_RIGHT = 500
const MIN_CENTER = 400

export default function WorkbenchClient({ studyId, studyTitle }: WorkbenchClientProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [leftWidth, setLeftWidth] = useState(280)
  const [rightWidth, setRightWidth] = useState(320)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Persist panel widths
  useEffect(() => {
    try {
      const saved = localStorage.getItem('workbench-panels')
      if (saved) {
        const { left, right } = JSON.parse(saved) as { left: number; right: number }
        setLeftWidth(left)
        setRightWidth(right)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        'workbench-panels',
        JSON.stringify({ left: leftWidth, right: rightWidth })
      )
    } catch {
      // ignore
    }
  }, [leftWidth, rightWidth])

  const handleVersionSaved = () => {
    setRefreshKey(prev => prev + 1)
  }

  // ── Drag handle: left ──────────────────────────────────────────────────────
  const isDraggingLeft = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const onLeftHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingLeft.current = true
      dragStartX.current = e.clientX
      dragStartWidth.current = leftWidth

      const onMove = (ev: MouseEvent) => {
        if (!isDraggingLeft.current) return
        const containerWidth = containerRef.current?.offsetWidth ?? 1200
        const delta = ev.clientX - dragStartX.current
        const newLeft = Math.max(
          MIN_LEFT,
          Math.min(
            MAX_LEFT,
            dragStartWidth.current + delta,
            containerWidth - MIN_CENTER - (rightCollapsed ? 0 : rightWidth)
          )
        )
        setLeftWidth(newLeft)
      }

      const onUp = () => {
        isDraggingLeft.current = false
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [leftWidth, rightWidth, rightCollapsed]
  )

  const onLeftHandleDblClick = useCallback(() => {
    setLeftCollapsed(prev => !prev)
  }, [])

  // ── Drag handle: right ─────────────────────────────────────────────────────
  const isDraggingRight = useRef(false)
  const dragStartXRight = useRef(0)
  const dragStartWidthRight = useRef(0)

  const onRightHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRight.current = true
      dragStartXRight.current = e.clientX
      dragStartWidthRight.current = rightWidth

      const onMove = (ev: MouseEvent) => {
        if (!isDraggingRight.current) return
        const containerWidth = containerRef.current?.offsetWidth ?? 1200
        const delta = dragStartXRight.current - ev.clientX
        const newRight = Math.max(
          MIN_RIGHT,
          Math.min(
            MAX_RIGHT,
            dragStartWidthRight.current + delta,
            containerWidth - MIN_CENTER - (leftCollapsed ? 0 : leftWidth)
          )
        )
        setRightWidth(newRight)
      }

      const onUp = () => {
        isDraggingRight.current = false
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [rightWidth, leftWidth, leftCollapsed]
  )

  const onRightHandleDblClick = useCallback(() => {
    setRightCollapsed(prev => !prev)
  }, [])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  // We need refs to expose TreePanel actions — we pass callbacks down
  const treeFitRef = useRef<(() => void) | null>(null)
  const treeExportPNGRef = useRef<(() => void) | null>(null)
  const treeToggleOrientationRef = useRef<(() => void) | null>(null)
  const versionAddRef = useRef<(() => void) | null>(null)

  useWorkbenchKeyboard({
    onAddVersion: () => versionAddRef.current?.(),
    onToggleOrientation: () => treeToggleOrientationRef.current?.(),
    onToggleRightPanel: () => setRightCollapsed(prev => !prev),
    onFitScreen: () => treeFitRef.current?.(),
    onExportPNG: () => treeExportPNGRef.current?.(),
  })

  const effectiveLeftWidth = leftCollapsed ? 0 : leftWidth
  const effectiveRightWidth = rightCollapsed ? 0 : rightWidth

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
    <div
      ref={containerRef}
      className="flex-1 flex overflow-hidden select-none"
      style={{ minHeight: 0 }}
    >
      {/* Left panel: Versions */}
      {!leftCollapsed && (
        <aside
          className="bg-white border-r border-neutral-200 flex flex-col overflow-hidden shrink-0"
          style={{ width: effectiveLeftWidth }}
        >
          <VersionPanel
            studyId={studyId}
            onVersionSaved={handleVersionSaved}
            onAddRef={versionAddRef}
          />
        </aside>
      )}

      {/* Drag handle: left-center */}
      <div
        className="w-1 bg-neutral-200 hover:bg-blue-400 cursor-col-resize shrink-0 transition-colors z-10"
        onMouseDown={onLeftHandleMouseDown}
        onDoubleClick={onLeftHandleDblClick}
        title="Drag to resize. Double-click to collapse."
      />

      {/* Center panel: Isnād tree */}
      <main className="flex flex-col overflow-hidden bg-neutral-50 flex-1 min-w-0">
        <TreePanel
          studyId={studyId}
          studyTitle={studyTitle}
          refreshKey={refreshKey}
          onFitRef={treeFitRef}
          onExportPNGRef={treeExportPNGRef}
          onToggleOrientationRef={treeToggleOrientationRef}
        />
      </main>

      {/* Drag handle: center-right */}
      <div
        className="w-1 bg-neutral-200 hover:bg-blue-400 cursor-col-resize shrink-0 transition-colors z-10"
        onMouseDown={onRightHandleMouseDown}
        onDoubleClick={onRightHandleDblClick}
        title="Drag to resize. Double-click to collapse."
      />

      {/* Right panel: Narrators | Matan tabs */}
      {!rightCollapsed && (
        <aside
          className="bg-white border-l border-neutral-200 flex flex-col overflow-hidden shrink-0"
          style={{ width: effectiveRightWidth }}
        >
          <RightPanel studyId={studyId} refreshKey={refreshKey} />
        </aside>
      )}
    </div>
    <KeyboardHint />
    </div>
  )
}
