import type { ChartElement } from '../../dsl/types'
import type { EnterState } from '../animation'
import type { Theme } from '../theme'

export function drawChart(
  ctx: CanvasRenderingContext2D,
  el: ChartElement,
  theme: Theme,
  h: number,
  enter: EnterState,
): void {
  const size = (el.size ?? 0.5) * h
  const data = el.data
  if (!data.length) return

  const max = Math.max(...data, 1)
  const colors = [theme.primary, theme.secondary, theme.accent, theme.textSoft]
  const grow = el.enter?.anim === 'grow' || el.enter?.anim === 'draw' ? enter.eased : 1

  if (el.chart === 'bar') {
    const slot = size / data.length
    const barWidth = slot * 0.55
    data.forEach((v, i) => {
      const barHeight = (v / max) * size * grow
      const x = -size / 2 + i * slot + (slot - barWidth) / 2
      ctx.fillStyle = colors[i % colors.length]
      ctx.fillRect(x, size / 2 - barHeight, barWidth, barHeight)
    })
    return
  }

  if (el.chart === 'line') {
    const path = new Path2D()
    data.forEach((v, i) => {
      const x = -size / 2 + (i / (data.length - 1 || 1)) * size
      const y = size / 2 - (v / max) * size
      if (i === 0) path.moveTo(x, y)
      else path.lineTo(x, y)
    })
    ctx.strokeStyle = theme.primary
    ctx.lineWidth = theme.lineWidth * (h / 1080)
    ctx.lineJoin = 'round'
    ctx.setLineDash([size * 1.5 * grow, size * 1.5])
    ctx.stroke(path)
    ctx.setLineDash([])
    return
  }

  let angle = -Math.PI / 2
  const total = data.reduce((a, b) => a + b, 0) || 1
  const sweepLimit = Math.PI * 2 * grow
  let swept = 0
  data.forEach((v, i) => {
    if (swept >= sweepLimit) return
    const slice = (v / total) * Math.PI * 2
    const sweep = Math.min(slice, sweepLimit - swept)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, size / 2, angle, angle + sweep)
    ctx.closePath()
    ctx.fillStyle = colors[i % colors.length]
    ctx.fill()
    angle += slice
    swept += slice
  })
}
