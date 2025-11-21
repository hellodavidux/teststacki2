import type { ReactNode } from 'react'

export interface NodeItem {
  id: string
  name: string
  icon?: ReactNode
  category: 'Popular' | 'Tools' | 'Apps' | 'Flow'
  section?: string
  keywords?: string[]
  jsonCategory?: string // The parent category from JSON (e.g., "StackAI", "Knowledge Base", "Apps", "Flow")
  isSubaction?: boolean // If true, only show in search results, not by default
}

/**
 * Scores how well a node matches the search query (higher = better match)
 */
export function scoreNodeMatch(node: NodeItem, query: string): number {
  if (!query.trim()) return 0
  
  const lowerQuery = query.toLowerCase().trim()
  const lowerName = node.name.toLowerCase()
  let score = 0
  
  // Exact name match gets highest score
  if (lowerName === lowerQuery) {
    score += 1000
  } else if (lowerName.startsWith(lowerQuery)) {
    score += 500
  } else if (lowerName.includes(lowerQuery)) {
    score += 200
  }
  
  // Check keywords
  if (node.keywords && node.keywords.length > 0) {
    const lowerKeywords = node.keywords.map(k => k.toLowerCase())
    const queryWords = lowerQuery.split(/\s+/)
    
    // Exact keyword match
    if (lowerKeywords.includes(lowerQuery)) {
      score += 800
    }
    
    // Keyword starts with query
    if (lowerKeywords.some(keyword => keyword.startsWith(lowerQuery))) {
      score += 400
    }
    
    // Keyword contains full query
    if (lowerKeywords.some(keyword => keyword.includes(lowerQuery))) {
      score += 300
    }
    
    // All query words match keywords
    const allWordsMatch = queryWords.every(word => {
      if (word.length <= 2) {
        return lowerKeywords.some(keyword => keyword === word || keyword.startsWith(word))
      }
      return lowerKeywords.some(keyword => keyword.includes(word))
    })
    if (allWordsMatch && queryWords.length > 0) {
      score += 250
    }
    
    // Some query words match
    const someWordsMatch = queryWords.some(word => 
      lowerKeywords.some(keyword => keyword.includes(word) || keyword.startsWith(word))
    )
    if (someWordsMatch) {
      score += 100
    }
  }
  
  return score
}

/**
 * Checks if a node matches the search query by searching through:
 * - Node name
 * - Keywords (if available)
 * - Semantic/related matches
 */
