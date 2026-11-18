import type { Theme } from './theme'

export interface WordTimestamp {
  text: string
  start: number
  end: number
}

export interface SubtitleParams {
  text: string
  localTime: number
  duration: number
  words?: WordTimestamp[]
  theme: Theme
  w: number
  h: number
  portrait: boolean
}

interface Line {
  text: string
  offset: number
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): Line[] {
  const tokens = text.match(/[a-zA-Z0-9]+\s*|[\s\S]/g) ?? []
  const lines: Line[] = []
  let line = ''
  let offset = 0
  for (const token of tokens) {
    const candidate = line + token
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push({ text: line, offset })
      offset += line.length
      line = token.trimStart()
      offset += token.length - token.trimStart().length
    } else {
      line = candidate
    }
  }
  if (line) lines.push({ text: line, offset })
  return lines
}

export function drawSubtitle(ctx: CanvasRenderingContext2D, p: SubtitleParams): void {
  const fontSize = p.h * 0.036
  const lineHeight = fontSize * 1.5
  const maxWidth = p.w * 0.84

  ctx.save()
  ctx.font = `${fontSize}px ${p.theme.fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lines = wrapLines(ctx, p.text, maxWidth)

  let highlightChars: number
  if (p.words?.length) {
    highlightChars = p.words
      .filter((word) => word.start <= p.localTime)
      .reduce((sum, word) => sum + word.text.length, 0)
  } else {
    const progress = Math.min(1, Math.max(0, p.localTime / Math.max(p.duration, 0.001)))
    highlightChars = Math.floor(p.text.length * progress)
  }

  const widest = Math.max(...lines.map((l) => ctx.measureText(l.text).width), fontSize)
  const padX = fontSize * 0.8
  const padY = fontSize * 0.5
  const boxW = widest + padX * 2
  const boxH = lines.length * lineHeight + padY * 2
  const margin = p.h * (p.portrait ? 0.14 : 0.07)
  const boxX = (p.w - boxW) / 2
  const boxY = p.h - margin - boxH

  ctx.fillStyle = p.theme.subtitleBg
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, fontSize * 0.5)
  ctx.fill()

  ctx.textAlign = 'left'
  lines.forEach((line, i) => {
    const y = boxY + padY + lineHeight * i + lineHeight / 2
    const x = (p.w - ctx.measureText(line.text).width) / 2
    ctx.fillStyle = p.theme.subtitleText
    ctx.fillText(line.text, x, y)

    const lineHighlight = Math.min(
      line.text.length,
      Math.max(0, highlightChars - line.offset),
    )
    if (lineHighlight > 0) {
      ctx.fillStyle = p.theme.subtitleHighlight
      ctx.fillText(line.text.slice(0, lineHighlight), x, y)
    }
  })

  ctx.restore()
}
