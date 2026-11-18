import type { EnterAnimConfig, LoopAnimConfig } from '../dsl/types'
import { easeInOutCubic, easeOutBack, easeOutCubic, linear, type EasingFn } from './easing'

export interface EnterState {
  visible: boolean
  progress: number
  eased: number
}

function easingFor(anim: EnterAnimConfig['anim'] | undefined): EasingFn {
  switch (anim) {
    case 'fade':
    case 'typewriter':
      return linear
    case 'pop':
      return easeOutBack
    case 'draw':
      return easeInOutCubic
    default:
      return easeOutCubic
  }
}

export function enterState(enter: EnterAnimConfig | undefined, t: number): EnterState {
  const delay = enter?.delay ?? 0
  const dur = enter?.dur ?? 0.6
  if (t < delay) return { visible: false, progress: 0, eased: 0 }
  const progress = Math.min(1, (t - delay) / dur)
  return { visible: true, progress, eased: easingFor(enter?.anim)(progress) }
}

export interface LoopState {
  dy: number
  scale: number
  rotation: number
}

export function loopState(loop: LoopAnimConfig | undefined, t: number, phase = 0): LoopState {
  if (!loop) return { dy: 0, scale: 1, rotation: 0 }
  const period = loop.period ?? 2
  const p = (((t + phase) % period) / period) * Math.PI * 2
  switch (loop.anim) {
    case 'float':
      return { dy: Math.sin(p) * 10, scale: 1, rotation: 0 }
    case 'pulse':
      return { dy: 0, scale: 1 + Math.sin(p) * 0.06, rotation: 0 }
    case 'rotate':
      return { dy: 0, scale: 1, rotation: (t / period) * Math.PI * 2 }
    case 'wiggle':
      return { dy: 0, scale: 1, rotation: Math.sin(p) * 0.08 }
  }
}
