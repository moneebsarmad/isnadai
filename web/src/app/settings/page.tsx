import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'
import SourceBookColorSettings from '@/components/settings/SourceBookColorSettings'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: bookColors } = await supabase
    .from('source_book_colors')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar userEmail={user.email ?? ''} />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-neutral-900 mb-8">Settings</h1>
        <SourceBookColorSettings initialColors={bookColors ?? []} />
      </main>
    </div>
  )
}
