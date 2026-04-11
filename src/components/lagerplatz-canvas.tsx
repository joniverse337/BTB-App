'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { Stroke } from '@/lib/validations/storage-location'

// Internal canvas resolution (independent of rendered size)
const CANVAS_SIZE = 560

interface LagerplatzCanvasProps {
  screenshotDataUrl: string
  strokes: Stroke[]
  isDrawing: boolean
  penColor: string
  penWidth: number
  onStrokeComplete: (stroke: Stroke) => void
  onCompositeUpdate: (dataUrl: string) => void
  onRetake: () => void
}

export function LagerplatzCanvas({
  screenshotDataUrl,
  strokes,
  isDrawing,
  penColor,
  penWidth,
  onStrokeComplete,
  onCompositeUpdate,
  onRetake,
}: LagerplatzCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([])
  const [isPointerDown, setIsPointerDown] = useState(false)

  // Load screenshot image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      redraw()
    }
    img.src = screenshotDataUrl
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenshotDataUrl])

  // Redraw canvas whenever strokes change
  useEffect(() => {
    redraw()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
    }

    for (const stroke of strokes) {
      drawStroke(ctx, stroke)
    }

    const dataUrl = canvas.toDataURL('image/png')
    onCompositeUpdate(dataUrl)
  }, [strokes, onCompositeUpdate])

  // Draw current stroke in progress
  useEffect(() => {
    if (!isPointerDown || currentPoints.length < 2) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
    }
    for (const stroke of strokes) {
      drawStroke(ctx, stroke)
    }
    drawStroke(ctx, { color: penColor, width: penWidth, points: currentPoints })
  }, [currentPoints, isPointerDown, strokes, penColor, penWidth])

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return
    ctx.beginPath()
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    ctx.stroke()
  }

  // Scale pointer position to internal canvas resolution
  const getPos = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    setIsPointerDown(true)
    const pos = getPos(e)
    setCurrentPoints([pos])
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown || !isDrawing) return
    e.preventDefault()
    const pos = getPos(e)
    setCurrentPoints((prev) => [...prev, pos])
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDown || !isDrawing) return
    e.preventDefault()
    setIsPointerDown(false)

    if (currentPoints.length >= 2) {
      const stroke: Stroke = {
        color: penColor,
        width: penWidth,
        points: currentPoints,
      }
      onStrokeComplete(stroke)
    }
    setCurrentPoints([])
  }

  return (
    <div className="relative w-full" style={{ height: '640px' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className={`w-full h-full rounded-b-lg border border-border ${isDrawing ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{ display: 'block' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  )
}
