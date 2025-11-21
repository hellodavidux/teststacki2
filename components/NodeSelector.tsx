'use client'

import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import nodesData from '../nodes.json'
import { filterNodes, groupNodes, type NodeItem } from '../utils/nodeSearch'

type Category = 'Popular' | 'Tools' | 'Apps' | 'Flow'

interface NodeDataItem {
  name: string
  keywords?: string[]
  subactions?: Array<{ name: string }>
}

type NodeDataValue = string | NodeDataItem

interface NodesData {
  Inputs?: NodeDataValue[]
  Triggers?: NodeDataValue[]
  Outputs?: NodeDataValue[]
  'Core Nodes'?: NodeDataValue[]
  Popular?: NodeDataValue[]
  Apps?: NodeDataValue[]
  Flow?: NodeDataValue[]
  StackAI?: {
    [key: string]: NodeDataValue[]
  }
  'Knowledge Base'?: NodeDataValue[] | {
    [key: string]: NodeDataValue[]
  }
  [key: string]: any
}

interface NodeSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectNode: (nodeId: string, nodeName: string) => void
  position?: { x: number; y: number }
}

// Helper function to generate ID from name
const generateId = (name: string, prefix?: string): string => {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return prefix ? `${prefix}-${base}` : base
}

// Helper to extract name and keywords from node data (supports both string and object formats)
const extractNodeInfo = (item: NodeDataValue): { name: string; keywords?: string[] } => {
  if (typeof item === 'string') {
    return { name: item }
  }
  return { name: item.name, keywords: item.keywords }
}

// Helper to generate description for a node
const getNodeDescription = (name: string): string => {
  const descriptions: { [key: string]: string } = {
    'Files': 'Enables user to upload Files (e.g. PDF, Word, Excel etc.)',
    'Input': 'User input node for collecting data from users',
    'Output': 'Output node for displaying results',
    'AI Agent': 'AI Agent with tool calling capabilities',
    'Knowledge Base': 'Search and retrieve information from knowledge base',
    'StackAI': 'StackAI platform integration node',
    'Trigger': 'Trigger node for starting workflows',
    'Action': 'Action node for executing operations',
    'URL': 'URL input node for web-based triggers',
    'Audio': 'Audio input/output node for voice interactions',
    'Template': 'Template node for formatting output',
  }
  
  // Try exact match first
  if (descriptions[name]) {
    return descriptions[name]
  }
  
  // Generate generic description based on name
  return `Node for ${name.toLowerCase()} operations`
}

