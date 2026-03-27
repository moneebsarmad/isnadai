'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface NavBarProps {
  userEmail: string
}

export default function NavBar({ userEmail }: NavBarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const avatarInitial = userEmail ? userEmail[0].toUpperCase() : '?'

  return (
    <header className="px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 border-b" style={{ background: 'var(--ms-nav)', borderColor: '#4A2E1A' }}>
      {/* Logo / wordmark */}
      <Link
        href="/projects"
        className="flex items-center gap-2 group"
      >
        <span className="text-lg font-bold tracking-tight transition-opacity group-hover:opacity-80" style={{ color: 'var(--ms-gold)', fontFamily: "'Amiri', serif" }}>
          إسناد.ai
        </span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User avatar + email */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 select-none"
            style={{ background: 'var(--ms-gold)', color: 'var(--ms-nav)' }}
            aria-hidden="true"
          >
            {avatarInitial}
          </div>
          <span className="text-sm hidden sm:block max-w-[180px] truncate" style={{ color: 'var(--ms-border)' }}>
            {userEmail}
          </span>
        </div>

        <div className="h-4 w-px hidden sm:block" style={{ background: '#4A2E1A' }} />

        {/* Settings link */}
        <Link
          href="/settings"
          className="text-sm px-3 py-1.5 rounded-lg border transition-colors hidden sm:inline-flex items-center gap-1.5"
          style={{ color: 'var(--ms-border)', borderColor: '#4A2E1A' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ms-gold)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--ms-gold)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ms-border)'; (e.currentTarget as HTMLElement).style.borderColor = '#4A2E1A' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          Settings
        </Link>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-sm px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 hidden sm:inline-flex items-center gap-1.5"
          style={{ color: 'var(--ms-border)', borderColor: '#4A2E1A' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ms-gold)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--ms-gold)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ms-border)'; (e.currentTarget as HTMLElement).style.borderColor = '#4A2E1A' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>

        {/* Mobile: condensed actions */}
        <div className="flex sm:hidden items-center gap-1.5">
          <Link
            href="/settings"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ms-border)' }}
            aria-label="Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </Link>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ color: 'var(--ms-border)' }}
            aria-label="Sign out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
