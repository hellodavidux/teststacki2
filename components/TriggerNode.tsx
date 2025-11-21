'use client'

import { Zap, MoreVertical, Plus, Clock, Pencil, FileText, Mic, Trash2, Play } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface TriggerNodeProps {
  id?: string
  name?: string
  onHandleDragStart?: (position: { x: number; y: number }) => void
  onSelect?: (id: string) => void
  onDelete?: (id: string) => void
}

// Helper function to get icon based on node name
const getTriggerIcon = (name: string) => {
  // User submission options
  if (name === 'Text Input' || name === 'Input') {
    return (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
        <path d="M14.7067 12.8029H5.64438L12.0772 6.37013C12.5845 5.86276 12.5845 5.03725 12.0772 4.52994L10.696 3.14879C10.1886 2.64148 9.36316 2.64148 8.85579 3.14879L1.53549 10.4691C1.43799 10.5666 1.38321 10.6988 1.38321 10.8367V13.3228C1.38321 13.6099 1.61595 13.8427 1.90311 13.8427H4.15207C4.15217 13.8427 4.1523 13.8427 4.1524 13.8427H14.7067C14.9939 13.8427 15.2266 13.6099 15.2266 13.3228C15.2266 13.0357 14.9939 12.8029 14.7067 12.8029ZM9.59104 3.88405C9.69296 3.78213 9.85883 3.78213 9.96075 3.88405L11.3419 5.2652C11.4439 5.36712 11.4439 5.53299 11.3419 5.63491L10.0521 6.92471L8.30128 5.17381L9.59104 3.88405ZM2.423 11.0521L7.56602 5.90907L9.31688 7.65996L4.17393 12.8029H2.423V11.0521Z" fill="#121330"/>
      </svg>
    )
  }
  if (name === 'Files' || name === 'File') {
    return <FileText className="size-4 text-gray-700" />
  }
  if (name === 'Audio') {
    return <Mic className="size-4 text-gray-700" />
  }
  
  // Run on Click
  if (name === 'Run on Click') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
        <path d="M20 12L6 3.75V20.25L20 12Z" stroke="#121330" strokeWidth="2" strokeLinecap="square"/>
      </svg>
    )
  }
  
  // Scheduled trigger
  if (name === 'Scheduled trigger') {
    return <Clock className="size-4 text-gray-700" />
  }
  
  // App triggers - use the app icon placeholder
  // Check if it's a known app name (not one of the main trigger options)
  const mainTriggerOptions = ['Trigger', 'User submission', 'App Trigger', 'Run on Click', 'Scheduled trigger']
  if (name && !mainTriggerOptions.includes(name)) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
        <path d="M17.4443 17C17.4443 18.6569 16.1012 20 14.4443 20C12.7874 20 11.4443 18.6569 11.4443 17C11.4443 15.3431 12.7874 14 14.4443 14C16.1012 14 17.4443 15.3431 17.4443 17Z" stroke="#121330" strokeWidth="2"/>
        <path d="M4.70307 7.13192L10.0104 11.5853L3.5 13.9549L4.70307 7.13192Z" stroke="#121330" strokeWidth="2"/>
        <path d="M14.6943 3.75L20.4899 5.30291L18.9369 11.0985L13.1414 9.54556L14.6943 3.75Z" stroke="#121330" strokeWidth="2"/>
      </svg>
    )
  }
  
  // Default trigger icon
  return <Zap className="size-4 text-gray-700" />
}

export default function TriggerNode({ id = 'trigger-node', name = 'Trigger', onHandleDragStart, onSelect, onDelete }: TriggerNodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isAddHovered, setIsAddHovered] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleNodeMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    const startX = e.clientX - position.x
    const startY = e.clientY - position.y
    setIsDragging(true)
    setDragStart({ x: startX, y: startY })
    setMouseDownPos({ x: e.clientX, y: e.clientY })
  }

  const handleAddButtonMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (addButtonRef.current && onHandleDragStart) {
      const rect = addButtonRef.current.getBoundingClientRect()
      const handleCenterX = rect.left + rect.width / 2
      const handleCenterY = rect.top + rect.height / 2
      onHandleDragStart({ x: handleCenterX, y: handleCenterY })
    }
  }

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      // Check if this was a click (not a drag) - if mouse moved less than 5px, treat as click
      if (mouseDownPos && onSelect) {
        const deltaX = Math.abs(e.clientX - mouseDownPos.x)
        const deltaY = Math.abs(e.clientY - mouseDownPos.y)
        if (deltaX < 5 && deltaY < 5) {
          // It was a click, not a drag - select the node
          onSelect(id)
        }
      }
      setIsDragging(false)
      setMouseDownPos(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart, id, mouseDownPos, onSelect])

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && 
          nodeRef.current && !nodeRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const handleDelete = () => {
    if (onDelete && id) {
      onDelete(id)
      setShowMenu(false)
    }
  }

  return (
    <div 
      ref={nodeRef}
      data-node-id={id}
      className="relative group cursor-move"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleNodeMouseDown}
    >
      <div className={`bg-white rounded-xl p-5 w-80 relative transition-all duration-200 ${
        isHovered ? 'shadow-lg' : 'shadow-md'
      }`}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center flex-shrink-0">
            {getTriggerIcon(name)}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{name}</h3>
          </div>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              type="button"
            >
              <MoreVertical className="size-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left rounded-lg"
                  type="button"
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="mt-4">
          <div className="w-full min-h-[60px] p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <span className="text-sm text-gray-400">Configure trigger</span>
          </div>
        </div>

        {/* Design Interface Button - shown for "Text Input", "Input", "Files", and "Audio" */}
        {(name === 'Text Input' || name === 'Input' || name === 'Files' || name === 'Audio') && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Handle design interface action
              console.log('Design interface clicked')
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-sm font-medium rounded-lg shadow-sm transition-colors"
            type="button"
          >
            Design interface
          </button>
        )}
      </div>

      {/* Run Button - positioned outside the node at the bottom, shown only for "Run on Click" */}
      {name === 'Run on Click' && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            // TODO: Handle run action
            console.log('Run workflow clicked')
          }}
          className="absolute top-full left-0 mt-3 flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-sm font-medium rounded-lg shadow-sm transition-colors"
          type="button"
        >
          <Play className="size-3.5 text-gray-700" />
          Run
        </button>
      )}

      {/* Add Button - positioned outside the node */}
      <button
        ref={addButtonRef}
        data-handle="right"
        className={`absolute left-full top-1/2 -translate-y-1/2 ml-3 rounded-lg shadow-sm flex items-center justify-center transition-all duration-200 z-10 cursor-pointer ${
          isAddHovered 
            ? 'w-8 h-8 bg-black text-white scale-110 shadow-lg' 
            : isHovered
            ? 'w-7 h-7 bg-white text-gray-700 border border-gray-200'
            : 'w-5 h-5 bg-transparent text-gray-400 border border-gray-300'
        }`}
        onMouseEnter={() => setIsAddHovered(true)}
        onMouseLeave={() => setIsAddHovered(false)}
        onMouseDown={handleAddButtonMouseDown}
      >
        <Plus className={isHovered || isAddHovered ? "size-4" : "size-3"} />
      </button>
    </div>
  )
}

