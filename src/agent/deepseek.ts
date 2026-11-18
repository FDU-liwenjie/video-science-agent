export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

export interface DeepSeekClientOptions {
  apiKey: string
  fetcher?: typeof fetch
  model?: string
  timeoutMs?: number
}

export interface CompletionOptions {
  temperature?: number
  maxTokens?: number
}

interface DeepSeekResponse {
  choices?: {
    message?: {
      content?: string
    }
  }[]
}

export class DeepSeekClient {
  private readonly fetcher: typeof fetch
  private readonly model: string
  private readonly timeoutMs: number

  constructor(private readonly options: DeepSeekClientOptions) {
    if (!options.apiKey.trim()) throw new Error('缺少 DeepSeek API key')
    this.fetcher = options.fetcher ?? fetch
    this.model = options.model ?? 'deepseek-chat'
    this.timeoutMs = options.timeoutMs ?? 60_000
  }

  async completeJson(messages: ChatMessage[], options: CompletionOptions = {}): Promise<unknown> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetcher('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          response_format: { type: 'json_object' },
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 8000,
          stream: false,
        }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`DeepSeek 请求失败（HTTP ${response.status}）`)

      const payload = (await response.json()) as DeepSeekResponse
      const content = payload.choices?.[0]?.message?.content
      if (!content) throw new Error('DeepSeek 返回了空内容')
      return parseJsonContent(content)
    } finally {
      clearTimeout(timeout)
    }
  }
}

export function parseJsonContent(content: string): unknown {
  const trimmed = content.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1] ?? trimmed
  try {
    return JSON.parse(fenced)
  } catch {
    const start = fenced.indexOf('{')
    const end = fenced.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(fenced.slice(start, end + 1))
    throw new Error('DeepSeek 返回内容不是有效 JSON')
  }
}
