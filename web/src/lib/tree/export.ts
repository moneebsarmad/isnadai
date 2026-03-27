export async function exportAsPNG(svgEl: SVGSVGElement, title: string): Promise<void> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  // Inline computed styles
  inlineStyles(clone)
  // Add Amiri font
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = "@import url('https://fonts.googleapis.com/css2?family=Amiri&display=swap');"
  clone.insertBefore(style, clone.firstChild)

  const svgString = new XMLSerializer().serializeToString(clone)
  const img = new Image()
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  img.src = url

  await new Promise(resolve => { img.onload = resolve })

  const canvas = document.createElement('canvas')
  const rect = svgEl.getBoundingClientRect()
  canvas.width = rect.width * 2
  canvas.height = rect.height * 2
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, rect.width, rect.height)
  ctx.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)

  canvas.toBlob(b => {
    if (!b) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = `${title}-isnad.png`
    a.click()
  })
}

export async function exportAsSVG(svgEl: SVGSVGElement, title: string): Promise<void> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  inlineStyles(clone)
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = "@import url('https://fonts.googleapis.com/css2?family=Amiri&display=swap');"
  clone.insertBefore(style, clone.firstChild)

  const svgString = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${title}-isnad.svg`
  a.click()
}

function inlineStyles(el: Element): void {
  if (el instanceof HTMLElement || el instanceof SVGElement) {
    const computed = window.getComputedStyle(el)
    const relevant = ['font-family', 'font-size', 'fill', 'stroke', 'stroke-width', 'direction']
    relevant.forEach(prop => {
      const val = computed.getPropertyValue(prop)
      if (val) el.style.setProperty(prop, val)
    })
  }
  for (const child of Array.from(el.children)) inlineStyles(child)
}
