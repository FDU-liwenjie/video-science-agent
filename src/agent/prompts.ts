import { ASSET_IDS } from '../dsl/assets'
import {
  CHART_KINDS,
  ENTER_ANIMS,
  LOOP_ANIMS,
  PARTICLE_KINDS,
  SHAPE_KINDS,
  TRANSITION_KINDS,
  type StyleToken,
} from '../dsl/types'
import type { VideoDsl } from '../dsl/types'
import type { ChatMessage } from './deepseek'
import type { DslOptions, ScriptRequest, VideoScript } from './types'

const STYLE_GUIDES: Record<StyleToken, string> = {
  'hand-drawn': '手绘线稿、纸张质感、温暖、像老师在白板上画图',
  'flat-cartoon': '扁平插画、圆润、活泼、高饱和但保持文字清晰',
  'tech-geometric': '几何线条、深色背景、发光、理性克制、数据感',
  'minimal-fresh': '极简、大量留白、清新、低饱和、少而准的视觉元素',
}

const SCRIPT_SYSTEM_PROMPT = `你是科普视频编剧。只输出一个 JSON 对象，不要 Markdown，不要解释。
结构必须是：{
  "title": "不超过18字的视频标题",
  "audience": "目标受众",
  "scenes": [{
    "narration": "40-80字、口语化、准确的中文旁白",
    "visual": "这一幕的具体画面描述",
    "elements": ["素材id"],
    "purpose": "这一幕承担的讲解目的"
  }]
}
要求：第一幕提出好问题，中间解释机制或步骤，最后一幕总结并纠正常见误解；不编造数据；不把标题当旁白反复念。`

const DSL_SYSTEM_PROMPT = `你是“剧本到视频分镜 DSL”的确定性翻译器。只输出 JSON 对象，不要 Markdown，不要解释。
硬性规则：
1. 顶层为 { "dsl": "1.0", "meta": {...}, "scenes": [...] }，严格遵守输入要求的 style 和 resolution。
2. scenes 的数量、顺序与剧本完全一致，每幕 narration 必须逐字保留剧本文字。
3. 有 narration 的幕不要填写 duration，幕长由真实 TTS 时长决定；无旁白过渡幕才写正数 duration。
4. 只能使用六种元素 text / image / shape / line / particle / chart，不要使用 path 或 highlight。
5. position 和 line.points 都使用 0-1 归一化坐标；底部 y>0.80 留给字幕，主要文字放在 y=0.12-0.75。
6. image.src 只能从这里选择：${ASSET_IDS.join(', ')}。
7. shape：${SHAPE_KINDS.join(' / ')}；particle：${PARTICLE_KINDS.join(' / ')}；chart：${CHART_KINDS.join(' / ')}。
8. enter.anim：${ENTER_ANIMS.join(' / ')}；loop.anim：${LOOP_ANIMS.join(' / ')}；transition.out：${TRANSITION_KINDS.join(' / ')}。
9. 每幕 3-6 个有讲解作用的元素，必须含一个标题或关键文字；优先用 line 表达关系、chart 表达变化，不堆砌装饰。
10. 动画只使用上述枚举。fade/typewriter 适合文字，pop/scale 适合重点，draw 适合线条，grow 适合图表；loop 仅用于少量持续运动。
11. background 只能是 {type:'solid',color:'#RRGGBB'} 或 {type:'gradient',from:'#RRGGBB',to:'#RRGGBB'}。
12. 不要输出代码、注释、额外字段或无法执行的外部图片 URL。`

