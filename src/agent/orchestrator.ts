import { applyDefaults } from '../dsl/defaults'
import {
  formatRepairPrompt,
  validateDsl,
  type DslError,
  type ValidationResult,
} from '../dsl/validate'
import type { VideoDsl } from '../dsl/types'
import { DeepSeekClient, type DeepSeekClientOptions } from './deepseek'
import { createSafeDsl, createSafeScript } from './fallback'
import { buildDslMessages, buildScriptMessages, repairMessages } from './prompts'
import { parseVideoScript } from './script'
import type {
  AgentEvent,
  AgentEventSink,
  DslGenerationResult,
  DslOptions,
  ScriptRequest,
  VideoGenerationResult,
  VideoScript,
} from './types'

const MAX_REPAIRS = 2
const noop = () => {}

export class VideoAgent {
  private readonly client: DeepSeekClient

  constructor(options: DeepSeekClientOptions) {
    this.client = new DeepSeekClient(options)
  }

  async generateScript(request: ScriptRequest, emit: AgentEventSink = noop): Promise<VideoScript> {
    const normalized = normalizeRequest(request)
    emit({ stage: 'script', message: '正在让 DeepSeek 编写科普剧本…' })
    const raw = await this.client.completeJson(buildScriptMessages(normalized), {
      temperature: 0.7,
      maxTokens: 5000,
    })
    const script = parseVideoScript(raw)
    emit({ stage: 'script', message: `剧本完成，共 ${script.scenes.length} 幕，可审阅编辑。` })
    return script
  }

  async generateDsl(
    script: VideoScript,
    options: DslOptions,
    emit: AgentEventSink = noop,
  ): Promise<DslGenerationResult> {
    emit({ stage: 'dsl', message: '正在把剧本翻译为受约束分镜 DSL…' })
    let repairs = 0
    try {
      let candidate = await this.client.completeJson(buildDslMessages(script, options), {
        temperature: 0.2,
        maxTokens: 8000,
      })

      for (;;) {
        emit({ stage: 'validation', message: `正在校验分镜（修复 ${repairs}/${MAX_REPAIRS}）…` })
        const validation = validateCandidate(candidate, script, options)
        if (validation.ok) {
          const normalized = applyDefaults(candidate as VideoDsl)
          const warnings = [
            ...validation.warnings,
            ...normalized.warnings.map(
              (problem): DslError => ({ path: '$', problem, fix: '已应用确定性默认处理' }),
            ),
          ]
          emit({ stage: 'validation', message: '分镜校验通过。' })
          return { dsl: normalized.dsl, repairs, usedFallback: false, warnings }
        }
        if (repairs >= MAX_REPAIRS) break

        repairs++
        emit({ stage: 'repair', attempt: repairs, message: `发现 ${validation.errors.length} 个错误，开始第 ${repairs} 轮修复…` })
        candidate = await this.client.completeJson(
          repairMessages(formatRepairPrompt(candidate, validation)),
          { temperature: 0.1, maxTokens: 8000 },
        )
      }
      throw new Error('两轮修复后仍未通过 DSL 校验')
    } catch (error) {
      emit({ stage: 'fallback', message: `${errorText(error)}，已切换安全模板。` })
      return {
        dsl: createSafeDsl(script, options),
        repairs,
        usedFallback: true,
        warnings: [],
      }
    }
  }

  async generate(request: ScriptRequest, sink: AgentEventSink = noop): Promise<VideoGenerationResult> {
    const normalized = normalizeRequest(request)
    const events: AgentEvent[] = []
    const emit: AgentEventSink = (event) => {
      events.push(event)
      sink(event)
    }
    let script: VideoScript
    let scriptFallback = false
    try {
      script = await this.generateScript(normalized, emit)
    } catch (error) {
      scriptFallback = true
      script = createSafeScript(normalized)
      emit({ stage: 'fallback', message: `${errorText(error)}，剧本已使用安全模板。` })
    }

    const result = await this.generateDsl(
      script,
      { style: normalized.style, resolution: normalized.resolution },
      emit,
    )
    emit({ stage: 'complete', message: '剧本与分镜准备完成。' })
    return {
      script,
      ...result,
      usedFallback: scriptFallback || result.usedFallback,
      events,
    }
  }
}

function validateCandidate(
  candidate: unknown,
  script: VideoScript,
  options: DslOptions,
): ValidationResult {
  const result = validateDsl(candidate)
  if (!isObject(candidate)) return result

  const error = (path: string, problem: string, fix: string) => {
    result.errors.push({ path, problem, fix })
  }
  if (isObject(candidate.meta)) {
    if (candidate.meta.style !== options.style) {
      error('meta.style', '风格与用户选择不一致', `设置 style: "${options.style}"`)
    }
    const resolution = options.resolution ?? '1920x1080'
    if (candidate.meta.resolution !== undefined && candidate.meta.resolution !== resolution) {
      error('meta.resolution', '分辨率与用户选择不一致', `设置 resolution: "${resolution}"`)
    }
  }

  if (Array.isArray(candidate.scenes)) {
    if (candidate.scenes.length !== script.scenes.length) {
      error('scenes', `幕数应为 ${script.scenes.length}，实际为 ${candidate.scenes.length}`, '保持与剧本相同的幕数和顺序')
    }
    for (let index = 0; index < Math.min(candidate.scenes.length, script.scenes.length); index++) {
      const scene = candidate.scenes[index]
      if (isObject(scene) && scene.narration !== script.scenes[index].narration) {
        error(
          `scenes[${index}].narration`,
          '旁白被改写，与剧本不一致',
          '逐字保留剧本 narration，包括用户编辑内容',
        )
      }
    }
  }
  result.ok = result.errors.length === 0
  return result
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeRequest(request: ScriptRequest): ScriptRequest {
  if (!request.topic.trim()) throw new Error('知识点不能为空')
  return {
    ...request,
    topic: request.topic.trim(),
    duration: Math.min(180, Math.max(30, request.duration ?? 60)),
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '生成失败'
}