// Transform JSON data into NodeItem array
const transformNodeData = (): NodeItem[] => {
  const items: NodeItem[] = []
  const data = nodesData as NodesData

  // Inputs category - only include Trigger by default, but include all inputs in search
  if (Array.isArray(data.Inputs)) {
    data.Inputs.forEach((item: NodeDataValue) => {
      const { name, keywords } = extractNodeInfo(item)
      if (name === 'Trigger') {
        items.push({
          id: generateId(name, 'trigger'),
          name,
          category: 'Flow',
          jsonCategory: 'Triggers',
          keywords
        })
      } else {
        // Include other input nodes but mark them as subactions so they only show in search
        items.push({
          id: generateId(name, 'input'),
          name,
          category: 'Flow',
          jsonCategory: 'Inputs',
          keywords,
          isSubaction: true // Only show in search, not in default view
        })
      }
    })
  }

  // Add trigger options as separate nodes
  const triggerOptions = [
    { name: 'User submission', keywords: ['user', 'submission', 'input', 'form', 'trigger'] },
    { name: 'App Trigger', keywords: ['app', 'trigger', 'integration', 'webhook', 'api'] },
    { name: 'Run on Click', keywords: ['click', 'run', 'manual', 'trigger', 'execute'] },
    { name: 'Scheduled trigger', keywords: ['scheduled', 'schedule', 'timer', 'cron', 'trigger'] }
  ]
  
  triggerOptions.forEach(option => {
    items.push({
      id: generateId(option.name, 'trigger-option'),
      name: option.name,
      category: 'Flow',
      jsonCategory: 'Triggers',
      keywords: option.keywords
    })
  })

  // Triggers category
  if (Array.isArray(data.Triggers)) {
    data.Triggers.forEach((item: NodeDataValue) => {
      const { name, keywords } = extractNodeInfo(item)
      items.push({
        id: generateId(name, 'trigger'),
        name,
        category: 'Flow',
        jsonCategory: 'Triggers',
        keywords
      })
    })
  }

  // Outputs category
  if (Array.isArray(data.Outputs)) {
    data.Outputs.forEach((item: NodeDataValue) => {
      const { name, keywords } = extractNodeInfo(item)
      items.push({
        id: generateId(name, 'output'),
        name,
        category: 'Flow',
        jsonCategory: 'Outputs',
        keywords
      })
    })
  }

  // Core Nodes category
  if (Array.isArray(data['Core Nodes'])) {
    data['Core Nodes'].forEach((item: NodeDataValue) => {
      const { name, keywords } = extractNodeInfo(item)
      // Add the main node
      items.push({
        id: generateId(name, 'core'),
        name,
        category: 'Popular',
        jsonCategory: 'Core Nodes',
        keywords
      })
      
      // If this node has subactions (like AI Agent), add them as searchable nodes
      if (typeof item === 'object' && item.subactions && Array.isArray(item.subactions)) {
        item.subactions.forEach((subaction: { name: string }) => {
          items.push({
            id: generateId(subaction.name, 'core-subaction'),
            name: subaction.name,
            category: 'Popular',
            jsonCategory: 'Core Nodes',
            section: name, // Parent node name
            keywords: keywords, // Inherit keywords from parent
            // Mark as subaction so it only shows in search
            isSubaction: true
          })
        })
      }
    })
  }

  // Popular category - add Trigger at the top first
  items.push({
    id: generateId('Trigger', 'popular-trigger'),
    name: 'Trigger',
    category: 'Popular',
    jsonCategory: 'Triggers',
    keywords: ['trigger', 'app', 'webhook', 'api', 'start']
  })

  // Popular category - filter out Inputs and Trigger (Trigger already added above)
  if (Array.isArray(data.Popular)) {
    data.Popular.forEach((item: NodeDataValue) => {
      const { name, keywords } = extractNodeInfo(item)
      // Exclude "Inputs" and "Trigger" from Popular category (Trigger is already added above)
      if (name !== 'Inputs' && name !== 'Trigger') {
        items.push({
          id: generateId(name, 'popular'),
          name,
          category: 'Popular',
          keywords
        })
      }
    })
  }

  // Apps category
  if (Array.isArray(data.Apps)) {
    data.Apps.forEach((item: NodeDataValue) => {
      const { name, keywords } = extractNodeInfo(item)
      items.push({
        id: generateId(name, 'app'),
        name,
        category: 'Apps',
        jsonCategory: 'Apps',
        keywords
      })
    })
  }

  // Flow category (formerly Logic)
  if (Array.isArray(data.Flow)) {
    data.Flow.forEach((item: NodeDataValue) => {
      const { name, keywords } = extractNodeInfo(item)
      items.push({
        id: generateId(name, 'flow'),
        name,
        category: 'Flow',
        jsonCategory: 'Flow',
        keywords
      })
    })
  }

  // Tools category - map from StackAI subcategories
  if (data.StackAI && typeof data.StackAI === 'object') {
    Object.entries(data.StackAI).forEach(([section, actions]) => {
      if (Array.isArray(actions)) {
        actions.forEach((item: NodeDataValue) => {
          const { name, keywords } = extractNodeInfo(item)
          // Exclude Send Email action from StackAI Email Tools
          if (section === 'Email Tools' && name === 'Send Email') {
            return
          }
          items.push({
            id: generateId(name, 'stackai'),
            name,
            category: 'Tools',
            jsonCategory: 'StackAI',
            section,
            keywords
          })
        })
      }
    })
  }

  // Tools category - map from Knowledge Base (can be array or object with subcategories)
  if (data['Knowledge Base']) {
    if (Array.isArray(data['Knowledge Base'])) {
      // Flat array structure
      data['Knowledge Base'].forEach((item: NodeDataValue) => {
        const { name, keywords } = extractNodeInfo(item)
        items.push({
          id: generateId(name, 'knowledge-base'),
          name,
          category: 'Tools',
          jsonCategory: 'Knowledge Base',
          section: 'Knowledge Base',
          keywords
        })
      })
    } else if (typeof data['Knowledge Base'] === 'object') {
      // Object with subcategories (backward compatibility)
      Object.entries(data['Knowledge Base']).forEach(([section, sources]) => {
        if (Array.isArray(sources)) {
          sources.forEach((item: NodeDataValue) => {
            const { name, keywords } = extractNodeInfo(item)
            items.push({
              id: generateId(name, 'knowledge-base'),
              name,
              category: 'Tools',
              jsonCategory: 'Knowledge Base',
              section,
              keywords
            })
          })
        }
      })
    }
  }

  return items
}

