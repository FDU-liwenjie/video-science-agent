import { hasAsset } from '../dsl/assets'
import type { ScriptScene, VideoScript } from './types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredText(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${path} 必须是非空字符串`)
  return value.trim()
}

export function parseVideoScript(input: unknown): VideoScript {
  if (!isObject(input)) throw new Error('剧本必须是 JSON 对象')
  const title = requiredText(input.title, 'title')
  const audience = requiredText(input.audience, 'audience')
  if (!Array.isArray(input.scenes) || input.scenes.length === 0) {
    throw new Error('scenes 必须是非空数组')
  }

  const scenes: ScriptScene[] = input.scenes.map((value, index) => {
    const path = `scenes[${index}]`
    if (!isObject(value)) throw new Error(`${path} 必须是对象`)
    if (!Array.isArray(value.elements) || !value.elements.every((id) => typeof id === 'string')) {
      throw new Error(`${path}.elements 必须是素材 id 字符串数组`)
    }
    const elements = [...new Set(value.elements)]
    const unknown = elements.find((id) => !hasAsset(id))
    if (unknown) throw new Error(`${path}.elements 包含未知素材 id：${unknown}`)
    return {
      narration: requiredText(value.narration, `${path}.narration`),
      visual: requiredText(value.visual, `${path}.visual`),
      elements,
      purpose: requiredText(value.purpose, `${path}.purpose`),
    }
  })

  return { title, audience, scenes }
}
