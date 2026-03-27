'use client'

import { useState } from 'react'
import NarratorRegistryPanel from './NarratorRegistryPanel'
import MatanComparisonPanel from './MatanComparisonPanel'

type Tab = 'narrators' | 'matan'

interface Props {
  studyId: string
  refreshKey?: number
}

export default function RightPanel({ studyId, refreshKey = 0 }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('narrators')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab header */}
      <div className="shrink-0 border-b" style={{ borderColor: 'var(--ms-border)', background: 'var(--ms-parchment-deep)' }}>
        <div className="flex">
          <button
            onClick={() => setActiveTab('narrators')}
            className="flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2"
            style={{
              color: activeTab === 'narrators' ? 'var(--ms-gold)' : 'var(--ms-ink-muted)',
              borderColor: activeTab === 'narrators' ? 'var(--ms-gold)' : 'transparent',
              background: activeTab === 'narrators' ? 'var(--ms-parchment-card)' : 'transparent',
            }}
          >
            Narrators
          </button>
          <button
            onClick={() => setActiveTab('matan')}
            className="flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2"
            style={{
              color: activeTab === 'matan' ? 'var(--ms-gold)' : 'var(--ms-ink-muted)',
              borderColor: activeTab === 'matan' ? 'var(--ms-gold)' : 'transparent',
              background: activeTab === 'matan' ? 'var(--ms-parchment-card)' : 'transparent',
            }}
          >
            Matan
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'narrators' && (
          <NarratorRegistryPanel studyId={studyId} />
        )}
        {activeTab === 'matan' && (
          <MatanComparisonPanel studyId={studyId} refreshKey={refreshKey} />
        )}
      </div>
    </div>
  )
}