type SubmenuType = 'inputs' | 'outputs' | null

export default function NodeSelector({ isOpen, onClose, onSelectNode, position }: NodeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category>('Popular')
  const [submenu, setSubmenu] = useState<SubmenuType>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const scrollableRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear search when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSelectedCategory('Popular')
      setSubmenu(null)
      setHoveredNodeId(null)
      setTooltipPosition(null)
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
    }
  }, [isOpen])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Transform and memoize node data
  const nodeData = useMemo(() => transformNodeData(), [])

  // Get submenu items from JSON
  const submenuItems = useMemo(() => {
    if (!submenu) return []
    const data = nodesData as NodesData
    
    // Remove inputs submenu - no longer needed
    if (submenu === 'inputs') {
      return []
    } else if (submenu === 'outputs') {
      const outputs = data.Outputs || []
      // Filter out Action
      return outputs.filter((item: NodeDataValue) => {
        const { name } = extractNodeInfo(item)
        return name !== 'Action'
      })
    }
    return []
  }, [submenu])

  // Filter submenu items by search query
  const filteredSubmenuItems = useMemo(() => {
    if (!submenu) return []
    if (!searchQuery.trim()) return submenuItems
    const query = searchQuery.toLowerCase()
    return submenuItems.filter((item: NodeDataValue) => {
      const { name, keywords } = extractNodeInfo(item)
      const nameMatch = name.toLowerCase().includes(query)
      const keywordMatch = keywords?.some(k => k.toLowerCase().includes(query))
      return nameMatch || keywordMatch
    })
  }, [submenuItems, searchQuery, submenu])

  // Filter and group nodes using the extracted search utilities
  const filteredNodes = useMemo(() => 
    filterNodes(nodeData, searchQuery, selectedCategory),
    [nodeData, searchQuery, selectedCategory]
  )

  const groupedNodes = useMemo(() => 
    groupNodes(filteredNodes, searchQuery.trim() !== '', searchQuery),
    [filteredNodes, searchQuery]
  )

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Capture wheel events to prevent canvas scrolling
  useEffect(() => {
    if (!isOpen || !scrollableRef.current) return

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement
      // Check if the event is within our scrollable container or its children
      if (scrollableRef.current && scrollableRef.current.contains(target)) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        // Manually scroll
        scrollableRef.current.scrollTop += e.deltaY
      }
    }

    // Use capture phase to catch events early
    document.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    return () => document.removeEventListener('wheel', handleWheel, { capture: true })
  }, [isOpen])

  if (!isOpen) return null

  const categories: Category[] = ['Popular', 'Tools', 'Apps', 'Flow']

  return (
    <>
      {/* Backdrop - click to close */}
      <div 
        className="fixed inset-0 z-50"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className="fixed bg-white rounded-[14px] w-[250px] h-[380px] flex flex-col z-50 relative"
        style={position ? { left: `${position.x}px`, top: `${position.y}px` } : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => {
          // Stop all wheel events from reaching the canvas
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          // Stop propagation to prevent canvas panning
          e.stopPropagation()
        }}
      >
        <div className="flex flex-col items-center overflow-hidden overflow-x-hidden relative rounded-[inherit] size-full">
          {/* Header with Search and Tabs */}
          <div className="bg-white shrink-0 sticky top-0 w-full">
            <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-neutral-200 border-solid inset-0 pointer-events-none" />
            <div className="size-full">
              <div className="box-border content-stretch flex flex-col gap-[6px] items-start px-[10px] py-[12px] relative w-full">
                {/* Search Bar */}
                <div className="bg-[#f9f9f9] h-[32px] relative rounded-[8px] shrink-0 w-full">
                  <div aria-hidden="true" className="absolute border-[#ececec] border-[0.5px] border-solid inset-0 pointer-events-none rounded-[8px]" />
                  <div className="flex flex-row items-center size-full">
                    <div className="box-border content-stretch flex gap-[12px] h-[32px] items-center px-[10px] py-[12px] relative w-full">
                      <div className="relative shrink-0 size-[16px]">
                        <Search className="block size-full text-[#C4C4C4]" strokeWidth={1.5} />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="flex-1 bg-transparent border-none outline-none font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic text-[#8c8c8c] text-[12px] tracking-[-0.12px] placeholder:text-[#8c8c8c]"
                        autoFocus
                      />
                      {searchQuery.trim() && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="relative shrink-0 size-[16px] text-[#8c8c8c] hover:text-[#1d1d1d] transition-colors"
                          type="button"
                        >
                          <X className="block size-full" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submenu Header with Back Button */}
                {submenu && (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={() => {
                        setSubmenu(null)
                        setSearchQuery('')
                      }}
                      className="relative shrink-0 size-[20px] text-[#1d1d1d] hover:text-[#8c8c8c] transition-colors cursor-pointer"
                      type="button"
                    >
                      <ChevronLeft className="block size-full" strokeWidth={1.5} />
                    </button>
                    <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic text-[#1d1d1d] text-[13px]">
                      {submenu === 'inputs' ? 'Inputs' : 'Outputs'}
                    </p>
                  </div>
                )}

                {/* Category Tabs - hidden when searching or in submenu */}
                {!searchQuery.trim() && !submenu && (
                  <div className="bg-gray-100 h-[32px] relative rounded-[8px] shrink-0 w-full">
                    <div className="flex flex-row items-center size-full">
                      <div className="box-border content-stretch flex h-[32px] items-center p-[2px] relative w-full">
                        {categories.map((category) => {
                          const isActive = selectedCategory === category
                          if (isActive) {
                            return (
                              <div
                                key={category}
                                className="basis-0 bg-white grow h-full min-h-px min-w-px relative rounded-[6px] shrink-0 cursor-pointer"
                                onClick={() => setSelectedCategory(category)}
                              >
                                <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
                                  <div className="box-border content-stretch flex gap-[8px] items-center justify-center px-[14px] py-[4px] relative size-full">
                                    <p className="font-['Inter:Medium',sans-serif] font-medium leading-[12px] not-italic relative shrink-0 text-[#1d1d1d] text-[12px] text-nowrap whitespace-pre">{category}</p>
                                  </div>
                                </div>
                                <div aria-hidden="true" className="absolute border-[0.5px] border-[rgba(0,0,0,0.16)] border-solid inset-0 pointer-events-none rounded-[6px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.04),0px_4px_6px_0px_rgba(29,29,29,0.04)]" />
                              </div>
                            )
                          }
                          return (
                            <div
                              key={category}
                              className="basis-0 grow min-h-px min-w-px relative rounded-[8px] shrink-0 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => setSelectedCategory(category)}
                            >
                              <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
                                <div className="box-border content-stretch flex gap-[4px] items-center justify-center px-[14px] py-[4px] relative w-full">
                                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[12px] not-italic relative shrink-0 text-[#1d1d1d] text-[12px] text-nowrap whitespace-pre">{category}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Node List - Scrollable */}
          <div 
            ref={scrollableRef}
            className="box-border flex flex-col gap-[2px] flex-1 items-start px-[6px] pt-[2px] pb-[6px] relative w-full overflow-y-auto overflow-x-hidden min-h-0" 
            style={{ 
              scrollbarWidth: 'thin', 
              scrollbarColor: '#d1d5db transparent',
              WebkitOverflowScrolling: 'touch'
            }}
            onWheel={(e) => {
              // Prevent default and stop propagation to block canvas interaction
              e.preventDefault()
              e.stopPropagation()
              
              // Manually handle scrolling
              if (scrollableRef.current) {
                const scrollAmount = e.deltaY
                scrollableRef.current.scrollTop += scrollAmount
              }
            }}
            onMouseDown={(e) => {
              // Stop propagation to prevent canvas panning
              e.stopPropagation()
            }}
          >
            {submenu ? (
              // Submenu items
              <>
                {filteredSubmenuItems.map((item: NodeDataValue) => {
                  const { name } = extractNodeInfo(item)
                  const nodeId = generateId(name, submenu === 'inputs' ? 'input' : 'output')
                  return (
                    <div
                      key={nodeId}
                      className="group/node relative shrink-0 w-full cursor-pointer hover:bg-gray-50 rounded-[4px] transition-colors"
                      onClick={() => {
                        onSelectNode(nodeId, name)
                        onClose()
                      }}
                      onMouseEnter={(e) => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current)
                        }
                        const target = e.currentTarget
                        hoverTimeoutRef.current = setTimeout(() => {
                          if (target && document.body.contains(target)) {
                            const rect = target.getBoundingClientRect()
                            setTooltipPosition({ x: rect.left - 60, y: rect.top + rect.height / 2 })
                            setHoveredNodeId(nodeId)
                          }
                        }, 250)
                      }}
                      onMouseLeave={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current)
                          hoverTimeoutRef.current = null
                        }
                        setHoveredNodeId(null)
                        setTooltipPosition(null)
                      }}
                    >
                      <div className="flex flex-row items-center size-full">
                        <div className="box-border content-stretch flex gap-[8px] items-center p-[6px] relative w-full">
                          {/* Icon placeholder */}
                          <div className="bg-gray-100 relative rounded-[4.714px] shrink-0 size-[22px]">
                            <div aria-hidden="true" className="absolute border-[0.393px] border-[rgba(0,0,0,0.12)] border-solid inset-0 pointer-events-none rounded-[4.714px]" />
                          </div>
                          <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 flex-1">
                            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1d1d1d] text-[13px] text-nowrap tracking-[-0.13px] whitespace-pre">{name}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredSubmenuItems.length === 0 && (
                  <div className="flex items-center justify-center w-full py-8">
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[16px] not-italic text-[#8c8c8c] text-[12px]">
                      No items found
                    </p>
                  </div>
                )}
              </>
            ) : (
              // Regular node list
              <>
                {Object.entries(groupedNodes).map(([section, nodes]) => {
                  // Parse section header - show JSON categories when searching
                  let sectionHeader: string | null = null
                  if (searchQuery.trim() !== '') {
                    // When searching, show the JSON parent category (section name from grouping)
                    // This will be "StackAI" subsections, "Knowledge Base", "Apps", "Flow", etc.
                    sectionHeader = section
                  } else if (section !== 'default') {
                    // When not searching, show section only
                    sectionHeader = section
                  }
                  
                  return (
                  <div key={section} className="w-full">
                    {sectionHeader && (
                      <div className="px-[6px] py-2 text-xs font-normal text-gray-500 uppercase tracking-wide">
                        {sectionHeader}
                      </div>
                    )}
                    {nodes.map((node) => {
                      // Check if this is Outputs node (main category node that should show submenu)
                      // Inputs submenu removed - only Trigger shows directly
                      const isOutputNode = node.name === 'Output' || node.name === 'Outputs'
                      
                      return (
                        <div
                          key={node.id}
                          className="group/node relative shrink-0 w-full cursor-pointer hover:bg-gray-50 rounded-[4px] transition-colors"
                          onClick={() => {
                            if (isOutputNode) {
                              setSubmenu('outputs')
                              setSearchQuery('')
                            } else {
                              onSelectNode(node.id, node.name)
                              onClose()
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (!isOutputNode) {
                              if (hoverTimeoutRef.current) {
                                clearTimeout(hoverTimeoutRef.current)
                              }
                              const target = e.currentTarget
                              hoverTimeoutRef.current = setTimeout(() => {
                                if (target && document.body.contains(target)) {
                                  const rect = target.getBoundingClientRect()
                                  setTooltipPosition({ x: rect.left - 60, y: rect.top + rect.height / 2 })
                                  setHoveredNodeId(node.id)
                                }
                              }, 250)
                            }
                          }}
                          onMouseLeave={() => {
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current)
                              hoverTimeoutRef.current = null
                            }
                            setHoveredNodeId(null)
                            setTooltipPosition(null)
                          }}
                        >
                          <div className="flex flex-row items-center size-full">
                            <div className="box-border content-stretch flex gap-[8px] items-center p-[6px] relative w-full">
                              {/* Icon placeholder */}
                              {node.icon || (
                                <div className="bg-gray-100 relative rounded-[4.714px] shrink-0 size-[22px]">
                                  <div aria-hidden="true" className="absolute border-[0.393px] border-[rgba(0,0,0,0.12)] border-solid inset-0 pointer-events-none rounded-[4.714px]" />
                                </div>
                              )}
                              <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 flex-1">
                                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1d1d1d] text-[13px] text-nowrap tracking-[-0.13px] whitespace-pre">{node.name}</p>
                              </div>
                              {/* Chevron for Output nodes */}
                              {isOutputNode && (
                                <div className="relative shrink-0 size-[16px] text-[#8c8c8c]">
                                  <ChevronRight className="block size-full" strokeWidth={1.5} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  )
                })}
                {filteredNodes.length === 0 && (
                  <div className="flex items-center justify-center w-full py-8">
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[16px] not-italic text-[#8c8c8c] text-[12px]">
                      No items found
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div aria-hidden="true" className="absolute border-[0.5px] border-[rgba(0,0,0,0.16)] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.04),0px_4px_6px_0px_rgba(29,29,29,0.02),0px_20px_60px_0px_rgba(29,29,29,0.04),0px_2px_4px_0px_rgba(0,0,0,0.04)]" />
      </div>
      {/* Tooltip - rendered at root level to avoid overflow clipping */}
      {tooltipPosition && hoveredNodeId && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateY(-50%) translateX(-100%)'
          }}
        >
          <div className="bg-white rounded-lg px-4 py-3 shadow-lg border border-gray-200 max-w-xs">
            {(() => {
              // Find the node name from the hovered node ID
              let nodeName = ''
              const node = nodeData.find(n => n.id === hoveredNodeId)
              if (node) {
                nodeName = node.name
              } else if (submenu && filteredSubmenuItems.length > 0) {
                const item = filteredSubmenuItems.find((item: NodeDataValue) => {
                  const { name } = extractNodeInfo(item)
                  return generateId(name, submenu === 'inputs' ? 'input' : 'output') === hoveredNodeId
                })
                if (item) {
                  const { name } = extractNodeInfo(item)
                  nodeName = name
                }
              }
              
              if (!nodeName) return null
              
              return (
                <>
                  <p className="font-['Inter:Medium',sans-serif] font-medium text-sm text-[#1d1d1d] mb-1">
                    {nodeName}
                  </p>
                  <p className="font-['Inter:Regular',sans-serif] font-normal text-xs text-gray-500">
                    {getNodeDescription(nodeName)}
                  </p>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}

