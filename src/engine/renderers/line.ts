import type { LineElement } from '../../dsl/types'
import type { EnterState } from '../animation'
import type { Theme } from '../theme'

export function drawLine(
  ctx: CanvasRenderingContext2D,
  el: LineElement,
  theme: Theme,
  w: number,
  h: number,
  enter: EnterState,
): void {
  const points = el.points.map(([x, y]) => [x * w, y * h] as const)
  const path = new Path2D()
  points.forEach(([x, y], i) => {
    if (i === 0) path.moveTo(x, y)
    else path.lineTo(x, y)
  })

  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  }

  ctx.strokeStyle = el.stroke ?? theme.primary
  ctx.lineWidth = theme.lineWidth * (h / 1080)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (theme.glow) {
    ctx.shadowColor = ctx.strokeStyle
    ctx.shadowBlur = 10
  }

  if (el.enter?.anim === 'draw') {
    ctx.setLineDash([total * enter.eased, total])
  }
  ctx.stroke(path)
  ctx.setLineDash([])

  if (el.arrow && enter.progress > 0.9 && points.length >= 2) {
    const [x2, y2] = points[points.length - 1]
    const [x1, y1] = points[points.length - 2]
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const size = 14 * (h / 1080)
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - size * Math.cos(angle - 0.45), y2 - size * Math.sin(angle - 0.45))
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - size * Math.cos(angle + 0.45), y2 - size * Math.sin(angle + 0.45))
    ctx.stroke()
  }
}
