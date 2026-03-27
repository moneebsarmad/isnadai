'use client'

import { useState } from 'react'
import ProjectCard from './ProjectCard'
import CreateProjectModal from './CreateProjectModal'

interface Project {
  id: string
  name: string
  description: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
  hadith_studies: { count: number }[]
}

interface ProjectListProps {
  initialProjects: Project[]
  userId: string
}

export default function ProjectList({ initialProjects, userId }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [showModal, setShowModal] = useState(false)

  function handleCreated(project: Project) {
    setProjects((prev) => [project, ...prev])
  }

  function handleDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  function handleArchived(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Projects</h1>
          <p className="text-neutral-500 text-sm mt-1">Organize your hadith research</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New project
        </button>
      </div>

      {/* Project grid */}
      {projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-1">No projects yet</h3>
          <p className="text-neutral-500 text-sm mb-6">Create your first project to get started.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDeleted={handleDeleted}
              onArchived={handleArchived}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateProjectModal
          userId={userId}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
