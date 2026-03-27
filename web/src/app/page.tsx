import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/projects')

  return (
    <main className="min-h-screen" style={{ background: 'var(--ms-parchment)', color: 'var(--ms-ink)' }}>
      {/* Nav */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto border-b" style={{ borderColor: 'var(--ms-border-light)' }}>
        <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Amiri', serif", color: 'var(--ms-ink)' }}>إسناد.ai</span>
        <Link
          href="/auth/login"
          className="text-sm transition-colors"
          style={{ color: 'var(--ms-ink-mid)' }}
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-6xl font-bold tracking-tight mb-4" style={{ fontFamily: "'Amiri', serif", color: 'var(--ms-ink)' }}>
          إسناد.ai
        </h1>
        <p className="text-2xl font-medium mb-6" style={{ color: 'var(--ms-ink-mid)' }}>
          Visual Ḥadīth Research Workbench
        </p>
        <p className="text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--ms-ink-muted)' }}>
          Parse, compare, and visualize chains of transmission across multiple riwāyāt.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl text-base transition-colors shadow-sm"
            style={{ background: 'var(--ms-gold)' }}
            onMouseEnter={undefined}
          >
            Get Started — Free
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 font-medium text-base transition-colors"
            style={{ color: 'var(--ms-ink-mid)' }}
          >
            Sign in →
          </Link>
        </div>

        {/* Arabic sample */}
        <div
          className="mt-14 mx-auto max-w-2xl rounded-2xl border px-6 py-5"
          style={{ background: 'var(--ms-parchment-card)', borderColor: 'var(--ms-border)', boxShadow: '0 1px 4px rgba(44,26,14,0.08)' }}
          dir="rtl"
        >
          <p
            className="text-xl leading-loose"
            style={{ fontFamily: 'var(--font-amiri), Amiri, serif', color: 'var(--ms-ink-mid)' }}
          >
            حَدَّثَنَا عَبْدُ اللَّهِ بْنُ يُوسُفَ، قَالَ: أَخْبَرَنَا مَالِكٌ، عَنِ ابْنِ شِهَابٍ، عَنْ مُحَمَّدِ بْنِ جُبَيْرِ بْنِ مُطْعِمٍ
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10" style={{ color: 'var(--ms-ink)' }}>
          Everything you need for isnād research
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Smart Parsing',
              desc: 'Paste a ḥadīth text and get instant isnād / matan separation with narrator identification and boundary detection.',
              path: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
            },
            {
              title: 'Interactive Trees',
              desc: 'Visual DAG with automatic narrator merging across riwāyāt. Zoom, pan, and export your isnād trees.',
              path: 'M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6',
            },
            {
              title: 'Matan Comparison',
              desc: 'Side-by-side variant wording analysis across multiple transmissions. Highlight textual differences at a glance.',
              path: 'M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z',
            },
          ].map(({ title, desc, path }) => (
            <div key={title} className="rounded-2xl border p-6" style={{ background: 'var(--ms-parchment-card)', borderColor: 'var(--ms-border)', boxShadow: '0 1px 3px rgba(44,26,14,0.07)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--ms-gold-light)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--ms-gold)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--ms-ink)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ms-ink-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-3" style={{ color: 'var(--ms-ink)' }}>
          Pricing
        </h2>
        <p className="text-center mb-10" style={{ color: 'var(--ms-ink-muted)' }}>
          Start free. Upgrade when you need more.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-2xl border p-8" style={{ background: 'var(--ms-parchment-card)', borderColor: 'var(--ms-border)' }}>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold" style={{ color: 'var(--ms-ink)' }}>Free</span>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--ms-ink-muted)' }}>Everything you need to get started</p>
            <ul className="space-y-3 mb-8">
              {['5 versions per study', 'PNG export', 'Basic narrator registry', 'Unlimited projects & studies', 'Interactive isnād tree'].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm" style={{ color: 'var(--ms-ink-mid)' }}>
                  <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--ms-gold)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/login"
              className="block w-full text-center px-4 py-2.5 text-white font-semibold rounded-xl text-sm transition-colors"
              style={{ background: 'var(--ms-gold)' }}
            >
              Get Started — Free
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border p-8 relative overflow-hidden" style={{ background: 'var(--ms-nav)', borderColor: '#4A2E1A' }}>
            <div className="absolute top-4 right-4 px-2.5 py-1 text-xs font-bold rounded-full" style={{ background: 'var(--ms-gold)', color: 'var(--ms-nav)' }}>
              Coming soon
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold" style={{ color: 'var(--ms-parchment)' }}>Pro</span>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--ms-border)' }}>For serious researchers</p>
            <ul className="space-y-3 mb-8">
              {['Unlimited versions per study', 'SVG export (vector quality)', 'Cross-study chain propagation', 'Priority support', 'Everything in Free'].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm" style={{ color: 'var(--ms-border-light)' }}>
                  <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--ms-gold)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="mailto:contact@isnad.ai?subject=Pro%20Waitlist"
              className="block w-full text-center px-4 py-2.5 font-semibold rounded-xl text-sm transition-colors"
              style={{ background: 'var(--ms-gold)', color: 'var(--ms-nav)' }}
            >
              Pro — Join the Waitlist
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center" style={{ borderColor: 'var(--ms-border-light)' }}>
        <p className="text-sm" style={{ color: 'var(--ms-ink-muted)' }}>
          Built for the ummah. Feedback:{' '}
          <a href="mailto:contact@isnad.ai" className="transition-colors hover:underline" style={{ color: 'var(--ms-gold)' }}>
            contact@isnad.ai
          </a>
        </p>
      </footer>
    </main>
  )
}
