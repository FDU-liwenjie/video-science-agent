import type { ParticleElement } from '../../dsl/types'
import { mulberry32 } from '../prng'
import type { Theme } from '../theme'

interface Particle {
  x: number
  y: number
  size: number
  speed: number
  phase: number
  colorIndex: number
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  el: ParticleElement,
  theme: Theme,
  w: number,
  h: number,
  t: number,
): void {
  const rand = mulberry32(el.seed ?? 42)
  const count = Math.round((el.density ?? 1) * 50)
  const colors = [theme.primary, theme.secondary, theme.accent]
  const particles: Particle[] = Array.from({ length: count }, () => ({
    x: rand(),
    y: rand(),
    size: 2 + rand() * 4,
    speed: 0.3 + rand() * 0.7,
    phase: rand() * Math.PI * 2,
    colorIndex: Math.floor(rand() * colors.length),
  }))

  const scaleBase = h / 1080
  for (const p of particles) {
    ctx.save()
    ctx.fillStyle = colors[p.colorIndex]
    ctx.strokeStyle = colors[p.colorIndex]
    const size = p.size * scaleBase

    switch (el.kind) {
      case 'snow': {
        const y = ((p.y + t * p.speed * 0.08) % 1) * h
        const x = (p.x + Math.sin(t * 0.5 + p.phase) * 0.01) * w
        ctx.globalAlpha *= 0.8
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'star': {
        ctx.globalAlpha *= 0.35 + 0.65 * Math.abs(Math.sin(t * p.speed * 2 + p.phase))
        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, size * 0.7, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'bubble': {
        const y = (1 - ((p.y + t * p.speed * 0.06) % 1)) * h
        ctx.globalAlpha *= 0.5
        ctx.lineWidth = 1.5 * scaleBase
        ctx.beginPath()
        ctx.arc(p.x * w, y, size * 1.4, 0, Math.PI * 2)
        ctx.stroke()
        break
      }
      case 'confetti': {
        const y = ((p.y + t * p.speed * 0.1) % 1) * h
        ctx.translate(p.x * w, y)
        ctx.rotate(t * p.speed * 3 + p.phase)
        ctx.fillRect(-size, -size * 0.5, size * 2, size)
        break
      }
    }
    ctx.restore()
  }
}
