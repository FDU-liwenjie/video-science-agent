import { describe, expect, it } from 'vitest'
import type { VideoDsl } from '../dsl/types'
import { buildTimeline, estimateDuration, sceneIndexAt } from './timeline'

const dsl: VideoDsl = {
  dsl: '1.0',
  meta: { title: '测试', style: 'flat-cartoon' },
  scenes: [
    { narration: '第一句旁白文字', padding: [0.4, 0.4] },
    { duration: 2, elements: [] },
    { narration: '第三句', padding: [0.5, 0.5] },
  ],
}

describe('buildTimeline', () => {
  it('旁白驱动幕时长并计算全局时间轴', () => {
    const tl = buildTimeline(dsl, [4, 0, 3])
    expect(tl.scenes[0].start).toBe(0)
    expect(tl.scenes[0].end).toBeCloseTo(4.8)
    expect(tl.scenes[0].narrationStart).toBeCloseTo(0.4)
    expect(tl.scenes[0].narrationEnd).toBeCloseTo(4.4)
    expect(tl.scenes[1].start).toBeCloseTo(4.8)
    expect(tl.scenes[1].end).toBeCloseTo(6.8)
    expect(tl.scenes[1].narrationStart).toBeNull()
    expect(tl.scenes[2].narrationStart).toBeCloseTo(7.3)
    expect(tl.totalDuration).toBeCloseTo(10.8)
  })

  it('缺少时长数据时按字数估算', () => {
    const tl = buildTimeline(dsl)
    expect(tl.scenes[0].narrationEnd! - tl.scenes[0].narrationStart!).toBeCloseTo(7 * 0.25)
    expect(tl.totalDuration).toBeGreaterThan(0)
  })

  it('sceneIndexAt 边界处理', () => {
    const tl = buildTimeline(dsl, [4, 0, 3])
    expect(sceneIndexAt(tl, 0)).toBe(0)
    expect(sceneIndexAt(tl, 4.7)).toBe(0)
    expect(sceneIndexAt(tl, 4.9)).toBe(1)
    expect(sceneIndexAt(tl, 999)).toBe(2)
  })
})

describe('estimateDuration', () => {
  it('中文按 4 字/秒估算', () => {
    expect(estimateDuration('一只蝴蝶')).toBeCloseTo(1)
    expect(estimateDuration('一只蝴蝶在巴西扇动翅膀')).toBeCloseTo(2.75)
  })

  it('英文按词估算且有下限', () => {
    expect(estimateDuration('hello world')).toBe(1)
    expect(estimateDuration('a b c d e f g h i j')).toBeCloseTo(4)
  })
})
