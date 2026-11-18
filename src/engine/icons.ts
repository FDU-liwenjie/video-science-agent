import type { Theme } from './theme'

const warned = new Set<string>()

export function drawIcon(ctx: CanvasRenderingContext2D, id: string, size: number, theme: Theme): void {
  ctx.save()
  ctx.lineWidth = theme.lineWidth
  ctx.strokeStyle = theme.primary
  ctx.fillStyle = theme.primary
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  if (theme.glow) {
    ctx.shadowColor = theme.primary
    ctx.shadowBlur = 12
  }

  const s = size / 2
  const paint = () => {
    if (theme.iconFilled) ctx.fill()
    else ctx.stroke()
  }

  switch (id) {
    case 'butterfly': {
      for (const dir of [-1, 1]) {
        ctx.save()
        ctx.scale(dir, 1)
        ctx.beginPath()
        ctx.ellipse(s * 0.55, -s * 0.25, s * 0.5, s * 0.62, -0.5, 0, Math.PI * 2)
        paint()
        ctx.beginPath()
        ctx.ellipse(s * 0.45, s * 0.45, s * 0.36, s * 0.42, 0.4, 0, Math.PI * 2)
        paint()
        ctx.restore()
      }
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.7)
      ctx.lineTo(0, s * 0.85)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.7)
      ctx.quadraticCurveTo(-s * 0.35, -s * 1.05, -s * 0.4, -s * 0.95)
      ctx.moveTo(0, -s * 0.7)
      ctx.quadraticCurveTo(s * 0.35, -s * 1.05, s * 0.4, -s * 0.95)
      ctx.stroke()
      break
    }
    case 'gear': {
      const teeth = 8
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2
        ctx.save()
        ctx.rotate(a)
        ctx.beginPath()
        ctx.rect(-s * 0.13, -s, s * 0.26, s * 0.32)
        paint()
        ctx.restore()
      }
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.66, 0, Math.PI * 2)
      paint()
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'planet': {
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2)
      paint()
      ctx.save()
      ctx.rotate(-0.4)
      ctx.beginPath()
      ctx.ellipse(0, 0, s * 1.05, s * 0.32, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      break
    }
    case 'dna': {
      for (const phase of [0, Math.PI]) {
        ctx.beginPath()
        for (let i = 0; i <= 24; i++) {
          const y = -s + (i / 24) * 2 * s
          const x = Math.sin((i / 24) * Math.PI * 2 + phase) * s * 0.45
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      for (let i = 1; i < 6; i++) {
        const y = -s + (i / 6) * 2 * s
        const x = Math.sin((i / 6) * Math.PI * 2) * s * 0.45
        ctx.beginPath()
        ctx.moveTo(-x, y)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
      break
    }
    case 'book': {
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.6)
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.85, -s * 0.9, -s * 0.6)
      ctx.lineTo(-s * 0.9, s * 0.6)
      ctx.quadraticCurveTo(-s * 0.5, s * 0.35, 0, s * 0.6)
      ctx.quadraticCurveTo(s * 0.5, s * 0.35, s * 0.9, s * 0.6)
      ctx.lineTo(s * 0.9, -s * 0.6)
      ctx.quadraticCurveTo(s * 0.5, -s * 0.85, 0, -s * 0.6)
      paint()
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.6)
      ctx.lineTo(0, s * 0.6)
      ctx.stroke()
      break
    }
    case 'bulb': {
      ctx.beginPath()
      ctx.arc(0, -s * 0.15, s * 0.55, 0, Math.PI * 2)
      paint()
      ctx.beginPath()
      ctx.moveTo(-s * 0.22, s * 0.5)
      ctx.lineTo(s * 0.22, s * 0.5)
      ctx.moveTo(-s * 0.18, s * 0.72)
      ctx.lineTo(s * 0.18, s * 0.72)
      ctx.stroke()
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.85 + (i / 4) * Math.PI * 0.7
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * s * 0.75, -s * 0.15 + Math.sin(a) * s * 0.75)
        ctx.lineTo(Math.cos(a) * s * 0.95, -s * 0.15 + Math.sin(a) * s * 0.95)
        ctx.stroke()
      }
      break
    }
    case 'cloud': {
      ctx.beginPath()
      ctx.arc(-s * 0.4, s * 0.1, s * 0.38, Math.PI * 0.5, Math.PI * 1.5)
      ctx.arc(-s * 0.05, -s * 0.28, s * 0.42, Math.PI * 0.9, Math.PI * 1.9)
      ctx.arc(s * 0.42, 0, s * 0.36, Math.PI * 1.3, Math.PI * 0.5)
      ctx.closePath()
      paint()
      break
    }
    case 'lightning': {
      ctx.beginPath()
      ctx.moveTo(s * 0.15, -s)
      ctx.lineTo(-s * 0.45, s * 0.15)
      ctx.lineTo(0, s * 0.15)
      ctx.lineTo(-s * 0.15, s)
      ctx.lineTo(s * 0.45, -s * 0.15)
      ctx.lineTo(0, -s * 0.15)
      ctx.closePath()
      paint()
      break
    }
    case 'magnifier': {
      ctx.beginPath()
      ctx.arc(-s * 0.15, -s * 0.15, s * 0.55, 0, Math.PI * 2)
      paint()
      ctx.beginPath()
      ctx.moveTo(s * 0.25, s * 0.25)
      ctx.lineTo(s * 0.85, s * 0.85)
      ctx.stroke()
      break
    }
    case 'globe': {
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2)
      paint()
      ctx.beginPath()
      ctx.ellipse(0, 0, s * 0.4, s * 0.85, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-s * 0.85, 0)
      ctx.lineTo(s * 0.85, 0)
      ctx.stroke()
      break
    }
    case 'question-mark': {
      ctx.font = `bold ${size * 1.1}px ${theme.fontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('?', 0, size * 0.05)
      break
    }
    case 'star':
    default: {
      if (id !== 'star' && !warned.has(id)) {
        warned.add(id)
        console.warn(`[icons] 图标 "${id}" 尚未实现，使用 star 兜底`)
      }
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s * 0.9 : s * 0.4
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
        const x = Math.cos(a) * r
        const y = Math.sin(a) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      paint()
      break
    }
  }
  ctx.restore()
}