export function matchesSearchQuery(node: NodeItem, query: string): boolean {
  if (!query.trim()) return true
  
  const lowerQuery = query.toLowerCase().trim()
  const lowerName = node.name.toLowerCase()
  const queryWords = lowerQuery.split(/\s+/)
  
  // Direct name match (exact or contains)
  if (lowerName.includes(lowerQuery)) return true
  
  // Keywords match - be more strict
  if (node.keywords && node.keywords.length > 0) {
    const lowerKeywords = node.keywords.map(k => k.toLowerCase())
    
    // Check if any keyword contains the full query (exact match in keyword)
    if (lowerKeywords.some(keyword => keyword.includes(lowerQuery))) return true
    
    // For multi-word queries, require ALL words to match (stricter)
    if (queryWords.length > 1) {
      const allWordsMatch = queryWords.every(word => {
        // Skip very short words (1-2 chars) unless they match exactly
        if (word.length <= 2) {
          return lowerKeywords.some(keyword => keyword === word || keyword.startsWith(word))
        }
        // Check if keyword contains word OR word contains keyword (handles plurals)
        return lowerKeywords.some(keyword => keyword.includes(word) || word.includes(keyword))
      })
      if (allWordsMatch) return true
    } else {
      // For single-word queries, be very strict
      const word = queryWords[0]
      if (word.length >= 3) {
        // Only match if:
        // 1. Keyword exactly equals the word
        // 2. Keyword starts with the word (for partial typing like "gmai" -> "gmail")
        // 3. Word is at the start of keyword (e.g., "gmail" matches "gmail" keyword)
        // But NOT if word is just a substring in the middle (e.g., "mail" should NOT match "gmail" keyword)
        if (lowerKeywords.some(keyword => 
          keyword === word || 
          keyword.startsWith(word) ||
          word.startsWith(keyword) // For exact product names
        )) {
          return true
        }
      }
    }
  }
  
  // Semantic/related matches - only for general queries, not specific app names
  // Skip semantic matching if query looks like a specific app/product name (single word, capitalized, or common app name)
  const isSpecificAppName = queryWords.length === 1 && (
    lowerQuery.length >= 4 || 
    ['gmail', 'outlook', 'slack', 'notion', 'jira', 'github', 'stripe', 'salesforce'].includes(lowerQuery)
  )
  
  if (!isSpecificAppName) {
    // Email-related searches - only match if node has email-related keywords or name
    if (queryWords.some(word => word.includes('email') || word === 'mail' || word.includes('mail'))) {
      // Check if node has email-related keywords first
      if (node.keywords && node.keywords.length > 0) {
        const lowerKeywords = node.keywords.map(k => k.toLowerCase())
        const hasEmailKeyword = lowerKeywords.some(k => 
          k.includes('email') || k.includes('mail') || k.includes('send email')
        )
        if (!hasEmailKeyword) return false // Don't use semantic matching if no email keywords
      }
      // Only match specific email-related node names
      const emailRelated = ['gmail', 'outlook', 'send email']
      if (emailRelated.some(term => lowerName.includes(term))) return true
    }
    
    // Search-related searches
    if (queryWords.some(word => word.includes('search') || word.includes('web'))) {
      const searchRelated = ['web search', 'search', 'duckduckgo', 'serpapi', 'perplexity']
      if (searchRelated.some(term => lowerName.includes(term))) return true
    }
    
    // Drive/storage-related searches
    if (queryWords.some(word => word.includes('drive') || word.includes('storage') || word.includes('file'))) {
      const driveRelated = ['drive', 'dropbox', 'onedrive', 'box', 's3', 'blob storage']
      if (driveRelated.some(term => lowerName.includes(term))) return true
    }
    
    // Calendar-related searches
    if (queryWords.some(word => word.includes('calendar') || word.includes('schedule'))) {
      const calendarRelated = ['calendar', 'google calendar']
      if (calendarRelated.some(term => lowerName.includes(term))) return true
    }
    
    // Document-related searches
    if (queryWords.some(word => word.includes('doc') || word.includes('document'))) {
      const docRelated = ['docs', 'document', 'pdf', 'word', 'excel', 'sheets']
      if (docRelated.some(term => lowerName.includes(term))) return true
    }
  }
  
  return false
}

/**
 * Deduplicates nodes by name, but allows nodes with same name from different JSON categories
 */
function deduplicateNodes(nodes: NodeItem[], isSearching: boolean): NodeItem[] {
  if (!isSearching) return nodes
  
  // Don't deduplicate if nodes have different jsonCategory - they're different contexts
  // Only deduplicate if they have the same name AND same jsonCategory
  const seen = new Map<string, NodeItem>()
  const result: NodeItem[] = []
  
  for (const node of nodes) {
    // Create a unique key based on name and jsonCategory
    const key = `${node.name}::${node.jsonCategory || node.category}`
    const existing = seen.get(key)
    
    if (!existing) {
      // First time seeing this combination, add it
      seen.set(key, node)
      result.push(node)
    } else {
      // Same name and jsonCategory - check if we should replace
      // Prefer the one with higher score (but we don't have scores here, so just keep first)
      // Actually, since we're processing in order, we can keep the first one
    }
  }
  
  // Now handle true duplicates (same name, same jsonCategory) - prefer Apps over Popular
  const categoryPriority: Record<string, number> = {
    'Apps': 1,
    'Tools': 2,
    'Flow': 3,
    'Popular': 4
  }
  
  const finalResult: NodeItem[] = []
  const nameMap = new Map<string, NodeItem>()
  
  for (const node of result) {
    const existing = nameMap.get(node.name)
    if (!existing) {
      nameMap.set(node.name, node)
      finalResult.push(node)
    } else {
      // Same name - check if they're from different jsonCategories
      if (existing.jsonCategory !== node.jsonCategory) {
        // Different contexts, keep both
        finalResult.push(node)
      } else {
        // Same name and same jsonCategory - prefer higher priority
        const existingPriority = categoryPriority[existing.category] || 999
        const currentPriority = categoryPriority[node.category] || 999
        if (currentPriority < existingPriority) {
          // Replace with higher priority one
          const index = finalResult.indexOf(existing)
          if (index !== -1) {
            finalResult[index] = node
            nameMap.set(node.name, node)
          }
        }
      }
    }
  }
  
  return finalResult
}

