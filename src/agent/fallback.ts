import { FALLBACK_ASSET, hasAsset } from '../dsl/assets'
import { applyDefaults } from '../dsl/defaults'
import type { StyleToken, VideoDsl } from '../dsl/types'
import type { DslOptions, ScriptRequest, VideoScript } from './types'

type TemplateKind = 'concept' | 'process' | 'comparison'

function templateFor(topic: string): TemplateKind {
  if (/区别|差异|比较|对比|\bvs\b/i.test(topic)) return 'comparison'
  if (/过程|步骤|原理|如何|怎么|形成|作用|效应/.test(topic)) return 'process'
  return 'concept'
}

export function createSafeScript(request: ScriptRequest): VideoScript {
  const topic = request.topic.trim()
  const audience = request.audience?.trim() || '普通学习者'
  const kind = templateFor(topic)
  const scenes = {
    concept: [
      {
        narration: `你有没有想过，${topic}为什么会这样发生？我们从一个生活中的问题开始，把复杂现象拆成几个能观察的关键线索。`,
        visual: '用一个问题引出主题，中央呈现核心对象。',
        elements: ['question-mark', 'magnifier'],
        purpose: '提出问题',
      },
      {
        narration: `理解${topic}的关键，是先看清楚其中的对象、关系和变化。因果链条一步步展开，表面复杂的现象就会变得有迹可循。`,
        visual: '用连线连接对象，展示因素之间的关系。',
        elements: ['gear', 'bulb'],
        purpose: '解释核心关系',
      },
      {
        narration: `回到最初的问题，${topic}并不神秘。抓住核心条件和变化过程，就能用自己的话解释它，也能分辨常见的误解。`,
        visual: '总结关键条件，用对勾强化正确理解。',
        elements: ['check', 'book'],
        purpose: '总结并纠正误解',
      },
    ],
    process: [
      {
        narration: `要理解${topic}，先别急着记结论。我们按发生顺序，把整个过程拆成几个连续步骤。`,
        visual: '展示起点和将要展开的步骤路径。',
        elements: ['flag', 'compass'],
        purpose: '建立过程全景',
      },
      {
        narration: '第一步先准备必要条件，接着各个因素开始相互作用。每一步都会影响下一步，因此顺序和条件同样重要。',
        visual: '用两个逐渐放大的圆形和箭头表示连续作用。',
        elements: ['gear', 'arrow-up'],
        purpose: '拆解关键步骤',
      },
      {
        narration: `最后把步骤连起来看：输入经过转换，得到可以观察的结果。只要找到每一步的输入和输出，就能复述${topic}的完整过程。`,
        visual: '连接输入、转换和结果，形成完整链条。',
        elements: ['check', 'signal'],
        purpose: '串联输入与结果',
      },
    ],
    comparison: [
      {
        narration: `谈到${topic}，最容易混淆的是几个看起来很相似的概念。先把它们放在一起，比较对象和条件。`,
        visual: '左右放置两个对象，中间用对比符号区分。',
        elements: ['plus', 'equals'],
        purpose: '建立比较框架',
      },
      {
        narration: '真正的差别不只在名称，而在适用条件、变化方向和结果。用一个统一标准逐项比较，就能避免被表面相似误导。',
        visual: '用统一坐标和相反箭头表现关键差异。',
        elements: ['arrow-up', 'arrow-down'],
        purpose: '比较关键标准',
      },
      {
        narration: `所以，判断${topic}时要先确认场景，再看关键标准。记住这些差异，比单独背诵定义更可靠。`,
        visual: '用检查标记总结判断顺序。',
        elements: ['check', 'compass'],
        purpose: '总结判断方法',
      },
    ],
  }
  return { title: topic.slice(0, 18), audience, scenes: scenes[kind] }
}

const BACKGROUNDS: Record<StyleToken, { from: string; to: string }> = {
  'hand-drawn': { from: '#F7F2E7', to: '#E8DCC8' },
  'flat-cartoon': { from: '#FFF6EC', to: '#E8F4F8' },
  'tech-geometric': { from: '#0E1420', to: '#18243A' },
  'minimal-fresh': { from: '#FAFAF7', to: '#EDF3EF' },
}

export function createSafeDsl(script: VideoScript, options: DslOptions): VideoDsl {
  const background = BACKGROUNDS[options.style]
  const dsl: VideoDsl = {
    dsl: '1.0',
    meta: {
      title: script.title,
      style: options.style,
      resolution: options.resolution ?? '1920x1080',
      subtitle: true,
    },
    scenes: script.scenes.map((scene, index) => {
      const src = scene.elements.find(hasAsset) ?? FALLBACK_ASSET
      return {
        narration: scene.narration,
        background: { type: 'gradient', from: background.from, to: background.to },
        elements: [
          {
            id: `safe-title-${index}`,
            type: 'text',
            content: index === 0 ? script.title : `关键要点 ${index + 1}`,
            position: [0.5, 0.15],
            fontSize: 62,
            enter: { anim: 'pop', dur: 0.7 },
          },
          {
            id: `safe-shape-${index}`,
            type: 'shape',
            shape: 'circle',
            size: 0.32,
            position: [0.5, 0.44],
            enter: { anim: 'draw', dur: 1, delay: 0.2 },
          },
          {
            id: `safe-icon-${index}`,
            type: 'image',
            src,
            position: [0.5, 0.44],
            scale: 0.2,
            enter: { anim: 'scale', delay: 0.4 },
            loop: { anim: 'float', period: 3 },
          },
          {
            id: `safe-visual-${index}`,
            type: 'text',
            content: scene.visual,
            position: [0.5, 0.69],
            fontSize: 32,
            maxWidth: 1300,
            enter: { anim: 'fade', delay: 0.8 },
          },
        ],
        transition: { out: 'fade', dur: 0.5 },
      }
    }),
  }
  return applyDefaults(dsl).dsl
}
