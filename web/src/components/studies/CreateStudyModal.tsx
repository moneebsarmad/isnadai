'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Study {
  id: string
  project_id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
  versions: { count: number }[]
}

interface CreateStudyModalProps {
  projectId: string
  onClose: () => void
  onCreated: (study: Study) => void
}

export default function CreateStudyModal({ projectId, onClose, onCreated }: CreateStudyModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Study title is required.')
      return
    }
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('hadith_studies')
      .insert({ title: title.trim(), description: description.trim() || null, project_id: projectId })
      .select('*, versions(count)')
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    onCreated(data)
    onClose()
    router.push(`/projects/${projectId}/studies/${data.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-neutral-900">New study</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="study-title" className="block text-sm font-medium text-neutral-700 mb-1">
              Study title <span className="text-red-500">*</span>
            </label>
            <input
              ref={titleRef}
              id="study-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="e.g., Hadith of Jibreel — Six versions"
            />
          </div>

          <div>
            <label htmlFor="study-description" className="block text-sm font-medium text-neutral-700 mb-1">
              Description <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="study-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              placeholder="Brief description of this study..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors"
            >
              {loading ? 'Creating...' : 'Create study'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
