import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import StudyList from '@/components/studies/StudyList'

interface Props {
  params: Promise<{ projectId: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) notFound()

  const { data: studies, error: studiesError } = await supabase
    .from('hadith_studies')
    .select('*, versions(count)')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })

  if (studiesError) {
    console.error('Error fetching studies:', studiesError)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar userEmail={user.email ?? ''} />
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
          <Link href="/projects" className="hover:text-neutral-600 transition-colors">
            Projects
          </Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-neutral-700 font-medium">{project.name}</span>
        </nav>

        <StudyList
          initialStudies={studies ?? []}
          project={project}
        />
      </main>
    </div>
  )
}
