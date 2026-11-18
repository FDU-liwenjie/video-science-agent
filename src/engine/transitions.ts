import type { TransitionKind } from '../dsl/types'

export function blitWithTransition(
  ctx: CanvasRenderingContext2D,
  sceneCanvas: HTMLCanvasElement,
  kind: TransitionKind | undefined,
  progress: number,
  bg: string,
): void {
  const w = ctx.canvas.width
  const h = ctx.canvas.height

  if (!kind || progress <= 0) {
    ctx.drawImage(sceneCanvas, 0, 0)
    return
  }
  const p = Math.min(1, progress)

  switch (kind) {
    case 'fade':
      ctx.drawImage(sceneCanvas, 0, 0)
      ctx.save()
      ctx.globalAlpha = p
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
      break
    case 'slide':
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(sceneCanvas, -p * w, 0)
      break
    case 'zoom': {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.save()
      ctx.globalAlpha = 1 - p
      ctx.translate(w / 2, h / 2)
      ctx.scale(1 + p * 0.15, 1 + p * 0.15)
      ctx.drawImage(sceneCanvas, -w / 2, -h / 2)
      ctx.restore()
      break
    }
    case 'wipe':
      ctx.drawImage(sceneCanvas, 0, 0)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w * p, h)
      break
  }
}
