'use client'

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl'

const SHORTCUTS: { key: string; label: string }[] = [
  { key: 'n', label: 'add version' },
  { key: 't', label: 'toggle orientation' },
  { key: 'f', label: 'fit screen' },
  { key: `${mod}E`, label: 'export PNG' },
]

export default function KeyboardHint() {
  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-1.5 border-t overflow-x-auto select-none text-xs" style={{ background: 'var(--ms-parchment-deep)', borderColor: 'var(--ms-border-light)', color: 'var(--ms-ink-muted)' }}>
      {SHORTCUTS.map(({ key, label }) => (
        <span key={key} className="flex items-center gap-1 whitespace-nowrap">
          <kbd className="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 rounded font-mono text-[10px] leading-none" style={{ background: 'var(--ms-parchment-card)', border: '1px solid var(--ms-border)', color: 'var(--ms-ink-mid)' }}>
            {key}
          </kbd>
          <span>{label}</span>
        </span>
      ))}
    </div>
  )
}
