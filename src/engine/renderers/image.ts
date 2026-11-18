import type { ImageElement } from '../../dsl/types'
import { drawIcon } from '../icons'
import type { Theme } from '../theme'

export function drawImageElement(
  ctx: CanvasRenderingContext2D,
  el: ImageElement,
  theme: Theme,
  h: number,
): void {
  const size = (el.scale ?? 0.3) * h
  ctx.rotate(((el.rotation ?? 0) * Math.PI) / 180)
  drawIcon(ctx, el.src, size, theme)
}
