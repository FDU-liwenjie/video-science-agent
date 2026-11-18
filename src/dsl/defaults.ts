import type { VideoDsl } from './types'

export interface DefaultsResult {
  dsl: VideoDsl
  warnings: string[]
}

export function applyDefaults(input: VideoDsl): DefaultsResult {
  const dsl = structuredClone(input)
  const warnings: string[] = []

  dsl.meta.resolution ??= '1920x1080'
  dsl.meta.subtitle ??= true

  dsl.scenes.forEach((scene, i) => {
    scene.id ??= `s${i + 1}`
    scene.padding ??= [0.4, 0.4]
    scene.elements ??= []
    if (scene.transition) {
      scene.transition.dur ??= 0.5
    }

    for (const el of scene.elements) {
      el.position ??= [0.5, 0.5]
      el.enter ??= { anim: 'fade' }
      el.enter.dur ??= 0.6
      el.enter.delay ??= 0
      if (el.loop) {
        el.loop.period ??= 2
      }

      switch (el.type) {
        case 'text':
          el.fontSize ??= 36
          break
        case 'image':
          el.scale ??= 0.3
          break
        case 'particle':
          el.density ??= 1
          el.seed ??= 42
          break
        case 'chart':
          if (el.data.some((v) => typeof v !== 'number' || Number.isNaN(v))) {
            warnings.push(`元素 ${el.id ?? '?'} 的 chart.data 含非数值，已过滤`)
            el.data = el.data.filter((v) => typeof v === 'number' && !Number.isNaN(v))
          }
          break
      }
    }
  })

  return { dsl, warnings }
}