const FEW_SHOTS: { script: VideoScript; dsl: VideoDsl }[] = [
  {
    script: {
      title: '蝴蝶效应',
      audience: '高中生',
      scenes: [
        {
          narration: '为什么一个几乎可以忽略的小误差，最后却能改变整片天气？这就是蝴蝶效应研究的问题。',
          visual: '蝴蝶停在中央，标题在上方，疑问在下方出现。',
          elements: ['butterfly'],
          purpose: '用反常识问题引入概念',
        },
        {
          narration: '关键不是蝴蝶直接制造风暴，而是混沌系统会在反复反馈中放大初始差异，让后来的路径越来越不同。',
          visual: '小圆经过箭头逐渐变成大圆，表现反馈放大。',
          elements: ['gear'],
          purpose: '解释敏感依赖与反馈放大',
        },
      ],
    },
    dsl: {
      dsl: '1.0',
      meta: { title: '蝴蝶效应', style: 'hand-drawn', resolution: '1920x1080' },
      scenes: [
        {
          narration: '为什么一个几乎可以忽略的小误差，最后却能改变整片天气？这就是蝴蝶效应研究的问题。',
          background: { type: 'solid', color: '#F7F2E7' },
          elements: [
            { id: 'title', type: 'text', content: '蝴蝶效应', position: [0.5, 0.16], fontSize: 72, enter: { anim: 'pop' } },
            { id: 'insect', type: 'image', src: 'butterfly', position: [0.5, 0.46], scale: 0.25, loop: { anim: 'float' } },
            { id: 'question', type: 'text', content: '小误差为何改变天气？', position: [0.5, 0.7], fontSize: 38, enter: { anim: 'typewriter' } },
          ],
          transition: { out: 'fade' },
        },
        {
          narration: '关键不是蝴蝶直接制造风暴，而是混沌系统会在反复反馈中放大初始差异，让后来的路径越来越不同。',
          background: { type: 'solid', color: '#F7F2E7' },
          elements: [
            { id: 'title2', type: 'text', content: '反馈让差异放大', position: [0.5, 0.15], fontSize: 56 },
            { id: 'small', type: 'shape', shape: 'circle', size: 0.08, position: [0.3, 0.47], enter: { anim: 'pop' } },
            { id: 'arrow', type: 'line', points: [[0.38, 0.47], [0.62, 0.47]], arrow: true, enter: { anim: 'draw' } },
            { id: 'large', type: 'shape', shape: 'circle', size: 0.2, position: [0.73, 0.47], enter: { anim: 'pop' } },
            { id: 'caption', type: 'text', content: '初始差异 → 反馈 → 路径分岔', position: [0.5, 0.72], fontSize: 34 },
          ],
        },
      ],
    },
  },
  {
    script: {
      title: '光合作用',
      audience: '初中生',
      scenes: [
        {
          narration: '植物并不是把土壤当成食物。叶片利用光能，把二氧化碳和水转化成有机物，同时释放氧气。',
          visual: '太阳照向叶片，水滴和空气进入，箭头指向有机物。',
          elements: ['sun', 'leaf', 'drop', 'cloud'],
          purpose: '说明光合作用的原料与产物',
        },
      ],
    },
    dsl: {
      dsl: '1.0',
      meta: { title: '光合作用', style: 'flat-cartoon', resolution: '1920x1080' },
      scenes: [
        {
          narration: '植物并不是把土壤当成食物。叶片利用光能，把二氧化碳和水转化成有机物，同时释放氧气。',
          background: { type: 'gradient', from: '#FFF6EC', to: '#EAF7E8' },
          elements: [
            { id: 'title', type: 'text', content: '叶片里的能量转换', position: [0.5, 0.15], fontSize: 58 },
            { id: 'sun', type: 'image', src: 'sun', position: [0.18, 0.38], scale: 0.16, loop: { anim: 'pulse' } },
            { id: 'leaf', type: 'image', src: 'leaf', position: [0.52, 0.47], scale: 0.25 },
            { id: 'energy', type: 'line', points: [[0.27, 0.4], [0.4, 0.45]], arrow: true, enter: { anim: 'draw' } },
            { id: 'formula', type: 'text', content: '光能 + 水 + 二氧化碳 → 有机物 + 氧气', position: [0.5, 0.72], fontSize: 34, maxWidth: 1400 },
          ],
        },
      ],
    },
  },
  {
    script: {
      title: '勾股定理',
      audience: '初中生',
      scenes: [
        {
          narration: '直角三角形的三条边有一个稳定关系：两条直角边的平方和，等于斜边的平方。',
          visual: '直角三角形标出 a、b、c，旁边显示面积关系公式。',
          elements: ['calculator', 'equals'],
          purpose: '建立边长与面积关系',
        },
      ],
    },
    dsl: {
      dsl: '1.0',
      meta: { title: '勾股定理', style: 'tech-geometric', resolution: '1920x1080' },
      scenes: [
        {
          narration: '直角三角形的三条边有一个稳定关系：两条直角边的平方和，等于斜边的平方。',
          background: { type: 'solid', color: '#0E1420' },
          elements: [
            { id: 'title', type: 'text', content: '勾股定理', position: [0.5, 0.15], fontSize: 62 },
            { id: 'triangle', type: 'line', points: [[0.25, 0.65], [0.25, 0.32], [0.52, 0.65], [0.25, 0.65]], enter: { anim: 'draw' } },
            { id: 'labels', type: 'text', content: 'a        b        c', position: [0.36, 0.7], fontSize: 34 },
            { id: 'formula', type: 'text', content: 'a² + b² = c²', position: [0.72, 0.48], fontSize: 64, enter: { anim: 'scale' } },
          ],
        },
      ],
    },
  },
]

export function buildScriptMessages(request: ScriptRequest): ChatMessage[] {
  const duration = request.duration ?? 60
  const sceneCount = Math.min(6, Math.max(4, Math.round(duration / 15)))
  const audience = request.audience?.trim() || '高中生，避免专业术语，多用生活比喻'
  return [
    { role: 'system', content: SCRIPT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请为以下知识点写 ${sceneCount} 幕科普视频剧本。
知识点：${request.topic.trim()}
目标受众与表达要求：${audience}
目标时长：约 ${duration} 秒，按中文每秒约4字控制总旁白量。
视觉风格：${STYLE_GUIDES[request.style]}（token: ${request.style}）
补充要求：${request.requirements?.trim() || '无'}
可用素材 id：${ASSET_IDS.join(', ')}`,
    },
  ]
}

export function buildDslMessages(script: VideoScript, options: DslOptions): ChatMessage[] {
  const examples = FEW_SHOTS.map(
    (example, index) =>
      `示例 ${index + 1} 剧本：\n${JSON.stringify(example.script)}\n示例 ${index + 1} DSL：\n${JSON.stringify(example.dsl)}`,
  ).join('\n\n')
  return [
    { role: 'system', content: DSL_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `${examples}\n\n现在翻译下面的新剧本。style 必须为 ${options.style}，resolution 必须为 ${options.resolution ?? '1920x1080'}，scene 数量与 narration 必须保持不变：\n${JSON.stringify(script)}`,
    },
  ]
}

export function repairMessages(prompt: string): ChatMessage[] {
  return [
    { role: 'system', content: DSL_SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ]
}
