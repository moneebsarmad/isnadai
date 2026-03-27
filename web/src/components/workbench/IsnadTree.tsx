'use client'
import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import * as d3 from 'd3'
import type { PositionedNode, PositionedEdge } from '@/lib/tree/layout'

export interface IsnadTreeRef {
  fitToScreen: () => void
  zoomBy: (factor: number) => void
  getSVGElement: () => SVGSVGElement | null
}

interface IsnadTreeProps {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  sourceBookColors: Map<string, string>
  onNodeClick?: (node: PositionedNode) => void
  selectedNodeId?: string | null
  activeBooks?: Set<string>
}

export const IsnadTree = forwardRef<IsnadTreeRef, IsnadTreeProps>(function IsnadTree(
  { nodes, edges, sourceBookColors, onNodeClick, selectedNodeId, activeBooks },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  useImperativeHandle(ref, () => ({
    fitToScreen() {
      if (!svgRef.current || !zoomRef.current) return
      const svg = d3.select(svgRef.current)
      const bounds = svgRef.current.getBoundingClientRect()
      const padding = 40
      if (nodes.length === 0) return
      const minX = Math.min(...nodes.map(n => n.x))
      const minY = Math.min(...nodes.map(n => n.y))
      const maxX = Math.max(...nodes.map(n => n.x + n.width))
      const maxY = Math.max(...nodes.map(n => n.y + n.height))
      const contentW = maxX - minX
      const contentH = maxY - minY
      const scale = Math.min(
        (bounds.width - padding * 2) / contentW,
        (bounds.height - padding * 2) / contentH,
        4
      )
      const tx = (bounds.width - contentW * scale) / 2 - minX * scale
      const ty = (bounds.height - contentH * scale) / 2 - minY * scale
      svg.transition().duration(500).call(
        zoomRef.current!.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      )
    },
    zoomBy(factor: number) {
      if (!svgRef.current || !zoomRef.current) return
      d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, factor)
    },
    getSVGElement() { return svgRef.current },
  }))

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const g = svg.append('g').attr('class', 'tree-root')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)
    zoomRef.current = zoom

    if (nodes.length === 0) {
      svg.append('text')
        .attr('x', '50%').attr('y', '50%')
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', '#9CA3AF').attr('font-size', '14px')
        .text('Add versions to see the isnād tree')
      return
    }

    // Build adjacency for path highlighting
    const nodeEdges = new Map<string, string[]>() // nodeId -> edge ids
    for (const edge of edges) {
      if (!nodeEdges.has(edge.source)) nodeEdges.set(edge.source, [])
      if (!nodeEdges.has(edge.target)) nodeEdges.set(edge.target, [])
      nodeEdges.get(edge.source)!.push(edge.id)
      nodeEdges.get(edge.target)!.push(edge.id)
    }

    const isFiltering = activeBooks != null && activeBooks.size > 0

    // Draw edges
    g.selectAll('.edge')
      .data(edges)
      .join('g')
      .attr('class', d => `edge edge-${d.id.replace(/[^a-zA-Z0-9]/g, '_')}`)

    const lineFn = d3.line<{ x: number; y: number }>().x(d => d.x).y(d => d.y).curve(d3.curveCatmullRom)

    for (const edge of edges) {
      const sel = g.select(`.edge-${edge.id.replace(/[^a-zA-Z0-9]/g, '_')}`)
      const isDashed = edge.versions.some(v => v.transmissionStrength === 'ambiguous')
      const points = edge.points
      if (points.length < 2) continue

      const mid = points[Math.floor(points.length / 2)]

      if (isFiltering) {
        // ── Filter mode ─────────────────────────────────────────────────────
        const matching = edge.versions.filter(v => activeBooks!.has(v.sourceBookCode))
        if (matching.length > 0) {
          matching.forEach((v, i) => {
            const color = sourceBookColors.get(v.sourceBookCode) ?? '#6B7280'
            const offset = (i - (matching.length - 1) / 2) * 3
            const offsetPts = points.map(p => ({ x: p.x + offset, y: p.y + offset }))
            sel.append('path')
              .attr('d', lineFn(offsetPts) ?? '')
              .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2)
              .attr('stroke-dasharray', isDashed ? '6,3' : 'none')
              .attr('opacity', 1).attr('data-edge-id', edge.id)
          })
          // Transmission mode label
          if (matching[0]?.transmissionMode) {
            sel.append('text')
              .attr('x', mid.x).attr('y', mid.y - 6)
              .attr('text-anchor', 'middle').attr('font-size', '10px')
              .attr('fill', '#6B7280').attr('direction', 'rtl')
              .text(matching[0].transmissionMode)
          }
        } else {
          // Non-matching: single ghost line
          sel.append('path')
            .attr('d', lineFn(points) ?? '')
            .attr('fill', 'none').attr('stroke', '#CBD5E1')
            .attr('stroke-width', 1).attr('opacity', 0.18)
            .attr('data-edge-id', edge.id)
        }
      } else {
        // ── Default bundled mode ─────────────────────────────────────────────
        if (edge.versions.length === 1) {
          const color = sourceBookColors.get(edge.versions[0].sourceBookCode) ?? '#6B7280'
          sel.append('path')
            .attr('d', lineFn(points) ?? '')
            .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2)
            .attr('stroke-dasharray', isDashed ? '6,3' : 'none')
            .attr('opacity', 0.8).attr('data-edge-id', edge.id)
          // Transmission mode label
          if (edge.versions[0].transmissionMode) {
            sel.append('text')
              .attr('x', mid.x).attr('y', mid.y - 6)
              .attr('text-anchor', 'middle').attr('font-size', '10px')
              .attr('fill', '#6B7280').attr('direction', 'rtl')
              .text(edge.versions[0].transmissionMode)
          }
        } else {
          // Multi-version: single neutral bundle line + color dot cluster
          sel.append('path')
            .attr('d', lineFn(points) ?? '')
            .attr('fill', 'none').attr('stroke', '#94A3B8')
            .attr('stroke-width', 2.5)
            .attr('stroke-dasharray', isDashed ? '6,3' : 'none')
            .attr('opacity', 0.65).attr('data-edge-id', edge.id)

          // Unique-color dot cluster at midpoint
          const uniqueColors = [...new Set(edge.versions.map(v => sourceBookColors.get(v.sourceBookCode) ?? '#6B7280'))]
          const dotR = 3.5
          const gap = 9
          const totalW = (uniqueColors.length - 1) * gap
          uniqueColors.forEach((color, i) => {
            sel.append('circle')
              .attr('cx', mid.x - totalW / 2 + i * gap)
              .attr('cy', mid.y - 10)
              .attr('r', dotR).attr('fill', color).attr('opacity', 0.9)
              .attr('data-edge-id', edge.id)
          })

          // Count badge when more than 3 versions
          if (edge.versions.length > 3) {
            sel.append('text')
              .attr('x', mid.x - totalW / 2 + uniqueColors.length * gap + 2)
              .attr('y', mid.y - 6)
              .attr('font-size', '9px').attr('fill', '#64748B')
              .text(`×${edge.versions.length}`)
          }
        }
      }
    }

    // Draw nodes
    const nodeGroups = g.selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'grab')

    nodeGroups.append('rect')
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('rx', 8)
      .attr('fill', d => {
        if (d.isProphet) return '#FEF3C7'      // amber-100 — Prophet ﷺ
        if (d.isCompiler) return '#EFF6FF'     // blue-50 — compiler
        if (d.isUnresolved) return '#F9FAFB'   // gray-50 — unresolved
        return '#FFFFFF'
      })
      .attr('stroke', d => {
        if (d.isProphet) return '#D97706'      // amber-600
        if (d.isCompiler) return '#2563EB'     // blue-600
        if (d.isUnresolved) return '#9CA3AF'   // gray-400
        return '#374151'
      })
      .attr('stroke-dasharray', d => d.isUnresolved ? '5,5' : 'none')
      .attr('stroke-width', d => d.isProphet ? 2 : 1.5)
      .attr('filter', 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.08))')

    nodeGroups.append('text')
      .attr('x', d => d.width / 2)
      .attr('y', d => d.height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('direction', 'rtl')
      .attr('font-family', "'Amiri', serif")
      .attr('font-size', d => d.isProphet ? '15px' : '14px')
      .attr('font-weight', d => d.isProphet ? '700' : '400')
      .attr('fill', d => d.isProphet ? '#92400E' : d.isCompiler ? '#1D4ED8' : '#111827')
      .text(d => d.label)

    // ── Drag behaviour ─────────────────────────────────────────────────────────
    // Keep a mutable copy of node positions so drag doesn't force a React re-render
    const dragPos = new Map<string, { x: number; y: number }>()
    const nodeDims = new Map<string, { width: number; height: number }>()
    nodes.forEach(n => {
      dragPos.set(n.id, { x: n.x, y: n.y })
      nodeDims.set(n.id, { width: n.width, height: n.height })
    })

    function redrawEdgesForNode(movedId: string) {
      for (const edge of edges) {
        if (edge.source !== movedId && edge.target !== movedId) continue
        const sd = nodeDims.get(edge.source) ?? { width: 80, height: 40 }
        const td = nodeDims.get(edge.target) ?? { width: 80, height: 40 }
        const sp = dragPos.get(edge.source) ?? { x: 0, y: 0 }
        const tp = dragPos.get(edge.target) ?? { x: 0, y: 0 }
        const sx = sp.x + sd.width / 2
        const sy = sp.y + sd.height / 2
        const tx = tp.x + td.width / 2
        const ty = tp.y + td.height / 2
        const vCount = edge.versions.length
        const edgeSel = g.select(`.edge-${edge.id.replace(/[^a-zA-Z0-9]/g, '_')}`)
        edgeSel.selectAll('path').each(function(_, i) {
          const off = (i - (vCount - 1) / 2) * 3
          d3.select(this as SVGPathElement).attr('d',
            `M${sx + off},${sy + off} L${tx + off},${ty + off}`
          )
        })
        edgeSel.select('text')
          .attr('x', (sx + tx) / 2)
          .attr('y', (sy + ty) / 2 - 6)
      }
    }

    const dragBehavior = d3.drag<SVGGElement, PositionedNode>()
      .on('start', function(event) {
        // Stop propagation so the canvas pan doesn't activate while dragging a node
        event.sourceEvent.stopPropagation()
        d3.select(this).raise().style('cursor', 'grabbing')
      })
      .on('drag', function(event, d) {
        const pos = dragPos.get(d.id)!
        pos.x += event.dx
        pos.y += event.dy
        d3.select(this).attr('transform', `translate(${pos.x}, ${pos.y})`)
        redrawEdgesForNode(d.id)
      })
      .on('end', function() {
        d3.select(this).style('cursor', 'grab')
      })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeGroups.call(dragBehavior as any)

    // Hover interactions
    nodeGroups
      .on('mouseenter', (_event, d) => {
        const connectedEdges = nodeEdges.get(d.id) ?? []
        g.selectAll('[data-edge-id]').attr('opacity', function() {
          const edgeId = (this as Element).getAttribute('data-edge-id')
          return connectedEdges.includes(edgeId ?? '') ? 1 : 0.15
        })
      })
      .on('mouseleave', () => {
        g.selectAll('[data-edge-id]').attr('opacity', 0.8)
      })
      .on('click', (_event, d) => onNodeClick?.(d))

  }, [nodes, edges, sourceBookColors, onNodeClick, activeBooks])

  // Highlight the selected node without triggering a full re-render
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll<SVGGElement, PositionedNode>('.node rect').each(function(d) {
      const isSelected = d.id === selectedNodeId
      d3.select(this)
        .attr('stroke-width', isSelected ? 2.5 : (d.isProphet ? 2 : 1.5))
        .attr('filter', isSelected
          ? 'drop-shadow(0 0 6px rgb(59 130 246 / 0.6))'
          : 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.08))')
    })
  }, [selectedNodeId])

  return <svg ref={svgRef} className="w-full h-full" />
})
