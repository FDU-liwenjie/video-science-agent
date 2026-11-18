export const ELEMENT_TYPES = [
  'text',
  'image',
  'shape',
  'line',
  'particle',
  'chart',
  'path',
  'highlight',
] as const
export type ElementType = (typeof ELEMENT_TYPES)[number]

export const ENTER_ANIMS = ['fade', 'slide', 'scale', 'pop', 'typewriter', 'draw', 'grow'] as const
export type EnterAnim = (typeof ENTER_ANIMS)[number]

export const LOOP_ANIMS = ['float', 'pulse', 'rotate', 'wiggle'] as const
export type LoopAnim = (typeof LOOP_ANIMS)[number]

export const SHAPE_KINDS = ['circle', 'rect', 'star'] as const
export type ShapeKind = (typeof SHAPE_KINDS)[number]

export const PARTICLE_KINDS = ['snow', 'star', 'bubble', 'confetti'] as const
export type ParticleKind = (typeof PARTICLE_KINDS)[number]

export const CHART_KINDS = ['bar', 'line', 'pie'] as const
export type ChartKind = (typeof CHART_KINDS)[number]

export const TRANSITION_KINDS = ['fade', 'slide', 'zoom', 'wipe'] as const
export type TransitionKind = (typeof TRANSITION_KINDS)[number]

export const STYLE_TOKENS = ['hand-drawn', 'flat-cartoon', 'tech-geometric', 'minimal-fresh'] as const
export type StyleToken = (typeof STYLE_TOKENS)[number]

export const RESOLUTIONS = ['1920x1080', '1080x1920'] as const
export type Resolution = (typeof RESOLUTIONS)[number]

export type Position = [number, number]

export interface EnterAnimConfig {
  anim: EnterAnim
  dur?: number
  delay?: number
}

export interface LoopAnimConfig {
  anim: LoopAnim
  period?: number
}

interface ElementBase {
  id?: string
  type: ElementType
  position?: Position
  enter?: EnterAnimConfig
  loop?: LoopAnimConfig
}

export interface TextElement extends ElementBase {
  type: 'text'
  content: string
  fontSize?: number
  color?: string
  maxWidth?: number
}

export interface ImageElement extends ElementBase {
  type: 'image'
  src: string
  scale?: number
  rotation?: number
}

export interface ShapeElement extends ElementBase {
  type: 'shape'
  shape: ShapeKind
  size?: number
  fill?: string
  stroke?: string
}

export interface LineElement extends ElementBase {
  type: 'line'
  points: Position[]
  arrow?: boolean
  stroke?: string
}

export interface ParticleElement extends ElementBase {
  type: 'particle'
  kind: ParticleKind
  density?: number
  seed?: number
}

export interface ChartElement extends ElementBase {
  type: 'chart'
  chart: ChartKind
  data: number[]
  size?: number
}

export interface PathElement extends ElementBase {
  type: 'path'
  d: string
}

export interface HighlightElement extends ElementBase {
  type: 'highlight'
  target: string
  highlight: 'circle' | 'underline' | 'box'
}

export type Element =
  | TextElement
  | ImageElement
  | ShapeElement
  | LineElement
  | ParticleElement
  | ChartElement
  | PathElement
  | HighlightElement

export type Background =
  | { type: 'gradient'; from: string; to: string }
  | { type: 'solid'; color: string }

export interface Transition {
  out: TransitionKind
  dur?: number
}

export interface Scene {
  id?: string
  narration?: string
  duration?: number
  padding?: [number, number]
  background?: Background
  elements?: Element[]
  transition?: Transition
}

export interface VideoMeta {
  title: string
  style: StyleToken
  resolution?: Resolution
  bgm?: string
  subtitle?: boolean
}

export interface VideoDsl {
  dsl: '1.0'
  meta: VideoMeta
  scenes: Scene[]
}
