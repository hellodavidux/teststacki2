'use client'

import { Pencil, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface InputNodeProps {
  id?: string
  onHandleDragStart?: (position: { x: number; y: number }) => void
  onDelete?: (id: string) => void
}

export default function InputNode({ id = 'input-node', onHandleDragStart, onDelete }: InputNodeProps) {
  const [inputValue, setInputValue] = useState('')
  const [isHovered, setIsHovered] = useState(false)
  const [isAddHovered, setIsAddHovered] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showMenu, setShowMenu] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleNodeMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, textarea')) {
      return
    }
    const startX = e.clientX - position.x
    const startY = e.clientY - position.y
    setIsDragging(true)
    setDragStart({ x: startX, y: startY })
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

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

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
            <Pencil className="size-4 text-gray-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Input</h3>
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

        {/* Textarea */}
        <div className="mt-4">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full min-h-[60px] p-3 bg-gray-100 border-0 rounded-lg resize focus:outline-none text-sm text-gray-900 placeholder:text-gray-400"
            placeholder=""
          />
        </div>
      </div>

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

