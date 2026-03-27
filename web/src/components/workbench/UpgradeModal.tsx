'use client'

interface UpgradeModalProps {
  open: boolean
  featureDescription: string
  onClose: () => void
}

export default function UpgradeModal({ open, featureDescription, onClose }: UpgradeModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mx-auto">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-base font-semibold text-neutral-900">
            You&apos;ve reached the free tier limit
          </h3>
          <p className="text-sm text-neutral-500 mt-1">
            {featureDescription}
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2">
          <a
            href="mailto:info@isnad.ai?subject=isnad.ai Pro Waitlist"
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors text-center"
          >
            Join the waitlist
          </a>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
