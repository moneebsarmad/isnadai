'use client'
import { useEffect } from 'react'

interface WorkbenchKeyboardOptions {
  onAddVersion: () => void
  onToggleOrientation: () => void
  onToggleRightPanel: () => void
  onFitScreen: () => void
  onExportPNG: () => void
}

export function useWorkbenchKeyboard(opts: WorkbenchKeyboardOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'n': opts.onAddVersion(); break
        case 't': opts.onToggleOrientation(); break
        case 'm': opts.onToggleRightPanel(); break
        case 'f': opts.onFitScreen(); break
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        opts.onExportPNG()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [opts])
}
