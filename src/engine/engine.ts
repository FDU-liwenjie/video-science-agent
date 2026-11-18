import type { Background, VideoDsl } from '../dsl/types'
import { drawElement } from './renderers'
import { drawSubtitle, type WordTimestamp } from './subtitle'
import { getTheme, type Theme } from './theme'
import { sceneIndexAt, type Timeline } from './timeline'
import { blitWithTransition } from './transitions'

export interface EngineOptions {
  dsl: VideoDsl
  timeline: Timeline
  canvas: HTMLCanvasElement
  theme?: Theme
  subtitles?: Record<number, WordTimestamp[] | undefined>
}

export class Engine {
  readonly dsl: VideoDsl
  readonly timeline: Timeline
  readonly theme: Theme
  private canvas: HTMLCanvasElement
  private sceneCanvas: HTMLCanvasElement
  private subtitles?: Record<number, WordTimestamp[] | undefined>

  constructor(opts: EngineOptions) {
    this.dsl = opts.dsl
    this.timeline = opts.timeline
    this.canvas = opts.canvas
    this.theme = opts.theme ?? getTheme(opts.dsl.meta.style)
    this.subtitles = opts.subtitles
    this.sceneCanvas = document.createElement('canvas')
  }

  renderAt(t: number, target?: HTMLCanvasElement): void {
    const canvas = target ?? this.canvas
    const w = canvas.width
    const h = canvas.height
    if (this.sceneCanvas.width !== w || this.sceneCanvas.height !== h) {
      this.sceneCanvas.width = w
      this.sceneCanvas.height = h
    }

    const sctx = this.sceneCanvas.getContext('2d')!
    const idx = sceneIndexAt(this.timeline, t)
    const ts = this.timeline.scenes[idx]
    const scene = this.dsl.scenes[idx]
    const localT = t - ts.start

    paintBackground(sctx, scene.background, this.theme, w, h)
    for (const el of scene.elements ?? []) {
      drawElement(sctx, el, localT, this.theme, w, h)
    }

    const tr = scene.transition
    const trDur = tr?.dur ?? 0.5
    const remain = ts.end - t
    const progress = tr && remain < trDur ? 1 - remain / trDur : 0

    const ctx = canvas.getContext('2d')!
    blitWithTransition(ctx, this.sceneCanvas, tr?.out, progress, this.theme.bg)

    if (this.dsl.meta.subtitle !== false && scene.narration && ts.narrationStart !== null) {
      const local = t - ts.narrationStart
      const dur = (ts.narrationEnd ?? ts.start) - ts.narrationStart
      if (local >= 0 && local <= dur + 0.3) {
        drawSubtitle(ctx, {
          text: scene.narration,
          localTime: local,
          duration: dur,
          words: this.subtitles?.[idx],
          theme: this.theme,
          w,
          h,
          portrait: h > w,
        })
      }
    }
  }
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  bg: Background | undefined,
  theme: Theme,
  w: number,
  h: number,
): void {
  if (bg?.type === 'gradient') {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, bg.from)
    g.addColorStop(1, bg.to)
    ctx.fillStyle = g
  } else {
    ctx.fillStyle = bg?.type === 'solid' ? bg.color : theme.bg
  }
  ctx.fillRect(0, 0, w, h)
}
