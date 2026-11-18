import type { ShapeElement } from '../../dsl/types'
import type { EnterState } from '../animation'
import type { Theme } from '../theme'

function starPath(r: number): Path2D {
  const path = new Path2D()
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
    const x = Math.cos(a) * radius
    const y = Math.sin(a) * radius
    if (i === 0) path.moveTo(x, y)
    else path.lineTo(x, y)
  }
  path.closePath()
  return path
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  el: ShapeElement,
  theme: Theme,
  h: number,
  enter: EnterState,
): void {
  const r = (el.size ?? 0.2) * h
  const fill = el.fill ?? (theme.iconFilled ? theme.primary : undefined)
  const stroke = el.stroke ?? theme.primary
  const isDraw = el.enter?.anim === 'draw'

  ctx.lineWidth = theme.lineWidth * (h / 1080)
  ctx.lineJoin = 'round'
  if (theme.glow) {
    ctx.shadowColor = stroke
    ctx.shadowBlur = 10
  }

  if (el.shape === 'circle') {
    ctx.beginPath()
    const sweep = isDraw ? enter.eased * Math.PI * 2 : Math.PI * 2
    ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + sweep)
    if (!isDraw) ctx.closePath()
    if (fill) {
      ctx.fillStyle = fill
      ctx.fill()
    }
    if (stroke) {
      ctx.strokeStyle = stroke
      ctx.stroke()
    }
    return
  }

  const path = el.shape === 'star' ? starPath(r) : new Path2D()
  if (el.shape === 'rect') {
    path.rect(-r, -r * 0.7, r * 2, r * 1.4)
  }

  if (isDraw) {
    const perimeter = el.shape === 'rect' ? (r * 2 + r * 1.4) * 2 : r * 12
    ctx.setLineDash([perimeter * enter.eased, perimeter])
  }
  if (fill && !isDraw) {
    ctx.fillStyle = fill
    ctx.fill(path)
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.stroke(path)
  }
  ctx.setLineDash([])
}
