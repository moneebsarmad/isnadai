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
      <div className="shrink-0 border-b border-neutral-200 bg-neutral-50">
        <div className="flex">
          <button
            onClick={() => setActiveTab('narrators')}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'narrators'
                ? 'text-blue-600 border-blue-600 bg-white'
                : 'text-neutral-500 border-transparent hover:text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            Narrators
          </button>
          <button
            onClick={() => setActiveTab('matan')}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'matan'
                ? 'text-blue-600 border-blue-600 bg-white'
                : 'text-neutral-500 border-transparent hover:text-neutral-700 hover:bg-neutral-100'
            }`}
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
