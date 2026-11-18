import { describe, expect, it } from 'vitest'
import { applyDefaults } from './defaults'
import { formatRepairPrompt, validateDsl } from './validate'
import { FALLBACK_ASSET } from './assets'
import type { VideoDsl } from './types'

const validDsl: VideoDsl = {
  dsl: '1.0',
  meta: { title: '蝴蝶效应', style: 'flat-cartoon' },
  scenes: [
    {
      narration: '一只蝴蝶在巴西扇动翅膀，可能引发美国的一场龙卷风。',
      background: { type: 'gradient', from: '#E8F4F8', to: '#FDF6EC' },
      elements: [
        {
          type: 'image',
          src: 'butterfly',
          position: [0.2, 0.45],
          enter: { anim: 'pop', dur: 0.6, delay: 0.3 },
          loop: { anim: 'float', period: 2.4 },
        },
        { type: 'text', content: '巴西的蝴蝶', position: [0.2, 0.75] },
      ],
      transition: { out: 'fade' },
    },
  ],
}

describe('validateDsl', () => {
  it('接受合法 DSL', () => {
    const result = validateDsl(validDsl)
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('拒绝非对象输入', () => {
    expect(validateDsl(null).ok).toBe(false)
    expect(validateDsl('hello').ok).toBe(false)
  })

  it('报告非法风格 token', () => {
    const bad = structuredClone(validDsl)
    bad.meta.style = 'cyberpunk' as never
    const result = validateDsl(bad)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.path === 'meta.style')).toBe(true)
  })

  it('无旁白且无 duration 的幕报错', () => {
    const bad = structuredClone(validDsl)
    bad.scenes.push({ elements: [] })
    const result = validateDsl(bad)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.path === 'scenes[1]')).toBe(true)
  })

  it('未知素材替换为兜底图标并警告', () => {
    const bad = structuredClone(validDsl)
    ;(bad.scenes[0].elements![0] as { src: string }).src = 'tornado.png'
    const result = validateDsl(bad)
    expect(result.ok).toBe(true)
    expect(result.warnings.some((w) => w.path === 'scenes[0].elements![0].src')).toBe(true)
    expect((bad.scenes[0].elements![0] as { src: string }).src).toBe(FALLBACK_ASSET)
  })

  it('坐标超出范围只警告不报错', () => {
    const bad = structuredClone(validDsl)
    bad.scenes[0].elements![0].position = [2.5, 0.5]
    const result = validateDsl(bad)
    expect(result.ok).toBe(true)
    expect(result.warnings.some((w) => w.path.includes('position'))).toBe(true)
  })

  it('非法动画名报错并给出枚举建议', () => {
    const bad = structuredClone(validDsl)
    bad.scenes[0].elements![0].enter = { anim: 'teleport' as never }
    const result = validateDsl(bad)
    expect(result.ok).toBe(false)
    const e = result.errors.find((e) => e.path.includes('enter.anim'))
    expect(e?.fix).toContain('fade')
  })

  it('highlight 引用不存在的 target 报错', () => {
    const bad = structuredClone(validDsl)
    bad.scenes[0].elements!.push({ type: 'highlight', target: 'nope', highlight: 'circle' })
    const result = validateDsl(bad)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.path.includes('target'))).toBe(true)
  })

  it('生成修复 prompt 包含错误路径与原始 DSL', () => {
    const bad = structuredClone(validDsl)
    bad.meta.title = ''
    const result = validateDsl(bad)
    const prompt = formatRepairPrompt(bad, result)
    expect(prompt).toContain('meta.title')
    expect(prompt).toContain('原始 DSL')
  })
})

describe('applyDefaults', () => {
  it('填充默认值且不修改原对象', () => {
    const { dsl, warnings } = applyDefaults(validDsl)
    expect(dsl.meta.resolution).toBe('1920x1080')
    expect(dsl.meta.subtitle).toBe(true)
    expect(dsl.scenes[0].id).toBe('s1')
    expect(dsl.scenes[0].padding).toEqual([0.4, 0.4])
    expect(dsl.scenes[0].transition?.dur).toBe(0.5)
    const text = dsl.scenes[0].elements![1]
    expect(text.type === 'text' && text.fontSize).toBe(36)
    expect(validDsl.meta.resolution).toBeUndefined()
    expect(warnings).toHaveLength(0)
  })

  it('无 enter 的元素补默认 fade 进场', () => {
    const { dsl } = applyDefaults(validDsl)
    const text = dsl.scenes[0].elements![1]
    expect(text.enter?.anim).toBe('fade')
    expect(text.enter?.dur).toBe(0.6)
    expect(text.enter?.delay).toBe(0)
  })

  it('chart 非数值数据被过滤并警告', () => {
    const dsl = structuredClone(validDsl)
    dsl.scenes[0].elements!.push({ type: 'chart', chart: 'bar', data: [1, 'x' as never, 3] })
    const { dsl: out, warnings } = applyDefaults(dsl)
    const chart = out.scenes[0].elements![2]
    expect(chart.type === 'chart' && chart.data).toEqual([1, 3])
    expect(warnings.length).toBeGreaterThan(0)
  })
})
