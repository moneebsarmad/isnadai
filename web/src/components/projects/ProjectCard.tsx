'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  name: string
  description: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
  hadith_studies: { count: number }[]
}

interface ProjectCardProps {
  project: Project
  onDeleted: (id: string) => void
  onArchived: (id: string) => void
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

export default function ProjectCard({ project, onDeleted, onArchived }: ProjectCardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const studyCount = project.hadith_studies?.[0]?.count ?? 0

  async function handleRename() {
    if (editName.trim() === project.name || !editName.trim()) {
      setIsEditing(false)
      setEditName(project.name)
      return
    }
    setLoading(true)
    const { error } = await supabase
      .from('projects')
      .update({ name: editName.trim() })
      .eq('id', project.id)
    if (!error) {
      project.name = editName.trim()
    }
    setLoading(false)
    setIsEditing(false)
  }

  async function handleArchive() {
    setLoading(true)
    const { error } = await supabase
      .from('projects')
      .update({ is_archived: true })
      .eq('id', project.id)
    if (!error) onArchived(project.id)
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setLoading(true)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id)
    if (!error) onDeleted(project.id)
    setLoading(false)
  }

  return (
    <div
      className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-neutral-300 hover:shadow-sm transition-all group cursor-pointer"
      onClick={() => !isEditing && router.push(`/projects/${project.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') {
                  setIsEditing(false)
                  setEditName(project.name)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-lg font-semibold text-neutral-900 border-b-2 border-blue-500 focus:outline-none bg-transparent w-full"
            />
          ) : (
            <h3
              className="text-lg font-semibold text-neutral-900 truncate"
              onDoubleClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              title="Double-click to rename"
            >
              {project.name}
            </h3>
          )}
          {project.description && (
            <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            disabled={loading}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            title="Rename"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleArchive()
            }}
            disabled={loading}
            className="p-1.5 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Archive"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            disabled={loading}
            className={`p-1.5 rounded-lg transition-colors ${
              confirmDelete
                ? 'text-red-600 bg-red-50 hover:bg-red-100'
                : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'
            }`}
            title={confirmDelete ? 'Click again to confirm deletion' : 'Delete project'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700" onClick={(e) => e.stopPropagation()}>
          <strong>Warning:</strong> This will permanently delete the project and all its studies. Click the delete button again to confirm.
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
            className="ml-2 underline"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs text-neutral-400">
        <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-medium">
          {studyCount} {studyCount === 1 ? 'study' : 'studies'}
        </span>
        <span>Last edited {timeAgo(project.updated_at)}</span>
      </div>
    </div>
  )
}
