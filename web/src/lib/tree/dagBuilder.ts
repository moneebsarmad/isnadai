import { createClient } from '@/lib/supabase/client'

// Known hadith book compilers (Arabic names)
const BOOK_COMPILERS: Record<string, string> = {
  BK:  'محمد بن إسماعيل البخاري',
  SM:  'مسلم بن الحجاج',
  SAD: 'أبو داود السجستاني',
  JT:  'محمد بن عيسى الترمذي',
  SN:  'أحمد بن شعيب النسائي',
  SIM: 'محمد بن يزيد ابن ماجه',
  MA:  'أحمد بن محمد بن حنبل',
  MW:  'مالك بن أنس',
  DM:  'عبد الله بن عبد الرحمن الدارمي',
  HK:  'محمد بن عبد الله الحاكم',
  MKT: 'سليمان بن أحمد الطبراني',
  IH:  'محمد بن حبان البستي',
}

export interface TreeNode {
  id: string
  label: string
  variants: string[]
  isUnresolved: boolean
  tabaqahPosition: number
  isProphet?: boolean
  isCompiler?: boolean
}

export interface TreeEdge {
  id: string
  source: string
  target: string
  versions: {
    versionId: string
    sourceBook: string
    sourceBookCode: string
    transmissionMode: string
    transmissionStrength: string
  }[]
}

export interface TreeDAG {
  nodes: TreeNode[]
  edges: TreeEdge[]
}

export async function buildDAG(studyId: string, supabase: ReturnType<typeof createClient>): Promise<TreeDAG> {
  // 1. Fetch all narrator_mentions for this study, ordered by version and position
  const { data: mentions } = await supabase
    .from('narrator_mentions')
    .select(`
      id, position, narrator_name_original, narrator_name_normalized,
      resolved_narrator_key, transmission_mode, transmission_strength,
      version_id,
      versions!inner(id, source_book, source_book_code, source_book_author, study_id)
    `)
    .eq('versions.study_id', studyId)
    .order('version_id')
    .order('position')

  if (!mentions || mentions.length === 0) return { nodes: [], edges: [] }

  // 2. Fetch study_narrators for canonical names and variants
  const { data: studyNarrators } = await supabase
    .from('study_narrators')
    .select('narrator_key, canonical_name, name_variants')
    .eq('study_id', studyId)

  const narratorMap = new Map(studyNarrators?.map(n => [n.narrator_key, n]) ?? [])

  // 3. Group mentions by version
  const byVersion = new Map<string, typeof mentions>()
  for (const m of mentions) {
    const vid = m.version_id
    if (!byVersion.has(vid)) byVersion.set(vid, [])
    byVersion.get(vid)!.push(m)
  }

  // 4. Build nodes and edges
  const nodeMap = new Map<string, TreeNode>()
  const edgeMap = new Map<string, TreeEdge>()
  const positionSums = new Map<string, { sum: number; count: number }>()

  for (const [versionId, chain] of byVersion) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const version = (chain[0] as any).versions
    const sorted = [...chain].sort((a, b) => a.position - b.position)

    for (let i = 0; i < sorted.length; i++) {
      const mention = sorted[i]
      const nodeId = mention.resolved_narrator_key ?? `unresolved_${mention.id}`

      if (!nodeMap.has(nodeId)) {
        const isProphet = mention.resolved_narrator_key === '__prophet__'
        const narrator = mention.resolved_narrator_key && !isProphet
          ? narratorMap.get(mention.resolved_narrator_key)
          : null
        nodeMap.set(nodeId, {
          id: nodeId,
          label: isProphet ? 'النبي ﷺ' : (narrator?.canonical_name ?? mention.narrator_name_original),
          variants: narrator?.name_variants ?? [mention.narrator_name_normalized],
          isUnresolved: !mention.resolved_narrator_key,
          tabaqahPosition: mention.position,
          isProphet,
        })
      }

      // Track position for averaging
      const ps = positionSums.get(nodeId) ?? { sum: 0, count: 0 }
      ps.sum += mention.position
      ps.count++
      positionSums.set(nodeId, ps)

      // Create edge to next narrator in chain
      if (i + 1 < sorted.length) {
        const nextMention = sorted[i + 1]
        const nextNodeId = nextMention.resolved_narrator_key ?? `unresolved_${nextMention.id}`
        const edgeId = `${nodeId}__${nextNodeId}`

        if (!edgeMap.has(edgeId)) {
          edgeMap.set(edgeId, { id: edgeId, source: nodeId, target: nextNodeId, versions: [] })
        }

        edgeMap.get(edgeId)!.versions.push({
          versionId,
          sourceBook: version?.source_book ?? '',
          sourceBookCode: version?.source_book_code ?? '',
          transmissionMode: nextMention.transmission_mode ?? '',
          transmissionStrength: nextMention.transmission_strength ?? 'ambiguous',
        })
      }
    }
  }

  // 5. Average tabaqah positions
  for (const [nodeId, ps] of positionSums) {
    const node = nodeMap.get(nodeId)
    if (node) node.tabaqahPosition = ps.sum / ps.count
  }

  // 6. Inject compiler nodes for known source books (synthetic — not stored in DB)
  // Each compiler node sits "below" the earliest narrator in its version chain
  const addedCompilerEdges = new Set<string>()
  for (const [versionId, chain] of byVersion) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const version = (chain[0] as any).versions
    const bookCode: string = version?.source_book_code ?? ''
    const compilerName = BOOK_COMPILERS[bookCode] ?? (version?.source_book_author as string | null | undefined) ?? null
    if (!compilerName) continue

    const sorted = [...chain].sort((a, b) => a.position - b.position)
    const firstMention = sorted[0]
    const firstNodeId = firstMention.resolved_narrator_key ?? `unresolved_${firstMention.id}`

    const compilerNodeId = `__compiler__${bookCode}`
    if (!nodeMap.has(compilerNodeId)) {
      nodeMap.set(compilerNodeId, {
        id: compilerNodeId,
        label: compilerName,
        variants: [],
        isUnresolved: false,
        tabaqahPosition: -1,
        isCompiler: true,
      })
    }

    // Edge: compilerNodeId → firstNodeId
    // After source/target swap in layout.ts, ELK will see firstNodeId above compilerNodeId
    const compilerEdgeId = `${compilerNodeId}__${firstNodeId}`
    if (!addedCompilerEdges.has(compilerEdgeId) && !edgeMap.has(compilerEdgeId)) {
      addedCompilerEdges.add(compilerEdgeId)
      edgeMap.set(compilerEdgeId, {
        id: compilerEdgeId,
        source: compilerNodeId,
        target: firstNodeId,
        versions: [{
          versionId,
          sourceBook: version?.source_book ?? '',
          sourceBookCode: bookCode,
          transmissionMode: firstMention.transmission_mode ?? 'سماع',
          transmissionStrength: firstMention.transmission_strength ?? 'direct',
        }],
      })
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  }
}
