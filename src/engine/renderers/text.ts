import type { TextElement } from '../../dsl/types'
import type { Theme } from '../theme'

function tokenize(text: string): string[] {
  return text.match(/[a-zA-Z0-9]+\s*|[\s\S]/g) ?? []
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  el: TextElement,
  theme: Theme,
  h: number,
  progress: number,
): void {
  const scaleBase = h / 1080
  const fontSize = (el.fontSize ?? 36) * scaleBase
  const typewriter = el.enter?.anim === 'typewriter'
  const content = typewriter
    ? el.content.slice(0, Math.ceil(el.content.length * progress))
    : el.content

  ctx.font = `${fontSize}px ${theme.fontFamily}`
  ctx.fillStyle = el.color ?? theme.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const maxWidth = el.maxWidth ? el.maxWidth * scaleBase : undefined
  const lineHeight = fontSize * 1.35

  let lines = content.split('\n')
  if (maxWidth) {
    lines = []
    for (const paragraph of content.split('\n')) {
      let line = ''
      for (const token of tokenize(paragraph)) {
        const candidate = line + token
        if (line && ctx.measureText(candidate).width > maxWidth) {
          lines.push(line.trimEnd())
          line = token.trimStart()
        } else {
          line = candidate
        }
      }
      lines.push(line.trimEnd())
    }

    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
    if (widest > maxWidth) {
      const ratio = maxWidth / widest
      ctx.scale(ratio, ratio)
    }
  }

  const startY = -((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, startY + i * lineHeight)
  })
}
