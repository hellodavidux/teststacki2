'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, Zap, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import nodesData from '../nodes.json'

interface ConfigurationPanelProps {
  nodeName: string
  nodeId: string
  onClose: () => void
  onUpdateNodeName?: (nodeId: string, newName: string) => void
}

interface NodeDataItem {
  name: string
  subactions?: Array<{ name: string }>
}

type NodeDataValue = string | NodeDataItem

interface NodesData {
  Inputs?: NodeDataValue[]
  Apps?: NodeDataValue[]
  'Knowledge Base'?: NodeDataValue[]
  [key: string]: any
}

interface SubactionItem {
  name: string
  type?: 'action' | 'trigger' | 'knowledge-base'
  description?: string
  section?: string
}

type TriggerMenuView = 'main' | 'user-submission' | 'app-trigger'

interface Setting {
  label: string
  type: 'text' | 'number' | 'checkbox' | 'select' | 'time'
  value: string | number | boolean
  placeholder?: string
  options?: string[]
}

// App importance order - most important first
const APP_IMPORTANCE_ORDER = [
  'Gmail',
  'Slack',
  'Microsoft Teams',
  'Outlook',
  'Google Drive',
  'Google Sheets',
  'Airtable',
  'Notion',
  'Github',
  'Stripe',
  'Typeform',
  'Zendesk',
  'SharePoint',
  'Realtime Chat',
  'StackAI',
  'AWS SQS'
]

// Check if a node name is a trigger option
const isTriggerOption = (name: string): boolean => {
  const triggerOptions = [
    'Text Input', 'Files', 'Audio',
    'Run on Click', 'Scheduled trigger',
    'User submission', 'App Trigger'
  ]
  // Also check if it's an app name (not in the main trigger options)
  if (triggerOptions.includes(name)) return true
  
  // Check if it's an app trigger (we'll get all apps from nodes.json)
  const data = nodesData as NodesData
  if (data.Apps && Array.isArray(data.Apps)) {
    return data.Apps.some((item: NodeDataValue) => {
      const appName = typeof item === 'string' ? item : item.name
      return appName === name
    })
  }
  
  return false
}

