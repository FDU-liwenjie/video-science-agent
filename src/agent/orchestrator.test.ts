import { describe, expect, it, vi } from 'vitest'
import { validateDsl } from '../dsl/validate'
import type { VideoDsl } from '../dsl/types'
import { DeepSeekClient } from './deepseek'
import { parseJsonContent } from './deepseek'
import { VideoAgent } from './orchestrator'
import { parseVideoScript } from './script'
import type { VideoScript } from './types'

const script: VideoScript = {
  title: '测试知识点',
  audience: '高中生',
  scenes: [
    {
      narration: '为什么一个小变化，会在系统里产生完全不同的结果？我们先从最关键的关系看起。',
      visual: '中央放置一个对象，用箭头展示变化。',
      elements: ['butterfly'],
      purpose: '提出问题',
    },
  ],
}

const validDsl: VideoDsl = {
  dsl: '1.0',
  meta: { title: '测试知识点', style: 'hand-drawn', resolution: '1920x1080' },
  scenes: [
    {
      narration: script.scenes[0].narration,
      elements: [
        { type: 'text', content: '测试知识点', position: [0.5, 0.2] },
        { type: 'image', src: 'butterfly', position: [0.5, 0.5] },
      ],
    },
  ],
}

function apiResponse(content: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: typeof content === 'string' ? content : JSON.stringify(content),
          },
        },
      ],
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

function fetcherWith(...responses: Response[]) {
  const fetcher = vi.fn<typeof fetch>()
  for (const response of responses) fetcher.mockResolvedValueOnce(response)
  return fetcher
}

describe('DeepSeekClient', () => {
  it('清理 JSON 代码块和 JSON 前后的说明文字', () => {
    expect(parseJsonContent('```json\n{"ok":true}\n```')).toEqual({ ok: true })
    expect(parseJsonContent('生成结果：\n{"ok":true}\n完毕')).toEqual({ ok: true })
  })

  it('使用 Bearer 密钥并强制 JSON 输出模式', async () => {
    const fetcher = fetcherWith(apiResponse({ ok: true }))
    const client = new DeepSeekClient({ apiKey: 'secret-test', fetcher })
    await expect(client.completeJson([{ role: 'user', content: '测试' }])).resolves.toEqual({ ok: true })

    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('https://api.deepseek.com/chat/completions')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer secret-test' })
    const body = JSON.parse(String(init?.body))
    expect(body.model).toBe('deepseek-chat')
    expect(body.response_format).toEqual({ type: 'json_object' })
  })
})

describe('VideoAgent', () => {
  it('依次生成剧本和 DSL，并注入素材、动画和 few-shot', async () => {
    const fetcher = fetcherWith(apiResponse(script), apiResponse(validDsl))
    const agent = new VideoAgent({ apiKey: 'test', fetcher })
    const result = await agent.generate({ topic: '蝴蝶效应', style: 'hand-drawn' })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.script).toEqual(script)
    expect(result.usedFallback).toBe(false)
    expect(result.dsl.scenes[0].elements?.[0].enter).toEqual({ anim: 'fade', dur: 0.6, delay: 0 })
    expect(result.events.at(-1)?.stage).toBe('complete')

    const dslRequest = JSON.parse(String(fetcher.mock.calls[1][1]?.body))
    expect(dslRequest.messages[0].content).toContain('butterfly')
    expect(dslRequest.messages[0].content).toContain('typewriter')
    expect(dslRequest.messages[1].content).toContain('光合作用')
    expect(dslRequest.messages[1].content).toContain('勾股定理')
  })

  it('编辑剧本后只调用一次 DSL 生成，不重跑剧本', async () => {
    const edited = structuredClone(script)
    edited.scenes[0].narration = '这是用户亲自修改后的旁白，生成分镜时必须原样保留。'
    const editedDsl = structuredClone(validDsl)
    editedDsl.scenes[0].narration = edited.scenes[0].narration
    const fetcher = fetcherWith(apiResponse(editedDsl))
    const agent = new VideoAgent({ apiKey: 'test', fetcher })

    const result = await agent.generateDsl(edited, { style: 'hand-drawn' })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.dsl.scenes[0].narration).toBe(edited.scenes[0].narration)
    expect(result.repairs).toBe(0)
  })

  it('改写旁白或结构错误时，最多执行两轮确定性修复', async () => {
    const changedNarration = structuredClone(validDsl)
    changedNarration.scenes[0].narration = 'LLM 擅自改写的旁白'
    const emptyScenes = structuredClone(validDsl)
    emptyScenes.scenes = []
    const fetcher = fetcherWith(
      apiResponse(changedNarration),
      apiResponse(emptyScenes),
      apiResponse(validDsl),
    )
    const agent = new VideoAgent({ apiKey: 'test', fetcher })

    const result = await agent.generateDsl(script, { style: 'hand-drawn' })
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(result.repairs).toBe(2)
    expect(result.usedFallback).toBe(false)
    expect(validateDsl(result.dsl).ok).toBe(true)
    const repairRequest = JSON.parse(String(fetcher.mock.calls[1][1]?.body))
    expect(repairRequest.messages[1].content).toContain('scenes[0].narration')
  })

  it('两轮修复仍失败时降级为可渲染安全模板', async () => {
    const invalid = structuredClone(validDsl)
    invalid.meta.style = 'invalid' as never
    const fetcher = fetcherWith(apiResponse(invalid), apiResponse(invalid), apiResponse(invalid))
    const agent = new VideoAgent({ apiKey: 'test', fetcher })
    const emit = vi.fn()

    const result = await agent.generateDsl(script, { style: 'hand-drawn' }, emit)
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(result.repairs).toBe(2)
    expect(result.usedFallback).toBe(true)
    expect(validateDsl(result.dsl).ok).toBe(true)
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ stage: 'fallback' }))
  })

  it('剧本和 DSL API 全失败时仍返回完整安全视频', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'))
    const agent = new VideoAgent({ apiKey: 'test', fetcher })
    const result = await agent.generate({ topic: '光合作用的过程', style: 'flat-cartoon' })

    expect(result.usedFallback).toBe(true)
    expect(result.script.scenes).toHaveLength(3)
    expect(result.dsl.meta.style).toBe('flat-cartoon')
    expect(validateDsl(result.dsl).ok).toBe(true)
    expect(result.events.filter((event) => event.stage === 'fallback')).toHaveLength(2)
  })

  it('拒绝空知识点和剧本里的幻觉素材', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const agent = new VideoAgent({ apiKey: 'test', fetcher })
    await expect(agent.generate({ topic: '  ', style: 'hand-drawn' })).rejects.toThrow('知识点不能为空')
    expect(fetcher).not.toHaveBeenCalled()

    const invalid = structuredClone(script)
    invalid.scenes[0].elements = ['not-in-library']
    expect(() => parseVideoScript(invalid)).toThrow('未知素材')
  })
})
