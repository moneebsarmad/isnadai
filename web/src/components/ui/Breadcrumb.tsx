import Link from 'next/link'

export interface BreadcrumbSegment {
  label: string
  href?: string
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[]
}

export default function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-neutral-400"
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <svg
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            )}
            {isLast || !segment.href ? (
              <span
                className={isLast ? 'text-neutral-700 font-medium truncate max-w-[200px]' : 'text-neutral-400'}
              >
                {segment.label}
              </span>
            ) : (
              <Link
                href={segment.href}
                className="hover:text-neutral-600 transition-colors truncate max-w-[160px]"
              >
                {segment.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