export default function ConfigurationPanel({ nodeName, nodeId, onClose, onUpdateNodeName }: ConfigurationPanelProps) {
  const [triggerView, setTriggerView] = useState<TriggerMenuView>('main')
  const [showTriggerDropdown, setShowTriggerDropdown] = useState(false)
  const [showUserSubmissionDropdown, setShowUserSubmissionDropdown] = useState(false)
  const [showAppDropdown, setShowAppDropdown] = useState(false)
  const [showMainTriggerDropdown, setShowMainTriggerDropdown] = useState(false)
  const triggerDropdownRef = useRef<HTMLDivElement>(null)
  const userSubmissionDropdownRef = useRef<HTMLDivElement>(null)
  const appDropdownRef = useRef<HTMLDivElement>(null)
  const mainTriggerDropdownRef = useRef<HTMLDivElement>(null)
  const triggerButtonRef = useRef<HTMLDivElement>(null)
  const userSubmissionButtonRef = useRef<HTMLDivElement>(null)
  const appButtonRef = useRef<HTMLDivElement>(null)
  const mainTriggerButtonRef = useRef<HTMLDivElement>(null)
  
  // Check if this is a selected trigger option
  const isSelectedTrigger = isTriggerOption(nodeName) && nodeName !== 'Trigger'
  
  // Check if this is a user submission option
  const isUserSubmissionOption = ['Text Input', 'Input', 'Files', 'URL', 'Audio'].includes(nodeName)
  
  // Reset trigger view when node changes (but not when just the name changes)
  useEffect(() => {
    // Only reset if we're switching to a different node (nodeId changes)
    // Don't reset if we're just updating the name of the same node
    if (nodeName === 'Trigger') {
      setTriggerView('main')
      setShowTriggerDropdown(false)
      setShowUserSubmissionDropdown(false)
    }
  }, [nodeId, nodeName])

  // Auto-set trigger view when node name changes
  useEffect(() => {
    if (nodeName === 'User submission' && triggerView !== 'user-submission') {
      setTriggerView('user-submission')
    } else if (nodeName === 'App Trigger' && triggerView !== 'app-trigger') {
      setTriggerView('app-trigger')
    } else if (nodeName === 'Trigger' && triggerView !== 'main') {
      setTriggerView('main')
    } else if ((nodeName === 'Run on Click' || nodeName === 'Scheduled trigger') && triggerView === 'main') {
      // When switching to a final trigger option, we don't need a specific view
      // The settings will show automatically via isSelectedTrigger
      // But we should ensure the main view is hidden
    }
  }, [nodeName, triggerView])

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!showTriggerDropdown && !showUserSubmissionDropdown && !showAppDropdown && !showMainTriggerDropdown) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      
      if (showTriggerDropdown) {
        const isInsideDropdown = triggerDropdownRef.current?.contains(target)
        const isInsideButton = triggerButtonRef.current?.contains(target)
        if (!isInsideDropdown && !isInsideButton) {
          setShowTriggerDropdown(false)
        }
      }
      
      if (showUserSubmissionDropdown) {
        const isInsideDropdown = userSubmissionDropdownRef.current?.contains(target)
        const isInsideButton = userSubmissionButtonRef.current?.contains(target)
        if (!isInsideDropdown && !isInsideButton) {
          setShowUserSubmissionDropdown(false)
        }
      }
      
      if (showAppDropdown) {
        const isInsideDropdown = appDropdownRef.current?.contains(target)
        const isInsideButton = appButtonRef.current?.contains(target)
        if (!isInsideDropdown && !isInsideButton) {
          setShowAppDropdown(false)
        }
      }
      
      if (showMainTriggerDropdown) {
        const isInsideDropdown = mainTriggerDropdownRef.current?.contains(target)
        const isInsideButton = mainTriggerButtonRef.current?.contains(target)
        if (!isInsideDropdown && !isInsideButton) {
          setShowMainTriggerDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTriggerDropdown, showUserSubmissionDropdown, showAppDropdown, showMainTriggerDropdown])
  
  // Find the node data to get subactions
  const data = nodesData as NodesData
  let subactions: SubactionItem[] = []
  
  // Check if this is an app trigger (specific app, not "App Trigger")
  // This needs to be after data is defined since getAllApps() uses it
  const isAppTrigger = (() => {
    if (!data.Apps || !Array.isArray(data.Apps)) return false
    const apps: string[] = []
    data.Apps.forEach((item: NodeDataValue) => {
      const name = typeof item === 'string' ? item : item.name
      if (name) apps.push(name)
    })
    return apps.includes(nodeName)
  })()

  // If this is the Trigger node itself, show all trigger subactions
  if (nodeName === 'Trigger' && data.Inputs && Array.isArray(data.Inputs)) {
    const triggerNode = data.Inputs.find((item: NodeDataValue) => {
      if (typeof item === 'string') {
        return item === 'Trigger'
      }
      return item.name === 'Trigger'
    }) as NodeDataItem | undefined

    if (triggerNode && triggerNode.subactions) {
      subactions = triggerNode.subactions.map(sub => ({ 
        ...sub, 
        type: 'trigger' as const
      }))
    }
  } else {
    // Search for the node in Apps category to get email tools (Search Emails, Send Email)
    if (data.Apps && Array.isArray(data.Apps)) {
      const nodeData = data.Apps.find((item: NodeDataValue) => {
        if (typeof item === 'string') {
          return item === nodeName
        }
        return item.name === nodeName
      }) as NodeDataItem | undefined

      if (nodeData && nodeData.subactions) {
        subactions = nodeData.subactions.map(sub => ({ 
          ...sub, 
          type: 'action' as const,
          section: (sub as any).section,
          description: (sub as any).description
        }))
      }
    }

    // Get Gmail/Outlook from Trigger subactions (in Inputs category)
    if (data.Inputs && Array.isArray(data.Inputs)) {
      const triggerNode = data.Inputs.find((item: NodeDataValue) => {
        if (typeof item === 'string') {
          return item === 'Trigger'
        }
        return item.name === 'Trigger'
      }) as NodeDataItem | undefined

      if (triggerNode && triggerNode.subactions) {
        const emailTrigger = triggerNode.subactions.find(sub => sub.name === nodeName)
        if (emailTrigger) {
          subactions.push({ ...emailTrigger, type: 'trigger' as const })
        }
      }
    }
  }

  // Get Gmail/Outlook from Knowledge Base category
  if (data['Knowledge Base'] && Array.isArray(data['Knowledge Base'])) {
    const emailKB = data['Knowledge Base'].find((item: NodeDataValue) => {
      if (typeof item === 'string') {
        return item === nodeName || item.startsWith(nodeName)
      }
      return item.name === nodeName || item.name.startsWith(nodeName)
    })

    if (emailKB) {
      const name = typeof emailKB === 'string' ? emailKB : emailKB.name
      subactions.push({ name, type: 'knowledge-base' as const })
    }
  }

  // Get all apps for app trigger view
  const getAllApps = (): string[] => {
    if (!data.Apps || !Array.isArray(data.Apps)) return []
    
    const apps: string[] = []
    data.Apps.forEach((item: NodeDataValue) => {
      const name = typeof item === 'string' ? item : item.name
      if (name) apps.push(name)
    })
    
    // Sort by importance order
    return apps.sort((a, b) => {
      const aIndex = APP_IMPORTANCE_ORDER.indexOf(a)
      const bIndex = APP_IMPORTANCE_ORDER.indexOf(b)
      
      // If both are in the order list, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }
      // If only one is in the list, prioritize it
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      // If neither is in the list, sort alphabetically
      return a.localeCompare(b)
    })
  }

  // Handle app change from dropdown
  const handleAppChange = (newAppName: string) => {
    if (onUpdateNodeName) {
      onUpdateNodeName(nodeId, newAppName)
    }
    setShowAppDropdown(false)
  }

  // Only populate subactions for specific nodes: Trigger, Gmail, Outlook, Google Drive, Google Sheets, SharePoint, Excel
  const nodesWithSubactions = ['Trigger', 'Gmail', 'Outlook', 'Google Drive', 'Google Sheets', 'SharePoint', 'Excel']
  const shouldShowSubactions = nodesWithSubactions.includes(nodeName)
  
  // If this node shouldn't have subactions, clear them (but still show the panel)
  if (!shouldShowSubactions) {
    subactions = []
  }

  // Handle trigger option selection
  const handleTriggerOptionClick = (option: string) => {
    if (option === 'User submission') {
      if (onUpdateNodeName) {
        onUpdateNodeName(nodeId, 'User submission')
      }
      setTriggerView('user-submission')
    } else if (option === 'App Trigger') {
      if (onUpdateNodeName) {
        onUpdateNodeName(nodeId, 'App Trigger')
      }
      setTriggerView('app-trigger')
    } else if (option === 'Run on Click') {
      if (onUpdateNodeName) {
        onUpdateNodeName(nodeId, 'Run on Click')
        // Don't close - stay open to show configuration
      }
    } else if (option === 'Scheduled trigger') {
      if (onUpdateNodeName) {
        onUpdateNodeName(nodeId, 'Scheduled trigger')
        // Don't close - stay open to show configuration
      }
    }
  }

  // Handle user submission option click
  const handleUserSubmissionClick = (option: string) => {
    if (onUpdateNodeName) {
      const nameMap: { [key: string]: string } = {
        'text input': 'Text Input',
        'file': 'Files',
        'audio': 'Audio'
      }
      const newName = nameMap[option] || option
      onUpdateNodeName(nodeId, newName)
      // Don't close - stay open to show configuration
    }
  }

  // Handle app trigger selection
  const handleAppTriggerClick = (appName: string) => {
    if (onUpdateNodeName) {
      onUpdateNodeName(nodeId, appName)
      // Don't close - stay open to show configuration
    }
  }

  // Get all available trigger options for dropdown - only the 4 main options
  const getAllTriggerOptions = (): Array<{ name: string; category: string }> => {
    return [
      { name: 'User submission', category: 'User Input' },
      { name: 'App Trigger', category: 'Integration' },
      { name: 'Run on Click', category: 'Manual' },
      { name: 'Scheduled trigger', category: 'Schedule' }
    ]
  }

  // Get all user submission options for dropdown
  const getUserSubmissionOptions = (): Array<{ name: string; displayName: string }> => {
    return [
      { name: 'Text Input', displayName: 'Text input' },
      { name: 'Files', displayName: 'File' },
      { name: 'Audio', displayName: 'Audio' }
    ]
  }

  // Handle user submission option change from dropdown
  const handleUserSubmissionChange = (newOptionName: string) => {
    if (onUpdateNodeName) {
      onUpdateNodeName(nodeId, newOptionName)
    }
    setShowUserSubmissionDropdown(false)
  }

  // Handle trigger change from dropdown
  const handleTriggerChange = (newTriggerName: string) => {
    if (newTriggerName === 'User submission') {
      // Update node name to "User submission" and show submenu
      if (onUpdateNodeName) {
        onUpdateNodeName(nodeId, 'User submission')
      }
      setTriggerView('user-submission')
      setShowTriggerDropdown(false)
    } else if (newTriggerName === 'App Trigger') {
      // Update node name to "App Trigger" and show submenu
      if (onUpdateNodeName) {
        onUpdateNodeName(nodeId, 'App Trigger')
      }
      setTriggerView('app-trigger')
      setShowTriggerDropdown(false)
    } else if (onUpdateNodeName) {
      // For "Run on Click" and "Scheduled trigger", update directly
      // Don't close - stay open to show configuration
      onUpdateNodeName(nodeId, newTriggerName)
      setShowTriggerDropdown(false)
    }
  }

  // Get mock settings fields based on trigger type
  const getMockSettings = (): Setting[] => {
    if (nodeName === 'Text Input' || nodeName === 'Input') {
      return [
        { label: 'Label', type: 'text', value: 'Enter your message', placeholder: 'Field label' },
        { label: 'Placeholder', type: 'text', value: '', placeholder: 'Enter placeholder text' },
        { label: 'Required', type: 'checkbox', value: false },
        { label: 'Max length', type: 'number', value: 500, placeholder: 'Maximum characters' }
      ]
    } else if (nodeName === 'Files') {
      return [
        { label: 'Label', type: 'text', value: 'Upload files', placeholder: 'Field label' },
        { label: 'Allowed file types', type: 'text', value: 'pdf, doc, docx', placeholder: 'Comma separated' },
        { label: 'Max file size (MB)', type: 'number', value: 10, placeholder: 'Maximum file size' },
        { label: 'Multiple files', type: 'checkbox', value: true }
      ]
    } else if (nodeName === 'Audio') {
      return [
        { label: 'Label', type: 'text', value: 'Record audio', placeholder: 'Field label' },
        { label: 'Max duration (seconds)', type: 'number', value: 60, placeholder: 'Maximum recording time' },
        { label: 'Auto-transcribe', type: 'checkbox', value: false }
      ]
    } else if (nodeName === 'URL') {
      return [
        { label: 'Label', type: 'text', value: 'Enter URL', placeholder: 'Field label' },
        { label: 'Placeholder', type: 'text', value: 'https://example.com', placeholder: 'Enter placeholder URL' },
        { label: 'Required', type: 'checkbox', value: false },
        { label: 'Validate URL format', type: 'checkbox', value: true }
      ]
    } else if (nodeName === 'Run on Click') {
      return [
        { label: 'Button label', type: 'text', value: 'Run workflow', placeholder: 'Button text' },
        { label: 'Show confirmation', type: 'checkbox', value: true }
      ]
    } else if (nodeName === 'Scheduled trigger') {
      return [
        { label: 'Schedule type', type: 'select', value: 'daily', options: ['daily', 'weekly', 'monthly', 'custom'] },
        { label: 'Time', type: 'time', value: '09:00', placeholder: 'HH:MM' },
        { label: 'Timezone', type: 'select', value: 'UTC', options: ['UTC', 'EST', 'PST', 'GMT'] }
      ]
    } else if (isSelectedTrigger && getAllApps().includes(nodeName)) {
      // App trigger settings
      return [
        { label: 'Connection', type: 'select', value: 'default', options: ['default', 'custom'], placeholder: 'Select connection' },
        { label: 'Event type', type: 'select', value: 'all', options: ['all', 'new', 'updated', 'deleted'], placeholder: 'Select event' },
        { label: 'Filter', type: 'text', value: '', placeholder: 'Optional filter expression' }
      ]
    }
    return []
  }

  return (
    <>
      {/* Backdrop - click to close */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className="fixed bg-white shadow-xl w-[320px] flex flex-col z-50 rounded-lg"
        style={{
          right: '16px',
          top: '80px',
          bottom: '16px',
          maxHeight: 'calc(100vh - 96px)'
        }}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => {
          // Stop propagation to prevent canvas zoom
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          // Stop propagation to prevent canvas panning
          e.stopPropagation()
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center flex-shrink-0">
              {nodeName === 'Trigger' ? (
                <Zap className="size-4 text-gray-700" />
              ) : (
                <div className="w-4 h-4 bg-gray-100 rounded" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {isUserSubmissionOption ? (
                <div ref={mainTriggerButtonRef} className="relative">
                  <button
                    onClick={() => setShowMainTriggerDropdown(!showMainTriggerDropdown)}
                    className="flex items-center gap-1.5 hover:bg-gray-50 px-2 py-1 rounded transition-colors group"
                    type="button"
                  >
                    <h2 className="font-semibold text-gray-900 text-sm">
                      {nodeName === 'Text Input' ? 'Text input' : nodeName === 'Input' ? 'Input' : nodeName}
                    </h2>
                    <ChevronDown className={`size-3.5 text-gray-400 transition-transform ${showMainTriggerDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showMainTriggerDropdown && (
                    <div ref={mainTriggerDropdownRef} className="absolute z-10 mt-1 left-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[200px]">
                      {getAllTriggerOptions().map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleTriggerChange(option.name)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            option.name === 'User submission' ? 'bg-gray-100 text-gray-900' : 'text-gray-900'
                          } ${index === 0 ? 'rounded-t-lg' : ''} ${index === getAllTriggerOptions().length - 1 ? 'rounded-b-lg' : ''}`}
                          type="button"
                        >
                          <div className="font-medium">{option.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : isAppTrigger ? (
                <div ref={mainTriggerButtonRef} className="relative">
                  <button
                    onClick={() => setShowMainTriggerDropdown(!showMainTriggerDropdown)}
                    className="flex items-center gap-1.5 hover:bg-gray-50 px-2 py-1 rounded transition-colors group"
                    type="button"
                  >
                    <h2 className="font-semibold text-gray-900 text-sm">
                      {nodeName}
                    </h2>
                    <ChevronDown className={`size-3.5 text-gray-400 transition-transform ${showMainTriggerDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showMainTriggerDropdown && (
                    <div ref={mainTriggerDropdownRef} className="absolute z-10 mt-1 left-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[200px]">
                      {getAllTriggerOptions().map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleTriggerChange(option.name)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            option.name === 'App Trigger' ? 'bg-gray-100 text-gray-900' : 'text-gray-900'
                          } ${index === 0 ? 'rounded-t-lg' : ''} ${index === getAllTriggerOptions().length - 1 ? 'rounded-b-lg' : ''}`}
                          type="button"
                        >
                          <div className="font-medium">{option.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : isSelectedTrigger ? (
                <div ref={triggerButtonRef} className="relative">
                  <button
                    onClick={() => setShowTriggerDropdown(!showTriggerDropdown)}
                    className="flex items-center gap-1.5 hover:bg-gray-50 px-2 py-1 rounded transition-colors group"
                    type="button"
                  >
                    <h2 className="font-semibold text-gray-900 text-sm">
                      {nodeName}
                    </h2>
                    <ChevronDown className={`size-3.5 text-gray-400 transition-transform ${showTriggerDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showTriggerDropdown && (
                    <div ref={triggerDropdownRef} className="absolute z-10 mt-1 left-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[200px]">
                      {getAllTriggerOptions().map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleTriggerChange(option.name)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            option.name === nodeName ? 'bg-gray-100 text-gray-900' : 'text-gray-900'
                          } ${index === 0 ? 'rounded-t-lg' : ''} ${index === getAllTriggerOptions().length - 1 ? 'rounded-b-lg' : ''}`}
                          type="button"
                        >
                          <div className="font-medium">{option.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <h2 className="font-semibold text-gray-900 text-sm">
                  {triggerView === 'user-submission' ? 'User submission' : 
                   triggerView === 'app-trigger' ? 'App Trigger' : 
                   nodeName}
                </h2>
              )}
              {!isSelectedTrigger && !isUserSubmissionOption && !isAppTrigger && (
                <p className="text-xs text-gray-500">
                  {triggerView === 'user-submission' ? '' :
                   triggerView === 'app-trigger' ? 'Select an app integration' :
                   nodeName === 'Trigger' ? 'Select a trigger type' : 'Please select an action or trigger'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Subactions List */}
        <div 
          className="flex-1 overflow-y-auto min-h-0 p-4" 
          style={{ 
            scrollbarWidth: 'thin', 
            scrollbarColor: '#d1d5db transparent',
            WebkitOverflowScrolling: 'touch'
          }}
          onWheel={(e) => {
            // Stop propagation to prevent canvas zoom/pan
            e.stopPropagation()
          }}
          onMouseDown={(e) => {
            // Stop propagation to prevent canvas panning
            e.stopPropagation()
          }}
        >
          {/* Back button - moved here from header */}
          {triggerView !== 'main' && nodeName === 'Trigger' && (
            <button
              onClick={() => setTriggerView('main')}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-4"
              type="button"
            >
              <ChevronLeft className="size-3" />
              Back
            </button>
          )}

          {/* Back button for App Trigger view */}
          {triggerView === 'app-trigger' && (nodeName === 'Trigger' || nodeName === 'App Trigger') && (
            <button
              onClick={() => {
                setTriggerView('main')
                // If nodeName is "App Trigger", reset it back to "Trigger" to show the main 4 options
                if (nodeName === 'App Trigger' && onUpdateNodeName) {
                  onUpdateNodeName(nodeId, 'Trigger')
                }
              }}
              className="flex items-center gap-2 mb-4 text-gray-500 hover:text-gray-700 transition-colors"
              type="button"
            >
              <ChevronLeft className="size-4" />
              <span className="text-sm">Back to triggers</span>
            </button>
          )}

          {/* User submission dropdown - shown when a user submission option is selected */}
          {isUserSubmissionOption && (
            <div ref={userSubmissionButtonRef} className="relative mb-4">
              <button
                onClick={() => setShowUserSubmissionDropdown(!showUserSubmissionDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                type="button"
              >
                <span>{nodeName === 'Text Input' ? 'Text input' : nodeName === 'Input' ? 'Input' : nodeName}</span>
                <ChevronDown className={`size-4 text-gray-400 transition-transform ${showUserSubmissionDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showUserSubmissionDropdown && (
                <div ref={userSubmissionDropdownRef} className="absolute z-10 mt-1 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {getUserSubmissionOptions().map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleUserSubmissionChange(option.name)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        option.name === nodeName ? 'bg-gray-100 text-gray-900' : 'text-gray-900'
                      } ${index === 0 ? 'rounded-t-lg' : ''} ${index === getUserSubmissionOptions().length - 1 ? 'rounded-b-lg' : ''}`}
                      type="button"
                    >
                      <div className="font-medium">{option.displayName}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* App dropdown - shown when an app trigger is selected */}
          {isAppTrigger && (
            <div ref={appButtonRef} className="relative mb-4">
              <button
                onClick={() => setShowAppDropdown(!showAppDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                type="button"
              >
                <span>{nodeName}</span>
                <ChevronDown className={`size-4 text-gray-400 transition-transform ${showAppDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showAppDropdown && (
                <div ref={appDropdownRef} className="absolute z-10 mt-1 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {getAllApps().map((appName, index) => (
                    <button
                      key={index}
                      onClick={() => handleAppChange(appName)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        appName === nodeName ? 'bg-gray-100 text-gray-900' : 'text-gray-900'
                      } ${index === 0 ? 'rounded-t-lg' : ''} ${index === getAllApps().length - 1 ? 'rounded-b-lg' : ''}`}
                      type="button"
                    >
                      <div className="font-medium">{appName}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mock settings fields - shown when a trigger is selected (but not for app triggers) */}
          {isSelectedTrigger && !isAppTrigger && getMockSettings().length > 0 && (
            <div className="space-y-4">
              <div className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                Configuration
              </div>
              {getMockSettings().map((setting, index) => (
                <div key={index} className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700">
                    {setting.label}
                  </label>
                  {setting.type === 'text' && (
                    <input
                      type="text"
                      defaultValue={setting.value as string}
                      placeholder={setting.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                  {setting.type === 'number' && (
                    <input
                      type="number"
                      defaultValue={setting.value as number}
                      placeholder={setting.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                  {setting.type === 'checkbox' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={setting.value as boolean}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Enable</span>
                    </label>
                  )}
                  {setting.type === 'select' && (
                    <select
                      defaultValue={setting.value as string}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {setting.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                  {setting.type === 'time' && (
                    <input
                      type="time"
                      defaultValue={setting.value as string}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Trigger-specific views */}
          {nodeName === 'Trigger' && triggerView === 'main' && (
            <div className="space-y-1">
              <button
                onClick={() => handleTriggerOptionClick('User submission')}
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left rounded-md group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
                    <path d="M14.7067 12.8029H5.64438L12.0772 6.37013C12.5845 5.86276 12.5845 5.03725 12.0772 4.52994L10.696 3.14879C10.1886 2.64148 9.36316 2.64148 8.85579 3.14879L1.53549 10.4691C1.43799 10.5666 1.38321 10.6988 1.38321 10.8367V13.3228C1.38321 13.6099 1.61595 13.8427 1.90311 13.8427H4.15207C4.15217 13.8427 4.1523 13.8427 4.1524 13.8427H14.7067C14.9939 13.8427 15.2266 13.6099 15.2266 13.3228C15.2266 13.0357 14.9939 12.8029 14.7067 12.8029ZM9.59104 3.88405C9.69296 3.78213 9.85883 3.78213 9.96075 3.88405L11.3419 5.2652C11.4439 5.36712 11.4439 5.53299 11.3419 5.63491L10.0521 6.92471L8.30128 5.17381L9.59104 3.88405ZM2.423 11.0521L7.56602 5.90907L9.31688 7.65996L4.17393 12.8029H2.423V11.0521Z" fill="#121330"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 font-medium">User submission</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Used in interfaces like chatbot, form, etc
                  </div>
                </div>
                <ChevronRight className="size-4 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              
              <button
                onClick={() => handleTriggerOptionClick('App Trigger')}
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left rounded-md group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
                    <path d="M17.4443 17C17.4443 18.6569 16.1012 20 14.4443 20C12.7874 20 11.4443 18.6569 11.4443 17C11.4443 15.3431 12.7874 14 14.4443 14C16.1012 14 17.4443 15.3431 17.4443 17Z" stroke="black" strokeWidth="2"/>
                    <path d="M4.70307 7.13192L10.0104 11.5853L3.5 13.9549L4.70307 7.13192Z" stroke="black" strokeWidth="2"/>
                    <path d="M14.6943 3.75L20.4899 5.30291L18.9369 11.0985L13.1414 9.54556L14.6943 3.75Z" stroke="black" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 font-medium">App Trigger</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Trigger workflow from an app integration
                  </div>
                </div>
                <ChevronRight className="size-4 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              
              <button
                onClick={() => handleTriggerOptionClick('Run on Click')}
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left rounded-md"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
                    <path d="M20 12L6 3.75V20.25L20 12Z" stroke="black" strokeWidth="2" strokeLinecap="square"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 font-medium">Run on Click</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Manually trigger the workflow
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleTriggerOptionClick('Scheduled trigger')}
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left rounded-md"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-gray-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 font-medium">Scheduled trigger</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Trigger workflow on a schedule
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* User submission submenu */}
          {(nodeName === 'Trigger' || nodeName === 'User submission') && triggerView === 'user-submission' && (
            <div className="space-y-1">
              <button
                onClick={() => handleUserSubmissionClick('text input')}
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left rounded-md"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 bg-gray-100 rounded" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 font-medium">Text input</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    User can enter text input
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleUserSubmissionClick('file')}
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left rounded-md"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 bg-gray-100 rounded" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 font-medium">File</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    User can upload files
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleUserSubmissionClick('audio')}
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left rounded-md"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 bg-gray-100 rounded" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 font-medium">Audio</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    User can record audio input
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* App trigger submenu */}
          {(nodeName === 'Trigger' || nodeName === 'App Trigger') && triggerView === 'app-trigger' && (
            <div className="space-y-1">
              {getAllApps().map((appName) => (
                <button
                  key={appName}
                  onClick={() => handleAppTriggerClick(appName)}
                  className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left rounded-md"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <div className="w-4 h-4 bg-gray-100 rounded" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 font-medium">{appName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Trigger workflow from {appName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Trigger options for app triggers */}
          {isAppTrigger && (
            <div className="space-y-1">
              {subactions
                .filter(sub => sub.type === 'trigger')
                .map((subaction, index) => (
                  <button
                    key={`trigger-${index}`}
                    onClick={() => {
                      if (onUpdateNodeName) {
                        onUpdateNodeName(nodeId, subaction.name)
                      }
                    }}
                    className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left rounded-md"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <div className="w-4 h-4 bg-gray-100 rounded" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 font-medium">{subaction.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {subaction.description || `Trigger workflow from ${subaction.name}`}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* Original subactions for non-Trigger nodes (but not app triggers) */}
          {nodeName !== 'Trigger' && !isAppTrigger && (
            <>
              {/* Group actions by section if they have sections, otherwise show in default Tools section */}
              {(() => {
            const actionSubactions = subactions.filter(sub => sub.type === 'action')
            const actionsWithSections = actionSubactions.filter(sub => sub.section)
            const actionsWithoutSections = actionSubactions.filter(sub => !sub.section)
            const sections = Array.from(new Set(actionsWithSections.map(sub => sub.section).filter(Boolean)))
            
            return (
              <>
                {/* Actions with sections */}
                {sections.map(section => (
                  <div key={section} className="mb-4">
                    <div className="text-xs font-normal text-gray-500 uppercase tracking-wide mb-2">
                      {section}
                    </div>
                    {actionsWithSections
                      .filter(sub => sub.section === section)
                      .map((subaction, index) => (
                        <button
                          key={`${section}-${index}`}
                          onClick={() => {
                            // TODO: Handle subaction selection
                            console.log('Selected subaction:', subaction.name)
                          }}
                          className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left group rounded-md mb-1"
                        >
                          {/* Simple gray icon placeholder */}
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <div className="w-4 h-4 bg-gray-100 rounded" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 font-medium">{subaction.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {subaction.name === 'Search Emails' 
                                ? `Search emails using the ${nodeName} API`
                                : subaction.name === 'Send Email'
                                ? `Send an email using the ${nodeName} API`
                                : subaction.description || `Configure ${subaction.name} for ${nodeName}`}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                ))}
                
                {/* Actions without sections (default Tools section) */}
                {actionsWithoutSections.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-normal text-gray-500 uppercase tracking-wide mb-2">
                      {nodeName === 'Gmail' || nodeName === 'Outlook' ? 'Email Tools' : 'Tools'}
                    </div>
                    {actionsWithoutSections.map((subaction, index) => (
                      <button
                        key={`action-${index}`}
                        onClick={() => {
                          // TODO: Handle subaction selection
                          console.log('Selected subaction:', subaction.name)
                        }}
                        className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left group rounded-md mb-1"
                      >
                        {/* Simple gray icon placeholder */}
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <div className="w-4 h-4 bg-gray-100 rounded" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 font-medium">{subaction.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {subaction.name === 'Search Emails' 
                              ? `Search emails using the ${nodeName} API`
                              : subaction.name === 'Send Email'
                              ? `Send an email using the ${nodeName} API`
                              : subaction.description || `Configure ${subaction.name} for ${nodeName}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )
          })()}

          {/* Triggers Section (not for app triggers, they have their own section above) */}
          {!isAppTrigger && subactions.filter(sub => sub.type === 'trigger').length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-normal text-gray-500 uppercase tracking-wide mb-2">
                Triggers
              </div>
              {subactions
                .filter(sub => sub.type === 'trigger')
                .map((subaction, index) => (
                  <button
                    key={`trigger-${index}`}
                    onClick={() => {
                      // TODO: Handle subaction selection
                      console.log('Selected trigger:', subaction.name)
                    }}
                    className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left group rounded-md mb-1"
                  >
                    {/* Simple gray icon placeholder */}
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <div className="w-4 h-4 bg-gray-100 rounded" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 font-medium">{subaction.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {nodeName === 'Trigger' 
                          ? `Trigger workflow from ${subaction.name}`
                          : `Trigger ${nodeName} events`}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* Knowledge Base Section */}
          {subactions.filter(sub => sub.type === 'knowledge-base').length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-normal text-gray-500 uppercase tracking-wide mb-2">
                Knowledge Base
              </div>
              {subactions
                .filter(sub => sub.type === 'knowledge-base')
                .map((subaction, index) => (
                  <button
                    key={`kb-${index}`}
                    onClick={() => {
                      // TODO: Handle subaction selection
                      console.log('Selected knowledge base:', subaction.name)
                    }}
                    className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-50 transition-colors text-left group rounded-md mb-1"
                  >
                    {/* Simple gray icon placeholder */}
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <div className="w-4 h-4 bg-gray-100 rounded" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 font-medium">{subaction.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Search {nodeName} emails and files
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}

            </>
          )}
        </div>
      </div>
    </>
  )
}

