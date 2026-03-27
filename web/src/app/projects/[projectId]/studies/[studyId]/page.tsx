import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import WorkbenchClient from '@/components/workbench/WorkbenchClient'

interface Props {
  params: Promise<{ projectId: string; studyId: string }>
}

export default async function WorkbenchPage({ params }: Props) {
  const { projectId, studyId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [projectResult, studyResult] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('hadith_studies').select('*').eq('id', studyId).single(),
  ])

  console.log('[workbench] user:', user?.id)
  console.log('[workbench] project:', projectResult.data?.id, 'error:', projectResult.error?.message)
  console.log('[workbench] study:', studyResult.data?.id, 'error:', studyResult.error?.message)

  const project = projectResult.data
  const study = studyResult.data

  if (!project || !study) notFound()

  return (
    <div className="h-screen flex flex-col bg-neutral-50 overflow-hidden">
      <NavBar userEmail={user.email ?? ''} />

      {/* Breadcrumb bar */}
      <div className="bg-white border-b border-neutral-200 px-4 py-2.5 flex items-center gap-2 text-sm text-neutral-400 shrink-0">
        <Link href="/projects" className="hover:text-neutral-600 transition-colors">
          Projects
        </Link>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <Link href={`/projects/${projectId}`} className="hover:text-neutral-600 transition-colors">
          {project.name}
        </Link>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-neutral-700 font-medium truncate max-w-xs">{study.title}</span>
      </div>

      {/* Three-panel workbench */}
      <WorkbenchClient studyId={studyId} studyTitle={study.title} />
    </div>
  )
}
