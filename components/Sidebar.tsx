'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Search,
  Pin,
  X,
  GripVertical,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
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

// Helper function to generate ID from name
const generateId = (name: string, prefix?: string): string => {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return prefix ? `${prefix}-${base}` : base
}

// Helper to extract name and keywords from node data
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

// Transform JSON data into NodeItem array (same as NodeSelector)
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
        // Skip if a node with the same name and category already exists
        const exists = items.some(item => item.name === name && item.category === 'Popular')
        if (!exists) {
          items.push({
            id: generateId(name, 'popular'),
            name,
            category: 'Popular',
            keywords
          })
        }
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

  // Flow category
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

  // Tools category - map from Knowledge Base
  if (data['Knowledge Base']) {
    if (Array.isArray(data['Knowledge Base'])) {
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

interface SidebarProps {
  onAddNode?: (nodeName: string, position?: { x: number; y: number }) => void
}

type SubmenuType = 'inputs' | 'outputs' | null

export default function Sidebar({ onAddNode }: SidebarProps) {
  const [searchValue, setSearchValue] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category>('Popular')
  const [submenu, setSubmenu] = useState<SubmenuType>(null)
  const [draggedNode, setDraggedNode] = useState<{ name: string; startPos: { x: number; y: number } } | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
    if (!searchValue.trim()) return submenuItems
    const query = searchValue.toLowerCase()
    return submenuItems.filter((item: NodeDataValue) => {
      const { name, keywords } = extractNodeInfo(item)
      const nameMatch = name.toLowerCase().includes(query)
      const keywordMatch = keywords?.some(k => k.toLowerCase().includes(query))
      return nameMatch || keywordMatch
    })
  }, [submenuItems, searchValue, submenu])

  // Filter and group nodes using the same search utilities as NodeSelector
  const filteredNodes = useMemo(() => 
    filterNodes(nodeData, searchValue, selectedCategory),
    [nodeData, searchValue, selectedCategory]
  )

  const groupedNodes = useMemo(() => 
    groupNodes(filteredNodes, searchValue.trim() !== '', searchValue),
    [filteredNodes, searchValue]
  )

  const togglePin = () => {
    setIsPinned((prev) => !prev)
  }

  const sidebarExpanded = isPinned || searchValue.trim().length > 0

  return (
    <nav className={`group relative h-full transition-all duration-200 ease-in-out ${sidebarExpanded ? 'w-[275px]' : 'w-12 hover:w-[275px]'}`}>
      <div className={`no-scrollbar absolute bottom-0 left-0 top-0 z-50 flex flex-col justify-between overflow-y-auto border-r border-gray-200 bg-white transition-all duration-200 ease-in-out ${sidebarExpanded ? 'w-[275px]' : 'w-12 group-hover:w-[275px]'}`}>
        {/* Top Section */}
        <div className="flex w-full flex-col flex-1 min-h-0">
          {/* Search Bar */}
          <div className="sticky top-0 z-10 flex flex-col bg-white">
            <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-neutral-200 border-solid inset-0 pointer-events-none" />
            <div className="size-full">
              <div className="box-border content-stretch flex flex-col gap-[10px] items-start px-[10px] pt-[12px] pb-[6px] relative w-full min-h-[56px]">
              {/* Submenu Header with Back Button */}
              {submenu && (
                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={() => {
                      setSubmenu(null)
                      setSearchValue('')
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
              <div className="flex items-center gap-2 w-full flex-shrink-0 h-[32px]">
                {/* Search Bar */}
                <div className="bg-[#f9f9f9] h-[32px] relative rounded-[8px] shrink-0 flex-1 min-w-0">
                  <div aria-hidden="true" className="absolute border-[#ececec] border-[0.5px] border-solid inset-0 pointer-events-none rounded-[8px]" />
                  <div className="flex flex-row items-center size-full">
                    <div className="box-border content-stretch flex gap-[12px] h-[32px] items-center px-[10px] py-[12px] relative w-full">
                      <div className="relative shrink-0 size-[16px]">
                        <Search className="block size-full text-[#C4C4C4]" strokeWidth={1.5} />
                      </div>
                      <input
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Search..."
                        className={`flex-1 bg-transparent border-none outline-none font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic text-[#8c8c8c] text-[12px] tracking-[-0.12px] placeholder:text-[#8c8c8c] transition-opacity duration-200 ${sidebarExpanded || searchValue.trim() ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      />
                      {searchValue.trim() && (
                        <button
                          onClick={() => setSearchValue('')}
                          className="relative shrink-0 size-[16px] text-[#8c8c8c] hover:text-[#1d1d1d] transition-colors"
                          type="button"
                        >
                          <X className="block size-full" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Pin icon - visible when expanded or on hover, hidden when collapsed */}
                <button 
                  onClick={togglePin}
                  className={`flex h-8 items-center justify-center rounded-md hover:bg-gray-100 transition-all flex-shrink-0 ${sidebarExpanded ? 'w-8 opacity-100' : 'w-0 opacity-0 group-hover:w-8 group-hover:opacity-100'}`}
                  title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                >
                  <Pin className={`size-4 ${isPinned ? 'fill-current text-gray-700' : 'text-gray-400'}`} />
                </button>
              </div>

            {/* Search Results Dropdown */}
            {searchValue.trim() && !submenu && (
              <div className="box-border flex flex-col gap-[2px] flex-1 items-start p-[6px] relative w-full overflow-y-auto overflow-x-hidden min-h-0">
                {Object.entries(groupedNodes).map(([section, nodes]) => {
                  let sectionHeader: string | null = null
                  if (section !== '') {
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
                          draggable
                          onDragStart={(e) => {
                            setDraggedNode({ name: node.name, startPos: { x: e.clientX, y: e.clientY } })
                            e.dataTransfer.effectAllowed = 'copy'
                            e.dataTransfer.setData('text/plain', node.name)
                            // Create a custom drag image
                            const dragImage = document.createElement('div')
                            dragImage.textContent = node.name
                            dragImage.style.position = 'absolute'
                            dragImage.style.top = '-1000px'
                            document.body.appendChild(dragImage)
                            e.dataTransfer.setDragImage(dragImage, 0, 0)
                            setTimeout(() => document.body.removeChild(dragImage), 0)
                          }}
                          onDragEnd={(e) => {
                            setDraggedNode(null)
                          }}
                          onClick={() => {
                            const isOutputNode = node.name === 'Output' || node.name === 'Outputs'
                            
                            if (isOutputNode) {
                              setSubmenu('outputs')
                              setSearchValue('')
                            } else {
                              if (onAddNode) {
                                onAddNode(node.name)
                              }
                              setSearchValue('')
                            }
                          }}
                          onMouseEnter={(e) => {
                            const isOutputNode = node.name === 'Output' || node.name === 'Outputs'
                            if (!isOutputNode) {
                              if (hoverTimeoutRef.current) {
                                clearTimeout(hoverTimeoutRef.current)
                              }
                              const target = e.currentTarget
                              hoverTimeoutRef.current = setTimeout(() => {
                                if (target && document.body.contains(target)) {
                                  const rect = target.getBoundingClientRect()
                                  setTooltipPosition({ x: rect.right + 8, y: rect.top + rect.height / 2 })
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
                          className="group/node relative shrink-0 w-full cursor-pointer hover:bg-gray-50 rounded-[4px] transition-colors cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex flex-row items-center size-full min-h-[34px]">
                            <div className="box-border content-stretch flex gap-[8px] items-center p-[6px] relative w-full h-full">
                              {/* Icon placeholder */}
                              <div className="bg-gray-100 relative rounded-[4.714px] shrink-0 size-[22px]">
                                <div aria-hidden="true" className="absolute border-[0.393px] border-[rgba(0,0,0,0.12)] border-solid inset-0 pointer-events-none rounded-[4.714px]" />
                              </div>
                              <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 flex-1 min-h-[22px]">
                                <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1d1d1d] text-[13px] text-nowrap tracking-[-0.13px] whitespace-pre">{node.name}</p>
                              </div>
                              {/* Show chevron for Output (always visible), drag icon for others (on hover) */}
                              {isOutputNode ? (
                                <ChevronRight className="text-gray-400 flex-shrink-0 size-4 ml-2" strokeWidth={1.5} />
                              ) : (
                                <GripVertical className="text-gray-400 opacity-0 group-hover/node:opacity-100 transition-opacity flex-shrink-0 size-4 ml-2" />
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
              </div>
            )}
              </div>
            </div>
          </div>

          {/* Category Tabs - hidden when searching or in submenu */}
          {!searchValue.trim() && !submenu && (
            <>
              {/* Collapsed: Show icon (hidden when expanded) */}
              <div className={`flex items-center justify-center flex-shrink-0 mb-0 pb-3 py-1 mt-0 h-[40px] ${sidebarExpanded ? 'hidden' : 'group-hover:hidden'}`}>
                <div className="size-5 bg-gray-200 rounded flex-shrink-0" />
              </div>
              {/* Expanded: Show tabs (hidden when collapsed) */}
              <div className={`px-[10px] flex-shrink-0 mb-0 pb-3 mt-0 h-[40px] flex items-center ${sidebarExpanded ? '' : 'hidden group-hover:flex'}`}>
                <div className="bg-gray-100 h-[32px] relative rounded-[8px] shrink-0 w-full">
                  <div className="flex flex-row items-center size-full">
                    <div className="box-border content-stretch flex h-[32px] items-center p-[2px] relative w-full">
                      {(['Popular', 'Tools', 'Apps', 'Flow'] as Category[]).map((category) => {
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
              </div>
            </>
          )}

          {/* Node List - Regular nodes or submenu items */}
          {!searchValue.trim() && (
            <div className="box-border flex flex-col gap-[2px] flex-1 items-start p-[6px] relative w-full overflow-y-auto overflow-x-hidden min-h-0">
              {submenu ? (
                // Submenu items
                <>
                  {filteredSubmenuItems.map((item: NodeDataValue) => {
                    const { name } = extractNodeInfo(item)
                    const nodeId = generateId(name, submenu === 'inputs' ? 'input' : 'output')
                    return (
                      <div
                        key={nodeId}
                        draggable
                        onDragStart={(e) => {
                          setDraggedNode({ name, startPos: { x: e.clientX, y: e.clientY } })
                          e.dataTransfer.effectAllowed = 'copy'
                          e.dataTransfer.setData('text/plain', name)
                          const dragImage = document.createElement('div')
                          dragImage.textContent = name
                          dragImage.style.position = 'absolute'
                          dragImage.style.top = '-1000px'
                          document.body.appendChild(dragImage)
                          e.dataTransfer.setDragImage(dragImage, 0, 0)
                          setTimeout(() => document.body.removeChild(dragImage), 0)
                        }}
                        onDragEnd={(e) => {
                          setDraggedNode(null)
                        }}
                        onClick={() => {
                          if (onAddNode) {
                            onAddNode(name)
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current)
                          }
                          const target = e.currentTarget
                          hoverTimeoutRef.current = setTimeout(() => {
                            if (target && document.body.contains(target)) {
                              const rect = target.getBoundingClientRect()
                              setTooltipPosition({ x: rect.right + 8, y: rect.top + rect.height / 2 })
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
                        className="group/node relative shrink-0 w-full cursor-pointer hover:bg-gray-50 rounded-[4px] transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex flex-row items-center size-full min-h-[34px]">
                          <div className="box-border content-stretch flex gap-[8px] items-center p-[6px] relative w-full h-full">
                            {/* Icon placeholder */}
                            <div className="bg-gray-100 relative rounded-[4.714px] shrink-0 size-[22px]">
                              <div aria-hidden="true" className="absolute border-[0.393px] border-[rgba(0,0,0,0.12)] border-solid inset-0 pointer-events-none rounded-[4.714px]" />
                            </div>
                            <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 flex-1 min-h-[22px]">
                              <p className={`font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1d1d1d] text-[13px] text-nowrap tracking-[-0.13px] whitespace-pre transition-opacity ${sidebarExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{name}</p>
                            </div>
                            <GripVertical className={`text-gray-400 opacity-0 group-hover/node:opacity-100 transition-opacity flex-shrink-0 size-4 ${sidebarExpanded ? 'ml-2' : 'w-0 group-hover/node:w-4 group-hover/node:ml-2'}`} />
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
                let sectionHeader: string | null = null
                if (section !== 'default') {
                  sectionHeader = section
                }
                
                return (
                  <div key={section} className="w-full">
                    {sectionHeader && (
                      <div className={`px-[6px] py-2 text-xs font-normal text-gray-500 uppercase tracking-wide ${sidebarExpanded ? '' : 'hidden group-hover:block'}`}>
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
                        draggable
                        onDragStart={(e) => {
                          setDraggedNode({ name: node.name, startPos: { x: e.clientX, y: e.clientY } })
                          e.dataTransfer.effectAllowed = 'copy'
                          e.dataTransfer.setData('text/plain', node.name)
                          // Create a custom drag image
                          const dragImage = document.createElement('div')
                          dragImage.textContent = node.name
                          dragImage.style.position = 'absolute'
                          dragImage.style.top = '-1000px'
                          document.body.appendChild(dragImage)
                          e.dataTransfer.setDragImage(dragImage, 0, 0)
                          setTimeout(() => document.body.removeChild(dragImage), 0)
                        }}
                        onDragEnd={(e) => {
                          setDraggedNode(null)
                        }}
                        onClick={() => {
                          const isOutputNode = node.name === 'Output' || node.name === 'Outputs'
                          
                          if (isOutputNode) {
                            setSubmenu('outputs')
                            setSearchValue('')
                          } else {
                            if (onAddNode) {
                              onAddNode(node.name)
                            }
                          }
                        }}
                        onMouseEnter={(e) => {
                          const isOutputNode = node.name === 'Output' || node.name === 'Outputs'
                          if (!isOutputNode) {
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current)
                            }
                            const target = e.currentTarget
                            hoverTimeoutRef.current = setTimeout(() => {
                              if (target && document.body.contains(target)) {
                                const rect = target.getBoundingClientRect()
                                setTooltipPosition({ x: rect.right + 8, y: rect.top + rect.height / 2 })
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
                        className="group/node relative shrink-0 w-full cursor-pointer hover:bg-gray-50 rounded-[4px] transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex flex-row items-center size-full min-h-[34px]">
                          <div className="box-border content-stretch flex gap-[8px] items-center p-[6px] relative w-full h-full">
                            {/* Icon placeholder */}
                            <div className="bg-gray-100 relative rounded-[4.714px] shrink-0 size-[22px]">
                              <div aria-hidden="true" className="absolute border-[0.393px] border-[rgba(0,0,0,0.12)] border-solid inset-0 pointer-events-none rounded-[4.714px]" />
                            </div>
                            <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 flex-1 min-h-[22px]">
                              <p className={`font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1d1d1d] text-[13px] text-nowrap tracking-[-0.13px] whitespace-pre transition-opacity ${sidebarExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{node.name}</p>
                            </div>
                            {/* Show chevron for Output (always visible when sidebar is expanded/hovered), drag icon for others (on hover) */}
                            {isOutputNode ? (
                              <ChevronRight className={`text-gray-400 flex-shrink-0 size-4 ${sidebarExpanded ? 'ml-2' : 'w-0 group-hover:w-4 group-hover:ml-2'}`} strokeWidth={1.5} />
                            ) : (
                              <GripVertical className={`text-gray-400 opacity-0 group-hover/node:opacity-100 transition-opacity flex-shrink-0 size-4 ${sidebarExpanded ? 'ml-2' : 'w-0 group-hover/node:w-4 group-hover/node:ml-2'}`} />
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
          )}
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-1 px-2 pb-4 border-t border-gray-200 pt-2">
          <button className={`group/item flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors min-h-[36px] ${sidebarExpanded ? 'justify-start' : 'justify-center group-hover:justify-start'}`}>
            <div className={`size-5 bg-gray-300 rounded flex-shrink-0 ${sidebarExpanded ? 'mr-3' : 'mr-0 group-hover:mr-3'}`} />
            <span className={`whitespace-nowrap transition-all duration-200 overflow-hidden ${sidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto'}`}>
              Help & More
            </span>
          </button>
          <button className={`group/item flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors min-h-[36px] ${sidebarExpanded ? 'justify-start' : 'justify-center group-hover:justify-start'}`}>
            <div className={`relative size-5 bg-gray-300 rounded flex-shrink-0 ${sidebarExpanded ? 'mr-3' : 'mr-0 group-hover:mr-3'}`} />
            <span className={`whitespace-nowrap transition-all duration-200 overflow-hidden ${sidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto'}`}>
              System Status
            </span>
          </button>
        </div>
      </div>
      {/* Tooltip - rendered at root level to avoid overflow clipping */}
      {tooltipPosition && hoveredNodeId && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateY(-50%)'
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
    </nav>
  )
}

