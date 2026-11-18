import type { Engine } from './engine'

export interface NarrationClip {
  buffer: AudioBuffer
  start: number
  end: number
}

export interface ExportOptions {
  engine: Engine
  canvas: HTMLCanvasElement
  narration?: NarrationClip[]
  bgm?: AudioBuffer
  fps?: number
  onProgress?: (ratio: number) => void
}

export interface ExportResult {
  blob: Blob
  filename: string
  mimeType: string
}

function pickMimeType(): { mimeType: string; ext: string } {
  const candidates = [
    { mimeType: 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', ext: 'mp4' },
    { mimeType: 'video/mp4', ext: 'mp4' },
    { mimeType: 'video/webm;codecs="vp9,opus"', ext: 'webm' },
    { mimeType: 'video/webm', ext: 'webm' },
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) return c
  }
  return { mimeType: '', ext: 'webm' }
}

export async function exportVideo(opts: ExportOptions): Promise<ExportResult> {
  const { engine, canvas, narration = [], bgm, onProgress } = opts
  const total = engine.timeline.totalDuration
  const { mimeType, ext } = pickMimeType()

  const audioCtx = new AudioContext()
  const dest = audioCtx.createMediaStreamDestination()

  const bgmGain = audioCtx.createGain()
  bgmGain.gain.value = 0.25
  bgmGain.connect(dest)

  if (bgm) {
    const src = audioCtx.createBufferSource()
    src.buffer = bgm
    src.loop = true
    src.connect(bgmGain)
    src.start(0)
    src.stop(total + 0.5)
  }

  for (const clip of narration) {
    const src = audioCtx.createBufferSource()
    src.buffer = clip.buffer
    src.connect(dest)
    src.start(clip.start)
    bgmGain.gain.setTargetAtTime(0.08, clip.start, 0.15)
    bgmGain.gain.setTargetAtTime(0.25, clip.end, 0.25)
  }

  const stream = canvas.captureStream(opts.fps ?? 30)
  const audioTrack = dest.stream.getAudioTracks()[0]
  if (audioTrack) stream.addTrack(audioTrack)

  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined,
  )
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })
  recorder.start(200)

  const t0 = performance.now()
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000
      engine.renderAt(Math.min(t, total - 0.001), canvas)
      onProgress?.(Math.min(1, t / total))
      if (t >= total) resolve()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  await new Promise((r) => setTimeout(r, 300))
  recorder.stop()
  await stopped
  stream.getTracks().forEach((track) => track.stop())
  await audioCtx.close()

  const blob = new Blob(chunks, { type: mimeType || 'video/webm' })
  const title = engine.dsl.meta.title.replace(/[\\/:*?"<>|]/g, '_') || '科普视频'
  return { blob, filename: `${title}.${ext}`, mimeType: blob.type }
}
