'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CreateStudyModal from './CreateStudyModal'

interface Study {
  id: string
  project_id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
  versions: { count: number }[]
}

interface Project {
  id: string
  name: string
  description: string | null
}

interface StudyListProps {
  initialStudies: Study[]
  project: Project
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

export default function StudyList({ initialStudies, project }: StudyListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [studies, setStudies] = useState<Study[]>(initialStudies)
  const [showModal, setShowModal] = useState(false)

  function handleCreated(study: Study) {
    setStudies((prev) => [study, ...prev])
  }

  async function handleDelete(studyId: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this study? This will permanently delete all versions and analysis data.'
    )
    if (!confirmed) return

    const { error } = await supabase
      .from('hadith_studies')
      .delete()
      .eq('id', studyId)

    if (!error) {
      setStudies((prev) => prev.filter((s) => s.id !== studyId))
    }
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{project.name}</h1>
          {project.description && (
            <p className="text-neutral-500 text-sm mt-1">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New study
        </button>
      </div>

      {/* Studies */}
      {studies.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-1">No studies yet</h3>
          <p className="text-neutral-500 text-sm mb-6">Create your first study to begin analyzing hadith chains.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New study
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {studies.map((study) => {
            const versionCount = study.versions?.[0]?.count ?? 0
            return (
              <div
                key={study.id}
                onClick={() => router.push(`/projects/${project.id}/studies/${study.id}`)}
                className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-neutral-300 hover:shadow-sm transition-all group cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-neutral-900 truncate">{study.title}</h3>
                  {study.description && (
                    <p className="text-sm text-neutral-500 mt-0.5 truncate">{study.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                    <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-medium">
                      {versionCount} {versionCount === 1 ? 'version' : 'versions'}
                    </span>
                    <span>Last edited {timeAgo(study.updated_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(study.id) }}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete study"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                  <svg className="w-5 h-5 text-neutral-300 group-hover:text-neutral-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <CreateStudyModal
          projectId={project.id}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
