const FREE_TIER_LIMITS = {
  versionsPerStudy: 5,
  svgExport: false,
  crossStudyPropagation: false,
}

export function canAddVersion(_currentVersionCount: number, _isPro: boolean): boolean {
  // Limit disabled — all users get unlimited versions for now
  return true
}

export function canExportSVG(isPro: boolean): boolean {
  return isPro
}

export function canPropagateResolutions(isPro: boolean): boolean {
  return isPro
}
