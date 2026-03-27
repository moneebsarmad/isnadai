'use client'
import { useState } from 'react'
import UpgradeModal from './UpgradeModal'
import { canExportSVG } from '@/lib/freemium'

interface TreeControlsProps {
  orientation: 'top-down' | 'rtl'
  onOrientationChange: (o: 'top-down' | 'rtl') => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitScreen: () => void
  onExport: (format: 'png' | 'svg') => void
  isFullscreen: boolean
  onFullscreen: () => void
}

export default function TreeControls({
  orientation,
  onOrientationChange,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  onExport,
  isFullscreen,
  onFullscreen,
}: TreeControlsProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const isPro = false // deferred Stripe integration

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-200 bg-white shrink-0">
      {/* Orientation toggle */}
      <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden">
        <button
          onClick={() => onOrientationChange('top-down')}
          title="Top-down layout"
          className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
            orientation === 'top-down'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-neutral-500 hover:bg-neutral-50'
          }`}
        >
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0-5-5m5 5 5-5" />
            </svg>
            TD
          </span>
        </button>
        <button
          onClick={() => onOrientationChange('rtl')}
          title="Right-to-left layout"
          className={`px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-neutral-200 ${
            orientation === 'rtl'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-neutral-500 hover:bg-neutral-50'
          }`}
        >
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0 5-5m-5 5 5 5" />
            </svg>
            RTL
          </span>
        </button>
      </div>

      <div className="h-4 w-px bg-neutral-200" />

      {/* Zoom controls */}
      <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden">
        <button
          onClick={onZoomOut}
          title="Zoom out"
          className="px-2.5 py-1.5 bg-white text-neutral-500 hover:bg-neutral-50 transition-colors text-sm font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        </button>
        <button
          onClick={onZoomIn}
          title="Zoom in"
          className="px-2.5 py-1.5 bg-white text-neutral-500 hover:bg-neutral-50 transition-colors border-l border-neutral-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Fit to screen */}
      <button
        onClick={onFitScreen}
        title="Fit to screen"
        className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
      </button>

      {/* Fullscreen toggle */}
      <button
        onClick={onFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 transition-colors"
      >
        {isFullscreen ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        )}
      </button>

      <div className="h-4 w-px bg-neutral-200" />

      {/* Export dropdown */}
      <div className="relative">
        <button
          onClick={() => setExportOpen(prev => !prev)}
          title="Export"
          className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {exportOpen && (
          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg border border-neutral-200 shadow-lg z-50 overflow-hidden">
            <button
              onClick={() => { onExport('png'); setExportOpen(false) }}
              className="w-full px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors text-left flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              PNG
            </button>
            <button
              onClick={() => {
                setExportOpen(false)
                if (!canExportSVG(isPro)) {
                  setShowUpgrade(true)
                } else {
                  onExport('svg')
                }
              }}
              className="w-full px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors text-left flex items-center gap-2 border-t border-neutral-100"
            >
              <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
              </svg>
              SVG
              <span className="ml-auto text-xs text-amber-500 font-medium">Pro</span>
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {exportOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setExportOpen(false)}
        />
      )}

      {/* Upgrade modal for SVG export */}
      <UpgradeModal
        open={showUpgrade}
        featureDescription="SVG export is available on the Pro plan. Upgrade for vector-quality exports of your isnād trees."
        onClose={() => setShowUpgrade(false)}
      />
    </div>
  )
}
