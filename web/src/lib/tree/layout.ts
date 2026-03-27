import type { TreeDAG, TreeNode, TreeEdge } from './dagBuilder'

export type Orientation = 'top-down' | 'rtl'

export interface PositionedNode extends TreeNode {
  x: number
  y: number
  width: number
  height: number
}

export interface PositionedEdge extends TreeEdge {
  points: Array<{ x: number; y: number }>
}

function estimateTextWidth(text: string): number {
  return Math.min(400, Math.max(150, text.length * 12))
}

export async function computeLayout(dag: TreeDAG, orientation: Orientation): Promise<{ nodes: PositionedNode[], edges: PositionedEdge[] }> {
  // Dynamic import for SSR safety
  const ELK = (await import('elkjs/lib/elk.bundled.js')).default
  const elk = new ELK()

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': orientation === 'top-down' ? 'DOWN' : 'LEFT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.spacing.nodeNode': '40',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.edgeRouting': 'SPLINES',
    },
    children: dag.nodes.map(n => ({
      id: n.id,
      width: estimateTextWidth(n.label),
      height: 50,
    })),
    // Swap source/target so Prophet (highest position) appears at top in TD layout
    edges: dag.edges.map(e => ({
      id: e.id,
      sources: [e.target],
      targets: [e.source],
    })),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layout = await elk.layout(graph as any)

  const positionedNodes: PositionedNode[] = (layout.children ?? []).map(child => {
    const node = dag.nodes.find(n => n.id === child.id)!
    return { ...node, x: child.x ?? 0, y: child.y ?? 0, width: child.width ?? 150, height: child.height ?? 50 }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const positionedEdges: PositionedEdge[] = (layout.edges ?? []).map((edge: any) => {
    const orig = dag.edges.find(e => e.id === edge.id)!
    const sections = (edge as any).sections ?? []
    const points: Array<{ x: number; y: number }> = []
    for (const section of sections) {
      if (section.startPoint) points.push(section.startPoint)
      for (const bp of section.bendPoints ?? []) points.push(bp)
      if (section.endPoint) points.push(section.endPoint)
    }
    return { ...orig, points }
  })

  return { nodes: positionedNodes, edges: positionedEdges }
}
