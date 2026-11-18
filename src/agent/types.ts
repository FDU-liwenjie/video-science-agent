import type { DslError } from '../dsl/validate'
import type { Resolution, StyleToken, VideoDsl } from '../dsl/types'

export interface ScriptRequest {
  topic: string
  style: StyleToken
  audience?: string
  duration?: number
  requirements?: string
  resolution?: Resolution
}

export interface ScriptScene {
  narration: string
  visual: string
  elements: string[]
  purpose: string
}

export interface VideoScript {
  title: string
  audience: string
  scenes: ScriptScene[]
}

export interface DslOptions {
  style: StyleToken
  resolution?: Resolution
}

export type AgentStage = 'script' | 'dsl' | 'validation' | 'repair' | 'fallback' | 'complete'

export interface AgentEvent {
  stage: AgentStage
  message: string
  attempt?: number
}

export type AgentEventSink = (event: AgentEvent) => void

export interface DslGenerationResult {
  dsl: VideoDsl
  repairs: number
  usedFallback: boolean
  warnings: DslError[]
}

export interface VideoGenerationResult extends DslGenerationResult {
  script: VideoScript
  events: AgentEvent[]
}
