import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectList from '@/components/projects/ProjectList'
import NavBar from '@/components/NavBar'
import OnboardingModal from '@/components/onboarding/OnboardingModal'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*, hadith_studies(count)')
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
  }

  const hasNoProjects = (projects ?? []).length === 0

  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar userEmail={user.email ?? ''} />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <ProjectList initialProjects={projects ?? []} userId={user.id} />
      </main>
      {hasNoProjects && (
        <OnboardingModal userId={user.id} />
      )}
    </div>
  )
}
