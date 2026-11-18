import {
  ELEMENT_TYPES,
  ENTER_ANIMS,
  LOOP_ANIMS,
  SHAPE_KINDS,
  PARTICLE_KINDS,
  CHART_KINDS,
  TRANSITION_KINDS,
  STYLE_TOKENS,
  RESOLUTIONS,
} from './types'
import type { VideoDsl } from './types'
import { FALLBACK_ASSET, hasAsset } from './assets'

export interface DslError {
  path: string
  problem: string
  fix: string
}

export interface ValidationResult {
  ok: boolean
  errors: DslError[]
  warnings: DslError[]
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function validateDsl(input: unknown): ValidationResult {
  const errors: DslError[] = []
  const warnings: DslError[] = []

  const err = (path: string, problem: string, fix: string) => errors.push({ path, problem, fix })
  const warn = (path: string, problem: string, fix: string) => warnings.push({ path, problem, fix })

  if (!isObject(input)) {
    err('$', '输入不是 JSON 对象', '输出一个符合 dsl 1.0 的 JSON 对象')
    return { ok: false, errors, warnings }
  }

  if (input.dsl !== '1.0') {
    err('dsl', `版本字段应为 "1.0"，实际为 ${JSON.stringify(input.dsl)}`, '设置 dsl: "1.0"')
  }

  const meta = input.meta
  if (!isObject(meta)) {
    err('meta', '缺少 meta 对象', '提供 meta: { title, style }')
  } else {
    if (typeof meta.title !== 'string' || meta.title.trim() === '') {
      err('meta.title', '标题缺失或为空', '提供一个非空标题字符串')
    }
    if (!STYLE_TOKENS.includes(meta.style as (typeof STYLE_TOKENS)[number])) {
      err('meta.style', `风格 token 非法：${JSON.stringify(meta.style)}`, `从 ${STYLE_TOKENS.join(' / ')} 中选择`)
    }
    if (meta.resolution !== undefined && !RESOLUTIONS.includes(meta.resolution as (typeof RESOLUTIONS)[number])) {
      err('meta.resolution', `分辨率非法：${JSON.stringify(meta.resolution)}`, `从 ${RESOLUTIONS.join(' / ')} 中选择`)
    }
  }

  const scenes = input.scenes
  if (!Array.isArray(scenes) || scenes.length === 0) {
    err('scenes', 'scenes 必须是非空数组', '提供至少一幕场景')
    return { ok: errors.length === 0, errors, warnings }
  }

  scenes.forEach((scene, i) => {
    const base = `scenes[${i}]`
    if (!isObject(scene)) {
      err(base, '场景不是对象', '提供场景对象')
      return
    }

    const hasNarration = typeof scene.narration === 'string' && scene.narration.trim() !== ''
    const hasDuration = isNumber(scene.duration) && scene.duration > 0
    if (!hasNarration && !hasDuration) {
      err(base, '无旁白幕必须显式提供 duration', '添加 narration 旁白文字，或设置 duration > 0')
    }
    if (scene.duration !== undefined && !hasDuration) {
      err(`${base}.duration`, 'duration 必须为正数', '设置 duration > 0')
    }
    if (scene.padding !== undefined) {
      const p = scene.padding
      if (!Array.isArray(p) || p.length !== 2 || !p.every((v) => isNumber(v) && v >= 0)) {
        err(`${base}.padding`, 'padding 必须是两个非负数组成的数组', '如 [0.4, 0.4]')
      }
    }

    const elements = scene.elements ?? []
    if (!Array.isArray(elements)) {
      err(`${base}.elements`, 'elements 必须是数组', '提供元素数组')
      return
    }

    const ids = new Set<string>()
    elements.forEach((el, j) => {
      const path = `${base}.elements[${j}]`
      if (!isObject(el)) {
        err(path, '元素不是对象', '提供元素对象')
        return
      }

      if (!ELEMENT_TYPES.includes(el.type as (typeof ELEMENT_TYPES)[number])) {
        err(`${path}.type`, `元素类型非法：${JSON.stringify(el.type)}`, `从 ${ELEMENT_TYPES.join(' / ')} 中选择`)
      }

      if (el.id !== undefined) {
        if (typeof el.id !== 'string' || el.id === '') {
          err(`${path}.id`, 'id 必须是非空字符串', '提供唯一 id')
        } else if (ids.has(el.id)) {
          warn(`${path}.id`, `id 重复：${el.id}`, '保证同幕内 id 唯一')
        } else {
          ids.add(el.id)
        }
      }

      if (el.position !== undefined) {
        const pos = el.position
        if (!Array.isArray(pos) || pos.length !== 2 || !pos.every(isNumber)) {
          err(`${path}.position`, 'position 必须是两个数字组成的数组', '如 [0.5, 0.4]')
        } else if (pos.some((v) => v < -0.5 || v > 1.5)) {
          warn(`${path}.position`, `坐标超出建议范围 [-0.5, 1.5]：${JSON.stringify(pos)}`, '使用 0-1 归一化坐标，出血元素允许 -0.5~1.5')
        }
      }

      if (el.enter !== undefined) {
        const enter = el.enter
        if (!isObject(enter) || !ENTER_ANIMS.includes(enter.anim as (typeof ENTER_ANIMS)[number])) {
          err(`${path}.enter.anim`, `进场动画非法：${JSON.stringify(isObject(enter) ? enter.anim : enter)}`, `从 ${ENTER_ANIMS.join(' / ')} 中选择`)
        } else {
          if (enter.dur !== undefined && !(isNumber(enter.dur) && enter.dur > 0)) {
            err(`${path}.enter.dur`, '动画时长必须为正数', '如 dur: 0.6')
          }
          if (enter.delay !== undefined && !(isNumber(enter.delay) && enter.delay >= 0)) {
            err(`${path}.enter.delay`, 'delay 必须为非负数', '如 delay: 0.3')
          }
        }
      }

      if (el.loop !== undefined) {
        const loop = el.loop
        if (!isObject(loop) || !LOOP_ANIMS.includes(loop.anim as (typeof LOOP_ANIMS)[number])) {
          err(`${path}.loop.anim`, `循环动画非法：${JSON.stringify(isObject(loop) ? loop.anim : loop)}`, `从 ${LOOP_ANIMS.join(' / ')} 中选择`)
        } else if (loop.period !== undefined && !(isNumber(loop.period) && loop.period > 0)) {
          err(`${path}.loop.period`, '循环周期必须为正数', '如 period: 2.4')
        }
      }

      switch (el.type) {
        case 'text':
          if (typeof el.content !== 'string' || el.content.trim() === '') {
            err(`${path}.content`, 'text 元素缺少 content 文字', '提供非空 content')
          }
          break
        case 'image':
          if (typeof el.src !== 'string' || el.src === '') {
            err(`${path}.src`, 'image 元素缺少 src', '从素材库清单中选择图标 id')
          } else if (!hasAsset(el.src)) {
            el.src = FALLBACK_ASSET
            warn(`${path}.src`, `素材不存在，已替换为兜底图标 ${FALLBACK_ASSET}`, 'src 必须从素材库清单中选择')
          }
          break
        case 'shape':
          if (!SHAPE_KINDS.includes(el.shape as (typeof SHAPE_KINDS)[number])) {
            err(`${path}.shape`, `图形种类非法：${JSON.stringify(el.shape)}`, `从 ${SHAPE_KINDS.join(' / ')} 中选择`)
          }
          break
        case 'line': {
          const points = el.points
          if (!Array.isArray(points) || points.length < 2) {
            err(`${path}.points`, 'line 元素至少需要 2 个点', '提供 points: [[x1,y1],[x2,y2]]')
          } else if (!points.every((p) => Array.isArray(p) && p.length === 2 && p.every(isNumber))) {
            err(`${path}.points`, '点必须是 [x, y] 数字对', '使用归一化坐标点')
          }
          break
        }
        case 'particle':
          if (!PARTICLE_KINDS.includes(el.kind as (typeof PARTICLE_KINDS)[number])) {
            err(`${path}.kind`, `粒子种类非法：${JSON.stringify(el.kind)}`, `从 ${PARTICLE_KINDS.join(' / ')} 中选择`)
          }
          break
        case 'chart':
          if (!CHART_KINDS.includes(el.chart as (typeof CHART_KINDS)[number])) {
            err(`${path}.chart`, `图表种类非法：${JSON.stringify(el.chart)}`, `从 ${CHART_KINDS.join(' / ')} 中选择`)
          }
          if (!Array.isArray(el.data) || el.data.length === 0) {
            err(`${path}.data`, 'chart 元素需要非空 data 数组', '提供 data: [数值...]')
          }
          break
        case 'path':
          if (typeof el.d !== 'string' || el.d.trim() === '') {
            err(`${path}.d`, 'path 元素缺少 d 路径', '提供 SVG path 字符串')
          }
          break
        case 'highlight': {
          if (typeof el.target !== 'string' || !ids.has(el.target)) {
            err(`${path}.target`, `highlight 引用的元素 id 不存在：${JSON.stringify(el.target)}`, 'target 必须是同幕内已定义的元素 id')
          }
          if (!['circle', 'underline', 'box'].includes(el.highlight as string)) {
            err(`${path}.highlight`, `高亮方式非法：${JSON.stringify(el.highlight)}`, '从 circle / underline / box 中选择')
          }
          break
        }
      }
    })

    if (scene.transition !== undefined) {
      const t = scene.transition
      if (!isObject(t) || !TRANSITION_KINDS.includes(t.out as (typeof TRANSITION_KINDS)[number])) {
        err(`${base}.transition.out`, `转场非法：${JSON.stringify(isObject(t) ? t.out : t)}`, `从 ${TRANSITION_KINDS.join(' / ')} 中选择`)
      } else if (t.dur !== undefined && !(isNumber(t.dur) && t.dur > 0)) {
        err(`${base}.transition.dur`, '转场时长必须为正数', '如 dur: 0.5')
      }
    }
  })

  return { ok: errors.length === 0, errors, warnings }
}

export function formatRepairPrompt(input: unknown, result: ValidationResult): string {
  const lines = [
    '以下分镜 DSL 未通过校验，请只修复错误字段，不要重写其他内容。',
    '',
    '错误列表：',
    ...result.errors.map((e) => `- ${e.path}: ${e.problem}。修复建议：${e.fix}`),
    '',
    '原始 DSL：',
    JSON.stringify(input, null, 2),
  ]
  return lines.join('\n')
}

export type { VideoDsl }
