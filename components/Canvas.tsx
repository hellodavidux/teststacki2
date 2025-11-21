'use client'

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react'
import InputNode from './InputNode'
import TriggerNode from './TriggerNode'
import PlaceholderNode from './PlaceholderNode'
import NodeSelector from './NodeSelector'
import ConfigurationPanel from './ConfigurationPanel'

interface Node {
  id: string
  name: string
  position: { x: number; y: number }
  type: 'input' | 'trigger' | 'placeholder'
}

interface Connection {
  from: { nodeId: string; side: 'right' }
  to: { nodeId: string; side: 'left' }
}

export interface CanvasHandle {
  addNode: (nodeName: string, position?: { x: number; y: number }) => string
}

const Canvas = forwardRef<CanvasHandle>((props, ref) => {
  const [zoom, setZoom] = useState(1)
  const [nodeSelectorOpen, setNodeSelectorOpen] = useState(false)
  const [nodeSelectorPosition, setNodeSelectorPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'trigger-node', name: 'Trigger', position: { x: 500, y: 400 }, type: 'trigger' }
  ])
  const [connections, setConnections] = useState<Connection[]>([])
  const [pendingConnection, setPendingConnection] = useState<{ nodeId: string; side: 'left' | 'right' } | null>(null)
  const [draggingConnection, setDraggingConnection] = useState<{ nodeId: string; side: 'left' | 'right'; startPos: { x: number; y: number } } | null>(null)
  const [dragMousePos, setDragMousePos] = useState<{ x: number; y: number } | null>(null)
  const [handlePositions, setHandlePositions] = useState<Record<string, { left?: { x: number; y: number }; right?: { x: number; y: number } }>>({})
  const canvasRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const nodeContainerRef = useRef<HTMLDivElement>(null)

  // Update handle positions by querying DOM
  const updateHandlePositions = useCallback(() => {
    const newPositions: Record<string, { left?: { x: number; y: number }; right?: { x: number; y: number } }> = {}
    
    nodes.forEach(node => {
      if (node.type === 'input' || node.type === 'trigger') {
        // Find input/trigger node's right handle
        const inputNode = nodeContainerRef.current?.querySelector(`[data-node-id="${node.id}"]`)
        const rightHandle = inputNode?.querySelector('button[data-handle="right"]') as HTMLElement
        if (rightHandle) {
          const rect = rightHandle.getBoundingClientRect()
          newPositions[node.id] = {
            right: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          }
        }
      } else {
        // Find placeholder node's handles
        const placeholderNode = nodeContainerRef.current?.querySelector(`[data-node-id="${node.id}"]`)
        const leftHandle = placeholderNode?.querySelector('button[data-handle="left"]') as HTMLElement
        const rightHandle = placeholderNode?.querySelector('button[data-handle="right"]') as HTMLElement
        
        if (leftHandle) {
          const rect = leftHandle.getBoundingClientRect()
          if (!newPositions[node.id]) newPositions[node.id] = {}
          newPositions[node.id].left = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        }
        if (rightHandle) {
          const rect = rightHandle.getBoundingClientRect()
          if (!newPositions[node.id]) newPositions[node.id] = {}
          newPositions[node.id].right = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        }
      }
    })
    
    setHandlePositions(newPositions)
  }, [nodes])

  // Update handle positions when nodes change or on mount
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      updateHandlePositions()
    })
    // Also update on window resize
    const handleResize = () => {
      requestAnimationFrame(() => {
        updateHandlePositions()
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [nodes, updateHandlePositions])

  // Function to center a node in the viewport
  const centerNodeInViewport = useCallback((nodeId: string) => {
    const scrollContainer = scrollContainerRef.current
    const nodeContainer = nodeContainerRef.current
    if (!scrollContainer || !nodeContainer) return

    // Find the node element by data-node-id
    const nodeElement = nodeContainer.querySelector(`[data-node-id="${nodeId}"]`)
    if (!nodeElement) {
      // If not found, try again after a short delay (node might still be rendering)
      setTimeout(() => centerNodeInViewport(nodeId), 100)
      return
    }

    // Get the bounding box of the node
    const nodeRect = nodeElement.getBoundingClientRect()
    const containerRect = scrollContainer.getBoundingClientRect()
    
    // If node has zero dimensions, it's not rendered yet
    if (nodeRect.width === 0 || nodeRect.height === 0) {
      setTimeout(() => centerNodeInViewport(nodeId), 100)
      return
    }
    
    // Calculate the node's position relative to the scroll container's content
    const nodeX = nodeRect.left - containerRect.left + scrollContainer.scrollLeft
    const nodeY = nodeRect.top - containerRect.top + scrollContainer.scrollTop
    
    // Calculate center position
    const containerWidth = scrollContainer.clientWidth
    const containerHeight = scrollContainer.clientHeight
    const nodeWidth = nodeRect.width
    const nodeHeight = nodeRect.height
    
    // Center the node in the viewport
    const scrollX = nodeX + (nodeWidth / 2) - (containerWidth / 2)
    const scrollY = nodeY + (nodeHeight / 2) - (containerHeight / 2)
    
    // Smooth scroll to center the node
    scrollContainer.scrollTo({
      left: Math.max(0, scrollX),
      top: Math.max(0, scrollY),
      behavior: 'smooth'
    })
  }, [])

  // Calculate canvas bounds based on node positions
  const canvasBounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 2000, maxY: 2000 }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    nodes.forEach(node => {
      if (node.type === 'placeholder') {
        minX = Math.min(minX, node.position.x)
        minY = Math.min(minY, node.position.y)
        maxX = Math.max(maxX, node.position.x + 320) // Node width is ~320px
        maxY = Math.max(maxY, node.position.y + 200) // Approximate node height
      } else if (node.type === 'input' || node.type === 'trigger') {
        // Input/Trigger node - try to get position from DOM, otherwise use stored position
        if (nodeContainerRef.current) {
          const inputNodeElement = nodeContainerRef.current.querySelector(`[data-node-id="${node.id}"]`)
          if (inputNodeElement) {
            const computedStyle = window.getComputedStyle(inputNodeElement)
            const transform = computedStyle.transform
            if (transform && transform !== 'none') {
              const matrix = new DOMMatrix(transform)
              const inputX = matrix.e
              const inputY = matrix.f
              minX = Math.min(minX, inputX)
              minY = Math.min(minY, inputY)
              maxX = Math.max(maxX, inputX + 320)
              maxY = Math.max(maxY, inputY + 200)
            } else {
              // Fallback to stored position
              minX = Math.min(minX, node.position.x)
              minY = Math.min(minY, node.position.y)
              maxX = Math.max(maxX, node.position.x + 320)
              maxY = Math.max(maxY, node.position.y + 200)
            }
          } else {
            // Fallback to stored position
            minX = Math.min(minX, node.position.x)
            minY = Math.min(minY, node.position.y)
            maxX = Math.max(maxX, node.position.x + 320)
            maxY = Math.max(maxY, node.position.y + 200)
          }
        } else {
          // Fallback to stored position
          minX = Math.min(minX, node.position.x)
          minY = Math.min(minY, node.position.y)
          maxX = Math.max(maxX, node.position.x + 320)
          maxY = Math.max(maxY, node.position.y + 200)
        }
      }
    })

    // If no valid bounds found, use defaults
    if (minX === Infinity) {
      return { minX: 0, minY: 0, maxX: 2000, maxY: 2000 }
    }

    // Add padding around nodes (viewport size worth of padding)
    const padding = 2000
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    }
  }, [nodes])

  // Calculate canvas dimensions
  const canvasWidth = useMemo(() => {
    return Math.max(4000, canvasBounds.maxX - canvasBounds.minX)
  }, [canvasBounds])

  const canvasHeight = useMemo(() => {
    return Math.max(4000, canvasBounds.maxY - canvasBounds.minY)
  }, [canvasBounds])

  // Center the trigger node on initial load
  useEffect(() => {
    // Use setTimeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      centerNodeInViewport('trigger-node')
    }, 100)
    return () => clearTimeout(timer)
  }, [centerNodeInViewport])

  // Function to add a node to the canvas
  const addNodeToCanvas = useCallback((nodeName: string, position?: { x: number; y: number }) => {
    const newNodeId = `node-${Date.now()}`
    
    // Determine node type based on name
    const isTrigger = nodeName === 'Trigger' || 
                     nodeName === 'User input' || 
                     nodeName === 'App Trigger' || 
                     nodeName === 'Run on Click' || 
                     nodeName === 'Scheduled trigger'
    const nodeType: 'input' | 'trigger' | 'placeholder' = isTrigger ? 'trigger' : 'placeholder'
    
    // Position with vertical spacing from existing nodes
    let nodePosition: { x: number; y: number }
    if (position) {
      nodePosition = position
    } else {
      // Get the scroll container
      const scrollContainer = scrollContainerRef.current
      if (scrollContainer) {
        // Get visible viewport dimensions
        const viewportWidth = scrollContainer.clientWidth
        const viewportHeight = scrollContainer.clientHeight
        
        // Calculate center of visible viewport in canvas coordinates
        const centerX = (scrollContainer.scrollLeft + viewportWidth / 2) / zoom
        const centerY = (scrollContainer.scrollTop + viewportHeight / 2) / zoom
        
        // Node dimensions (approximate)
        const nodeHeight = 200
        const verticalSpacing = 50 // Vertical gap between nodes
        
        // Find the bottom-most node position
        let bottomMostY = -Infinity
        let bottomMostX = centerX
        
        // Check all existing nodes
        nodes.forEach(node => {
          let nodeX = node.position.x
          let nodeY = node.position.y
          
          // For trigger/input nodes, get their actual DOM position
          if ((node.type === 'trigger' || node.type === 'input') && nodeContainerRef.current) {
            const nodeElement = nodeContainerRef.current.querySelector(`[data-node-id="${node.id}"]`)
            if (nodeElement) {
              const computedStyle = window.getComputedStyle(nodeElement)
              const transform = computedStyle.transform
              if (transform && transform !== 'none') {
                const matrix = new DOMMatrix(transform)
                nodeX = matrix.e
                nodeY = matrix.f
              }
            }
          }
          
          // Calculate bottom of this node
          const nodeBottom = nodeY + nodeHeight
          
          // Check if this node is visible in viewport (rough check)
          const nodeScreenX = (nodeX * zoom) - scrollContainer.scrollLeft
          const nodeScreenY = (nodeY * zoom) - scrollContainer.scrollTop
          
          // If node is roughly in viewport and lower than current bottom-most
          if (nodeScreenY >= -200 && nodeScreenY <= viewportHeight + 200 && 
              nodeScreenX >= -200 && nodeScreenX <= viewportWidth + 200) {
            if (nodeBottom > bottomMostY) {
              bottomMostY = nodeBottom
              bottomMostX = nodeX // Use same X as the bottom-most node for alignment
            }
          }
        })
        
        // Position new node
        if (bottomMostY > -Infinity) {
          // Position below the bottom-most node with vertical spacing
          nodePosition = {
            x: bottomMostX,
            y: bottomMostY + verticalSpacing
          }
        } else {
          // No existing nodes in viewport, center in viewport
          nodePosition = {
            x: centerX - 160, // Half node width
            y: centerY - 100   // Half node height
          }
        }
      } else {
        // Fallback: use a safe default position
        nodePosition = { x: 500, y: 400 }
      }
    }
    
    const newNode: Node = {
      id: newNodeId,
      name: nodeName,
      position: nodePosition,
      type: nodeType
    }
    
    setNodes(prev => [...prev, newNode])
    
    // After node is added and rendered, center it in viewport
    requestAnimationFrame(() => {
      updateHandlePositions()
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        centerNodeInViewport(newNodeId)
        // Automatically open configuration panel for the newly added node
        setSelectedNodeId(newNodeId)
      }, 50)
    })
    
    return newNodeId
  }, [zoom, updateHandlePositions, centerNodeInViewport])

  // Expose addNode function via ref
  useImperativeHandle(ref, () => ({
    addNode: addNodeToCanvas
  }), [addNodeToCanvas])

  useEffect(() => {
    const canvas = canvasRef.current
    const scrollContainer = scrollContainerRef.current
    if (!canvas || !scrollContainer) return

    const handleWheel = (e: WheelEvent) => {
      // Only handle wheel events within the canvas
      if (!e.target || !(e.target instanceof Element)) return
      const target = e.target as HTMLElement
      if (!canvas.contains(target)) return
      
      // Don't handle wheel events if they're inside the NodeSelector
      if (target.closest('.fixed.bg-white.rounded-lg.shadow-xl')) return
      
      // Prevent default browser zoom and scrolling
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      
      // Check if ctrl/cmd is pressed for pinch-to-zoom (2-finger zoom)
      if (e.ctrlKey || e.metaKey) {
        // Zoom behavior (2-finger pinch on trackpad)
        const delta = e.deltaY * -0.01
        setZoom((prevZoom) => {
          const newZoom = Math.min(Math.max(0.5, prevZoom + delta), 3)
          return newZoom
        })
      } else {
        // Pan behavior (2-finger scroll on trackpad)
        scrollContainer.scrollLeft += e.deltaX
        scrollContainer.scrollTop += e.deltaY
      }
    }

    // Use capture phase to catch events before they bubble
    canvas.addEventListener('wheel', handleWheel, { passive: false, capture: true })

    return () => {
      canvas.removeEventListener('wheel', handleWheel, { capture: true })
    }
  }, [])

  // Handle connection dragging
  useEffect(() => {
    if (!draggingConnection) return

    const handleMouseMove = (e: MouseEvent) => {
      setDragMousePos({ x: e.clientX, y: e.clientY })
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (draggingConnection) {
        // Open node selector at mouse position
        const selectorWidth = 320
        const selectorHeight = 480
        const padding = 8
        
        let x = e.clientX + padding
        let y = e.clientY - selectorHeight / 2
        
        // Adjust if off screen
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        if (x + selectorWidth > viewportWidth) {
          x = e.clientX - selectorWidth - padding
          if (x < 0) x = padding
        }
        
        if (y + selectorHeight > viewportHeight) {
          y = viewportHeight - selectorHeight - padding
        }
        
        if (y < padding) {
          y = padding
        }
        
        setPendingConnection({ nodeId: draggingConnection.nodeId, side: draggingConnection.side })
        setNodeSelectorPosition({ x, y })
        setNodeSelectorOpen(true)
      }
      
      setDraggingConnection(null)
      setDragMousePos(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingConnection])

  // Handle left-click panning
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    const canvas = canvasRef.current
    if (!scrollContainer || !canvas) return

    let panning = false
    let startX = 0
    let startY = 0

    const handleMouseDown = (e: MouseEvent) => {
      // Handle left mouse button (button 0) and middle mouse button (button 1)
      if (e.button !== 0 && e.button !== 1) return
      
      // Don't pan if we're dragging a connection
      if (draggingConnection) return
      
      // Only handle if within canvas
      if (!e.target) return
      const target = e.target as HTMLElement
      if (!canvas.contains(target)) return
      
      // Don't start panning if clicking on interactive elements or nodes
      if (target.closest('button, textarea, input, [data-node]')) return
      
      // Check if clicking on a node (nodes have specific classes or structure)
      // Don't pan if clicking directly on node content
      if (target.closest('.bg-white.rounded-xl')) return
      
      // Don't pan if clicking inside the NodeSelector or ConfigurationPanel
      if (target.closest('.fixed.bg-white.rounded-lg.shadow-xl')) return
      if (target.closest('.fixed.right-0')) return

      e.preventDefault()
      e.stopPropagation()
      
      // Deselect any selected node when clicking on canvas
      setSelectedNodeId(null)
      
      panning = true
      setIsPanning(true)
      startX = e.clientX + scrollContainer.scrollLeft
      startY = e.clientY + scrollContainer.scrollTop
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!panning || draggingConnection) return
      
      e.preventDefault()
      e.stopPropagation()
      scrollContainer.scrollLeft = startX - e.clientX
      scrollContainer.scrollTop = startY - e.clientY
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (panning) {
        e.preventDefault()
        e.stopPropagation()
      }
      panning = false
      setIsPanning(false)
    }

    // Add listeners to document to catch all events
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingConnection])

  return (
    <div 
      ref={canvasRef}
      data-canvas-container
      className="flex-grow overflow-hidden relative"
      style={{ 
        isolation: 'isolate',
        contain: 'layout style paint',
        transform: 'translateZ(0)', // Create new stacking context
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        // Get the node name from dataTransfer if available
        const nodeName = e.dataTransfer.getData('text/plain')
        if (nodeName && scrollContainerRef.current) {
          // Calculate position relative to scroll container and zoom
          const scrollContainer = scrollContainerRef.current
          const rect = scrollContainer.getBoundingClientRect()
          const scrollX = scrollContainer.scrollLeft
          const scrollY = scrollContainer.scrollTop
          
          // Calculate position in canvas coordinates (accounting for zoom)
          const x = (e.clientX - rect.left + scrollX) / zoom - 160
          const y = (e.clientY - rect.top + scrollY) / zoom - 100
          
          addNodeToCanvas(nodeName, { x, y })
        }
      }}
    >
      <div 
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-auto"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          transform: 'translateZ(0)', // Isolate transforms
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          // Get the node name from dataTransfer if available
          const nodeName = e.dataTransfer.getData('text/plain')
          if (nodeName && scrollContainerRef.current) {
            // Calculate position relative to scroll container and zoom
            const scrollContainer = scrollContainerRef.current
            const rect = scrollContainer.getBoundingClientRect()
            const scrollX = scrollContainer.scrollLeft
            const scrollY = scrollContainer.scrollTop
            
            // Calculate position in canvas coordinates (accounting for zoom)
            const x = (e.clientX - rect.left + scrollX) / zoom - 160
            const y = (e.clientY - rect.top + scrollY) / zoom - 100
            
            addNodeToCanvas(nodeName, { x, y })
          }
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            left: 0,
            width: '200%',
            height: '200%',
            backgroundImage: `
              radial-gradient(circle, #d1d5db 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: '0 0',
            willChange: 'background-size',
          }}
        />
        <div 
          className="absolute flex items-center justify-center"
          style={{
            minWidth: '200%',
            minHeight: '200%',
            width: '200%',
            height: '200%',
            transform: `scale(${zoom}) translateZ(0)`,
            transformOrigin: 'center center',
            willChange: 'transform',
            contain: 'layout style paint',
          }}
        >
          <div 
            ref={nodeContainerRef}
            className="relative" 
            style={{ transform: 'translate(20%, 0)' }}
          >
            {nodes.map((node) => {
              if (node.type === 'input') {
                return (
                  <InputNode
                    key={node.id}
                    id={node.id}
                    onHandleDragStart={(position) => {
                      setDraggingConnection({ nodeId: node.id, side: 'right', startPos: position })
                      setDragMousePos(position)
                    }}
                    onDelete={(id) => {
                      setNodes(prev => prev.filter(n => n.id !== id))
                      setConnections(prev => prev.filter(c => c.from.nodeId !== id && c.to.nodeId !== id))
                      if (selectedNodeId === id) {
                        setSelectedNodeId(null)
                      }
                    }}
                  />
                )
              } else if (node.type === 'trigger') {
                return (
                  <TriggerNode
                    key={`${node.id}-${node.name}`}
                    id={node.id}
                    name={node.name}
                    onHandleDragStart={(position) => {
                      setDraggingConnection({ nodeId: node.id, side: 'right', startPos: position })
                      setDragMousePos(position)
                    }}
                    onSelect={(id) => {
                      setSelectedNodeId(id)
                    }}
                    onDelete={(id) => {
                      setNodes(prev => prev.filter(n => n.id !== id))
                      setConnections(prev => prev.filter(c => c.from.nodeId !== id && c.to.nodeId !== id))
                      if (selectedNodeId === id) {
                        setSelectedNodeId(null)
                      }
                    }}
                  />
                )
              } else {
                return (
                  <PlaceholderNode
                    key={node.id}
                    id={node.id}
                    name={node.name}
                    position={node.position}
                    onPositionChange={(id, newPosition) => {
                      setNodes(prev => prev.map(n => n.id === id ? { ...n, position: newPosition } : n))
                      // Update handle positions after position change
                      requestAnimationFrame(() => {
                        updateHandlePositions()
                      })
                    }}
                    onHandleDragStart={(id, side, position) => {
                      setDraggingConnection({ nodeId: id, side, startPos: position })
                      setDragMousePos(position)
                    }}
                    onSelect={(id) => {
                      setSelectedNodeId(id)
                    }}
                    onDelete={(id) => {
                      setNodes(prev => prev.filter(n => n.id !== id))
                      setConnections(prev => prev.filter(c => c.from.nodeId !== id && c.to.nodeId !== id))
                      if (selectedNodeId === id) {
                        setSelectedNodeId(null)
                      }
                    }}
                  />
                )
              }
            })}
          </div>
        </div>
      </div>

      {/* Connection Lines */}
      <svg
        className="fixed inset-0 pointer-events-none z-30"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Existing connections */}
        {connections.map((conn, index) => {
          const fromPos = handlePositions[conn.from.nodeId]?.right
          const toPos = handlePositions[conn.to.nodeId]?.left
          
          if (!fromPos || !toPos) return null
          
          return (
            <line
              key={index}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke="#d1d5db"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
          )
        })}
        
        {/* Dragging connection arrow */}
        {draggingConnection && dragMousePos && (() => {
          const startPos = draggingConnection.startPos
          const endPos = dragMousePos
          
          // Calculate arrow direction
          const dx = endPos.x - startPos.x
          const dy = endPos.y - startPos.y
          const angle = Math.atan2(dy, dx)
          
          // Arrow head size
          const arrowSize = 10
          const arrowAngle = Math.PI / 6 // 30 degrees
          
          // Calculate arrow head points
          const arrowX1 = endPos.x - arrowSize * Math.cos(angle - arrowAngle)
          const arrowY1 = endPos.y - arrowSize * Math.sin(angle - arrowAngle)
          const arrowX2 = endPos.x - arrowSize * Math.cos(angle + arrowAngle)
          const arrowY2 = endPos.y - arrowSize * Math.sin(angle + arrowAngle)
          
          return (
            <g>
              {/* Main line */}
              <line
                x1={startPos.x}
                y1={startPos.y}
                x2={endPos.x}
                y2={endPos.y}
                stroke="#d1d5db"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              {/* Arrow head */}
              <polygon
                points={`${endPos.x},${endPos.y} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
                fill="#d1d5db"
                opacity="0.4"
              />
            </g>
          )
        })()}
        
      </svg>

      {/* Dragging placeholder - follows cursor */}
      {draggingConnection && dragMousePos && !nodeSelectorOpen && (
        <div
          className="fixed pointer-events-none z-40"
          style={{
            left: `${dragMousePos.x - 40}px`, // Center the 80px square on cursor
            top: `${dragMousePos.y - 40}px`,
            width: '80px',
            height: '80px',
            backgroundColor: 'rgba(156, 163, 175, 0.2)', // gray-400 with low opacity
            border: '1px dashed rgba(156, 163, 175, 0.4)',
            borderRadius: '8px',
            transition: 'none' // No transition for smooth following
          }}
        />
      )}

      {/* Configuration Panel - shown when any node is selected */}
      {selectedNodeId && (() => {
        const selectedNode = nodes.find(n => n.id === selectedNodeId)
        if (selectedNode) {
          return (
            <ConfigurationPanel
              nodeName={selectedNode.name}
              nodeId={selectedNode.id}
              onClose={() => setSelectedNodeId(null)}
              onUpdateNodeName={(nodeId, newName) => {
                setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, name: newName } : n))
              }}
            />
          )
        }
        return null
      })()}

      {/* Node Selector - managed at canvas level */}
      <NodeSelector
        isOpen={nodeSelectorOpen}
        onClose={() => {
          setNodeSelectorOpen(false)
          setPendingConnection(null)
        }}
        onSelectNode={(nodeId, nodeName) => {
          if (pendingConnection) {
            // Find the source node to position new node relative to it
            const sourceNode = nodes.find(n => n.id === pendingConnection.nodeId)
            const offsetX = pendingConnection.side === 'right' ? 350 : -350
            
            // Get the actual DOM position of the source node for accurate horizontal alignment
            let sourcePosition = sourceNode?.position || { x: 300, y: 0 }
            
            // If source node exists, try to get its actual visual position from the DOM
            // This is important because InputNode/TriggerNode has its own position state that may differ from Canvas state
            if (sourceNode && (sourceNode.type === 'input' || sourceNode.type === 'trigger') && nodeContainerRef.current && scrollContainerRef.current) {
              const sourceNodeElement = nodeContainerRef.current.querySelector(`[data-node-id="${sourceNode.id}"]`)
              if (sourceNodeElement) {
                // Get the computed transform to extract the actual translate values
                const computedStyle = window.getComputedStyle(sourceNodeElement)
                const transform = computedStyle.transform
                
                if (transform && transform !== 'none') {
                  // Parse the transform matrix to get translate values
                  const matrix = new DOMMatrix(transform)
                  // The node's position in the transformed coordinate space
                  sourcePosition = {
                    x: matrix.e, // translateX
                    y: matrix.f  // translateY
                  }
                }
              }
            }
            
            // Create new placeholder node - horizontally aligned (same Y coordinate, no vertical offset)
            const newNodeId = `node-${Date.now()}`
            const newNode: Node = {
              id: newNodeId,
              name: nodeName,
              position: { 
                x: sourcePosition.x + offsetX, 
                y: sourcePosition.y // Exact same Y - ensures horizontal alignment
              },
              type: 'placeholder'
            }
            
            setNodes(prev => [...prev, newNode])
            
            // Create connection
            if (pendingConnection.side === 'right') {
              setConnections(prev => [...prev, {
                from: { nodeId: pendingConnection.nodeId, side: 'right' },
                to: { nodeId: newNodeId, side: 'left' }
              }])
            } else {
              setConnections(prev => [...prev, {
                from: { nodeId: newNodeId, side: 'right' },
                to: { nodeId: pendingConnection.nodeId, side: 'left' }
              }])
            }
            
            setPendingConnection(null)
            
            // Update handle positions after adding new node
            requestAnimationFrame(() => {
              updateHandlePositions()
              // Center the newly added node in the viewport
              requestAnimationFrame(() => {
                centerNodeInViewport(newNodeId)
                // Automatically open configuration panel for the newly added node
                setSelectedNodeId(newNodeId)
              })
            })
          } else {
            // No pending connection - just add the node and open config panel
            addNodeToCanvas(nodeName)
          }
          setNodeSelectorOpen(false)
        }}
        position={nodeSelectorPosition}
      />
    </div>
  )
})

Canvas.displayName = 'Canvas'

export default Canvas