/**
 * Filters nodes based on search query and category
 */
export function filterNodes(
  nodes: NodeItem[],
  searchQuery: string,
  selectedCategory: 'Popular' | 'Tools' | 'Apps' | 'Flow'
): NodeItem[] {
  // When not searching, collect Core Nodes names to exclude Popular duplicates
  const coreNodeNames = new Set<string>()
  if (searchQuery.trim() === '') {
    nodes.forEach(node => {
      if (node.jsonCategory === 'Core Nodes' && !node.isSubaction) {
        coreNodeNames.add(node.name)
      }
    })
  }
  
  const filtered = nodes.filter(node => {
    const matchesSearch = searchQuery.trim() === '' || matchesSearchQuery(node, searchQuery)
    const matchesCategory = searchQuery.trim() !== '' || node.category === selectedCategory
    
    // Exclude subactions from default view (only show in search)
    if (node.isSubaction && searchQuery.trim() === '') {
      return false
    }
    
    // When not searching, exclude Popular category nodes that duplicate Core Nodes
    if (searchQuery.trim() === '' && node.category === 'Popular' && !node.jsonCategory && coreNodeNames.has(node.name)) {
      return false
    }
    
    // Exclude Knowledge Base nodes from Tools category
    if (selectedCategory === 'Tools' && node.section === 'Knowledge Base') {
      return false
    }
    
    // For Flow category tab, only show actual Flow nodes (not Triggers or Outputs)
    if (selectedCategory === 'Flow' && searchQuery.trim() === '') {
      // When browsing Flow tab (not searching), only show nodes from the Flow JSON category
      if (node.jsonCategory !== 'Flow') {
        return false
      }
    }
    
    // Knowledge Base nodes are now included in search, but will appear at bottom with lowest priority
    
    // Exclude Popular category nodes from search results (they're duplicates)
    // BUT allow Core Nodes to appear in search since they're important
    if (searchQuery.trim() !== '' && node.category === 'Popular' && node.jsonCategory !== 'Core Nodes') {
      return false
    }
    
    return matchesSearch && matchesCategory
  })
  
  // Deduplicate when searching, preferring Apps over Popular
  return deduplicateNodes(filtered, searchQuery.trim() !== '')
}

/**
 * Groups nodes by category and section for display
 * When searching, prioritizes exact matches by showing them first
 */
