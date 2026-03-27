'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 1 | 2 | 3 | 4

interface OnboardingModalProps {
  userId: string
  onOpenAddVersion?: () => void
}

export default function OnboardingModal({ userId, onOpenAddVersion }: OnboardingModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [projectName, setProjectName] = useState('')
  const [studyTitle, setStudyTitle] = useState('')
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [createdStudyId, setCreatedStudyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const done = localStorage.getItem('onboarding_complete')
      if (!done) setVisible(true)
    } catch {
      // localStorage not available (SSR guard)
    }
  }, [])

  useEffect(() => {
    if (visible && (step === 2 || step === 3)) {
      // Small delay for modal animation
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [visible, step])

  function dismiss() {
    try {
      localStorage.setItem('onboarding_complete', 'true')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  async function handleStep2() {
    if (!projectName.trim()) return
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('projects')
      .insert({ name: projectName.trim(), user_id: userId })
      .select('id')
      .single()

    setLoading(false)
    if (err || !data) {
      setError(err?.message ?? 'Failed to create project.')
      return
    }
    setCreatedProjectId(data.id)
    setStep(3)
  }

  async function handleStep3() {
    if (!studyTitle.trim() || !createdProjectId) return
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('hadith_studies')
      .insert({ title: studyTitle.trim(), project_id: createdProjectId })
      .select('id')
      .single()

    setLoading(false)
    if (err || !data) {
      setError(err?.message ?? 'Failed to create study.')
      return
    }
    setCreatedStudyId(data.id)
    setStep(4)
  }

  function handleStep4() {
    dismiss()
    if (createdProjectId && createdStudyId) {
      router.push(`/projects/${createdProjectId}/studies/${createdStudyId}`)
      // The workbench page will handle the AddVersionModal trigger
      onOpenAddVersion?.()
    }
  }

  if (!visible) return null

  const totalSteps = 4

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative">
        {/* Step indicators */}
        <div className="flex items-center gap-1.5 mb-6">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-blue-600' : 'bg-neutral-200'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Welcome to isnad.ai</h2>
            <p className="text-neutral-500 text-sm leading-relaxed mb-8">
              Your visual ḥadīth research workbench. Parse isnāds, build DAG trees, and compare matan variants — all in one place.
              <br /><br />
              Let&rsquo;s set up your first project in a few quick steps.
            </p>
            <div className="flex gap-3">
              <button
                onClick={dismiss}
                className="flex-1 py-2 px-4 text-neutral-500 hover:text-neutral-700 text-sm font-medium transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Let&rsquo;s get started →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Name your project</h2>
            <p className="text-neutral-500 text-sm mb-5">
              A project groups related ḥadīth studies together.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="onboarding-project-name" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Project name
              </label>
              <input
                ref={inputRef}
                id="onboarding-project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && projectName.trim() && handleStep2()}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="e.g., Hadith of Jibreel"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={dismiss}
                className="py-2 px-4 text-neutral-500 hover:text-neutral-700 text-sm font-medium transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleStep2}
                disabled={loading || !projectName.trim()}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {loading ? 'Creating…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Create your first study</h2>
            <p className="text-neutral-500 text-sm mb-5">
              A study holds multiple riwāyāt of the same ḥadīth for comparison.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="onboarding-study-title" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Study title
              </label>
              <input
                ref={inputRef}
                id="onboarding-study-title"
                type="text"
                value={studyTitle}
                onChange={(e) => setStudyTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && studyTitle.trim() && handleStep3()}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="e.g., Hadith of Jibreel — Six versions"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={dismiss}
                className="py-2 px-4 text-neutral-500 hover:text-neutral-700 text-sm font-medium transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleStep3}
                disabled={loading || !studyTitle.trim()}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {loading ? 'Creating…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">You&rsquo;re all set!</h2>
            <p className="text-neutral-500 text-sm leading-relaxed mb-8">
              Your project and study are ready. Now paste your first ḥadīth to begin parsing the isnād.
            </p>
            <div className="flex gap-3">
              <button
                onClick={dismiss}
                className="py-2 px-4 text-neutral-500 hover:text-neutral-700 text-sm font-medium transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleStep4}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Paste your first ḥadīth →
              </button>
            </div>
          </div>
        )}

        {/* Step counter */}
        <p className="text-xs text-neutral-400 text-center mt-5">
          Step {step} of {totalSteps}
        </p>
      </div>
    </div>
  )
}
