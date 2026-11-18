import type { Element } from '../../dsl/types'
import { enterState, loopState } from '../animation'
import { hashPhase } from '../prng'
import type { Theme } from '../theme'
import { drawChart } from './chart'
import { drawImageElement } from './image'
import { drawLine } from './line'
import { drawParticles } from './particle'
import { drawShape } from './shape'
import { drawText } from './text'

export function drawElement(
  ctx: CanvasRenderingContext2D,
  el: Element,
  localT: number,
  theme: Theme,
  w: number,
  h: number,
): void {
  const enter = enterState(el.enter, localT)
  if (!enter.visible) return

  const loop = loopState(el.loop, localT, hashPhase(el.id) * 3)
  const scaleBase = h / 1080
  const absoluteCoords = el.type === 'line' || el.type === 'path' || el.type === 'particle'

  ctx.save()

  if (!absoluteCoords) {
    const [px, py] = el.position ?? [0.5, 0.5]
    let dy = loop.dy * scaleBase
    if (el.enter?.anim === 'slide') dy += (1 - enter.eased) * 40 * scaleBase
    ctx.translate(px * w, py * h + dy)
  }

  let scale = loop.scale
  if (el.enter?.anim === 'scale' || el.enter?.anim === 'pop') {
    scale *= enter.eased
  }
  if (scale !== 1) ctx.scale(scale, scale)
  if (loop.rotation) ctx.rotate(loop.rotation)

  ctx.globalAlpha *= el.enter?.anim === 'fade' || !el.enter ? enter.eased : 1

  switch (el.type) {
    case 'text':
      drawText(ctx, el, theme, h, enter.progress)
      break
    case 'image':
      drawImageElement(ctx, el, theme, h)
      break
    case 'shape':
      drawShape(ctx, el, theme, h, enter)
      break
    case 'line':
      drawLine(ctx, el, theme, w, h, enter)
      break
    case 'particle':
      drawParticles(ctx, el, theme, w, h, localT)
      break
    case 'chart':
      drawChart(ctx, el, theme, h, enter)
      break
    case 'path':
    case 'highlight':
      break
  }

  ctx.restore()
}