export function groupNodes(nodes: NodeItem[], isSearching: boolean, searchQuery: string = ''): Record<string, NodeItem[]> {
  if (!isSearching || !searchQuery.trim()) {
    // When not searching, prioritize Trigger in Popular category, then Input and Output nodes
    // Sort nodes to put Trigger first in Popular, then Input and Output
    const sortedNodes = [...nodes].sort((a, b) => {
      const aIsTrigger = a.name === 'Trigger' && a.category === 'Popular'
      const bIsTrigger = b.name === 'Trigger' && b.category === 'Popular'
      const aIsInput = a.name === 'Input' || a.name === 'Inputs'
      const aIsOutput = a.name === 'Output' || a.name === 'Outputs'
      const bIsInput = b.name === 'Input' || b.name === 'Inputs'
      const bIsOutput = b.name === 'Output' || b.name === 'Outputs'
      
      // Trigger in Popular category comes first
      if (aIsTrigger && !bIsTrigger) return -1
      if (bIsTrigger && !aIsTrigger) return 1
      
      // Input comes after Trigger
      if (aIsInput && !bIsInput && !bIsOutput && !bIsTrigger) return -1
      if (bIsInput && !aIsInput && !aIsOutput && !aIsTrigger) return 1
      
      // Output comes after Input
      if (aIsOutput && !bIsInput && !bIsOutput && !bIsTrigger) return -1
      if (bIsOutput && !aIsInput && !aIsOutput && !aIsTrigger) return 1
      
      // If both are Input/Output, Input comes before Output
      if (aIsInput && bIsOutput) return -1
      if (aIsOutput && bIsInput) return 1
      
      // Otherwise maintain original order
      return 0
    })
    
    // Group by section
    const grouped = sortedNodes.reduce((acc, node) => {
      const section = node.section || 'default'
      if (!acc[section]) {
        acc[section] = []
      }
      acc[section].push(node)
      return acc
    }, {} as Record<string, NodeItem[]>)
    
    // Sort within each section to ensure Trigger appears first in Popular category
    Object.keys(grouped).forEach(section => {
      grouped[section].sort((a, b) => {
        const aIsTrigger = a.name === 'Trigger' && a.category === 'Popular'
        const bIsTrigger = b.name === 'Trigger' && b.category === 'Popular'
        
        // Trigger comes first in Popular category
        if (aIsTrigger && !bIsTrigger) return -1
        if (bIsTrigger && !aIsTrigger) return 1
        
        // Otherwise maintain order
        return 0
      })
    })
    
    return grouped
  }
  
  // When searching, score and separate top matches
  const lowerQuery = searchQuery.toLowerCase().trim()
  const scoredNodes = nodes.map(node => ({
    node,
    score: scoreNodeMatch(node, searchQuery),
    // Check if it's an exact name match
    isExactNameMatch: node.name.toLowerCase() === lowerQuery,
    // Check if it's a Knowledge Base node
    isKnowledgeBase: node.jsonCategory === 'Knowledge Base'
  }))
  
  // Sort by score (highest first)
  scoredNodes.sort((a, b) => b.score - a.score)
  
  // Separate top matches - ONLY exact name matches go to top (but NOT Knowledge Base nodes)
  const topMatches: NodeItem[] = []
  const otherNodes: NodeItem[] = []
  
  scoredNodes.forEach(({ node, score, isExactNameMatch, isKnowledgeBase }) => {
    // Only exact name matches appear in top section, BUT exclude Knowledge Base nodes
    if (isExactNameMatch && !isKnowledgeBase) {
      topMatches.push(node)
    } else {
      // All other matches (keyword matches, partial name matches, Knowledge Base nodes) go to category sections
      otherNodes.push(node)
    }
  })
  
  // Deduplicate top matches by name (prefer Core Nodes, then Apps over Knowledge Base)
  const topMatchesDeduped: NodeItem[] = []
  const topMatchesSeen = new Map<string, NodeItem>()
  const deduplicatedNodes: NodeItem[] = [] // Nodes that were removed from top matches
  
  // Priority function: Core Nodes have highest priority, then use category priority
  const getNodePriority = (node: NodeItem): number => {
    // Core Nodes have highest priority
    if (node.jsonCategory === 'Core Nodes') return 0
    // Then use category priority
    const categoryPriority: Record<string, number> = {
      'Apps': 1,
      'Tools': 2,
      'Flow': 3,
      'Popular': 4
    }
    return categoryPriority[node.category] || 999
  }
  
  for (const node of topMatches) {
    const existing = topMatchesSeen.get(node.name)
    if (!existing) {
      topMatchesSeen.set(node.name, node)
      topMatchesDeduped.push(node)
    } else {
      // If we already have this name, prefer the one with higher priority
      const existingPriority = getNodePriority(existing)
      const currentPriority = getNodePriority(node)
      if (currentPriority < existingPriority) {
        // Replace with higher priority one, move existing to otherNodes
        const index = topMatchesDeduped.indexOf(existing)
        if (index !== -1) {
          deduplicatedNodes.push(existing) // Add the replaced node to category sections
          topMatchesDeduped[index] = node
          topMatchesSeen.set(node.name, node)
        }
      } else {
        // Current node has lower priority, add it to category sections
        deduplicatedNodes.push(node)
      }
    }
  }
  
  const result: Record<string, NodeItem[]> = {}
  
  // Sort top matches to prioritize Core Nodes first
  topMatchesDeduped.sort((a, b) => {
    const aPriority = getNodePriority(a)
    const bPriority = getNodePriority(b)
    if (aPriority !== bPriority) {
      return aPriority - bPriority // Lower number = higher priority
    }
    // If same priority, maintain original order (already sorted by score)
    return 0
  })
  
  // Add top matches without a label (they'll appear first)
  if (topMatchesDeduped.length > 0) {
    result[''] = topMatchesDeduped // Empty string key means no label
  }
  
  // Add deduplicated nodes back to otherNodes so they appear in their category sections
  const allOtherNodes = [...otherNodes, ...deduplicatedNodes]
  
  // Score all other nodes for sorting within categories
  const scoredOtherNodes = allOtherNodes.map(node => ({
    node,
    score: scoreNodeMatch(node, searchQuery)
  }))
  
  // Separate nodes by priority: Core Nodes (highest), Inputs, StackAI, Knowledge Base (lowest), and regular nodes
  const knowledgeBaseNodes: Array<{ node: NodeItem; score: number }> = []
  const stackAINodes: Array<{ node: NodeItem; score: number }> = []
  const inputNodes: Array<{ node: NodeItem; score: number }> = []
  const coreNodes: Array<{ node: NodeItem; score: number }> = []
  const coreSubactions: Array<{ node: NodeItem; score: number }> = []
  const regularNodes: Array<{ node: NodeItem; score: number }> = []
  
  scoredOtherNodes.forEach(({ node, score }) => {
    if (node.jsonCategory === 'Knowledge Base') {
      knowledgeBaseNodes.push({ node, score })
    } else if (node.jsonCategory === 'StackAI') {
      stackAINodes.push({ node, score })
    } else if (node.jsonCategory === 'Inputs') {
      inputNodes.push({ node, score })
    } else if (node.jsonCategory === 'Core Nodes') {
      // Separate subactions from regular Core Nodes
      if (node.isSubaction) {
        coreSubactions.push({ node, score })
      } else {
        coreNodes.push({ node, score })
      }
    } else {
      regularNodes.push({ node, score })
    }
  })
  
  // Add Core Nodes category first (highest priority after exact matches)
  if (coreNodes.length > 0) {
    coreNodes.sort((a, b) => b.score - a.score)
    result['Core Nodes'] = coreNodes.map(({ node }) => node)
  }
  
  // Group Core Node subactions by their section (parent name like "AI Agent")
  if (coreSubactions.length > 0) {
    const subactionSections: Record<string, Array<{ node: NodeItem; score: number }>> = {}
    coreSubactions.forEach(({ node, score }) => {
      const section = node.section || 'Core Nodes'
      if (!subactionSections[section]) {
        subactionSections[section] = []
      }
      subactionSections[section].push({ node, score })
    })
    
    // Sort and add subaction sections
    Object.keys(subactionSections).forEach(section => {
      subactionSections[section].sort((a, b) => b.score - a.score)
      result[section] = subactionSections[section].map(({ node }) => node)
    })
  }
  
  // Add Inputs category (second priority after Core Nodes)
  if (inputNodes.length > 0) {
    inputNodes.sort((a, b) => b.score - a.score)
    result['Inputs'] = inputNodes.map(({ node }) => node)
  }
  
  // Group StackAI nodes by section (prioritized - will appear after Inputs)
  const stackAISections: Record<string, Array<{ node: NodeItem; score: number }>> = {}
  stackAINodes.forEach(({ node, score }) => {
    const section = node.section || 'StackAI'
    if (!stackAISections[section]) {
      stackAISections[section] = []
    }
    stackAISections[section].push({ node, score })
  })
  
  // Sort and add StackAI sections (prioritized, right after Inputs)
  Object.keys(stackAISections).forEach(section => {
    stackAISections[section].sort((a, b) => b.score - a.score)
    result[section] = stackAISections[section].map(({ node }) => node)
  })
  
  // Group regular nodes by category (Knowledge Base, StackAI, and Inputs excluded)
  const regularSections: Record<string, Array<{ node: NodeItem; score: number }>> = {}
  regularNodes.forEach(({ node, score }) => {
    let section: string
    // Use JSON parent category as the main label
    if (node.jsonCategory) {
      section = node.jsonCategory
    } else if (node.section) {
      section = node.section
    } else {
      section = node.category
    }
    
    if (!regularSections[section]) {
      regularSections[section] = []
    }
    regularSections[section].push({ node, score })
  })
  
  // Sort and add regular sections
  Object.keys(regularSections).forEach(section => {
    regularSections[section].sort((a, b) => b.score - a.score)
    result[section] = regularSections[section].map(({ node }) => node)
  })
  
  // Add Knowledge Base nodes at the bottom with lowest priority
  if (knowledgeBaseNodes.length > 0) {
    // Sort Knowledge Base nodes by score (highest first) but they'll still be at bottom
    knowledgeBaseNodes.sort((a, b) => b.score - a.score)
    result['Knowledge Base'] = knowledgeBaseNodes.map(({ node }) => node)
  }
  
  return result
}

