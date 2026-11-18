import type { VideoDsl } from '../dsl/types'

export interface TimelineScene {
  index: number
  start: number
  end: number
  narrationStart: number | null
  narrationEnd: number | null
}

export interface Timeline {
  totalDuration: number
  scenes: TimelineScene[]
}

export function estimateDuration(text: string): number {
  const cjk = (text.match(/[一-鿿]/g) ?? []).length
  const latinWords = (text.replace(/[一-鿿]/g, ' ').match(/[a-zA-Z0-9]+/g) ?? []).length
  return Math.max(1, cjk * 0.25 + latinWords * 0.4)
}

export function buildTimeline(
  dsl: VideoDsl,
  narrationDurations: (number | undefined)[] = [],
): Timeline {
  let cursor = 0
  const scenes = dsl.scenes.map((scene, i) => {
    const padding = scene.padding ?? [0.4, 0.4]
    const hasNarration = !!scene.narration?.trim()
    const narrationDur = hasNarration
      ? (narrationDurations[i] ?? estimateDuration(scene.narration!))
      : 0
    const duration = hasNarration
      ? padding[0] + narrationDur + padding[1]
      : (scene.duration ?? 3)

    const start = cursor
    cursor += duration
    return {
      index: i,
      start,
      end: cursor,
      narrationStart: hasNarration ? start + padding[0] : null,
      narrationEnd: hasNarration ? start + padding[0] + narrationDur : null,
    }
  })
  return { totalDuration: cursor, scenes }
}

export function sceneIndexAt(timeline: Timeline, t: number): number {
  for (const s of timeline.scenes) {
    if (t < s.end) return s.index
  }
  return timeline.scenes.length - 1
}
