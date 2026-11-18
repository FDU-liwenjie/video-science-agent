<template>
  <section class="player" aria-label="科普视频预览播放器">
    <div class="player__stage">
      <canvas
        ref="canvasRef"
        :width="canvasSize.width"
        :height="canvasSize.height"
        aria-label="视频画面"
        @click="togglePlay"
      />
      <button
        v-if="!isPlaying && !isStarting"
        class="player__cover-button"
        type="button"
        aria-label="播放视频"
        @click="play"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </button>
      <div v-if="isStarting" class="player__status">正在准备音频…</div>
    </div>

    <div class="player__controls">
      <div class="player__buttons">
        <button type="button" :disabled="isStarting" @click="togglePlay">
          {{ isPlaying ? '暂停' : '播放' }}
        </button>
        <button type="button" :disabled="isStarting" @click="replay">重播</button>
      </div>
      <span class="player__time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
    </div>

    <input
      class="player__seek"
      type="range"
      min="0"
      :max="duration"
      step="0.01"
      :value="currentTime"
      :disabled="isStarting"
      aria-label="视频进度"
      @input="onSeek"
    />

    <div class="player__scenes" aria-label="跳转到指定幕">
      <button
        v-for="scene in timeline.scenes"
        :key="scene.index"
        type="button"
        :class="{ active: scene.index === activeScene }"
        :disabled="isStarting"
        @click="seek(scene.start)"
      >
        第 {{ scene.index + 1 }} 幕
      </button>
    </div>

    <div class="player__export">
      <div>
        <strong>导出成片</strong>
        <span>{{ hasRecordedNarration ? '含旁白、字幕与 BGM' : '无旁白音轨时导出画面、字幕与 BGM' }}</span>
      </div>
      <div class="player__export-buttons">
        <button type="button" :disabled="isStarting || isExporting" @click="renderVideo('720p')">
          导出 720p
        </button>
        <button type="button" :disabled="isStarting || isExporting" @click="renderVideo('1080p')">
          导出 1080p
        </button>
      </div>
    </div>

    <div v-if="isExporting" class="player__export-progress">
      <div>
        <progress :value="exportProgress" max="1" />
        <span>{{ Math.round(exportProgress * 100) }}%</span>
      </div>
      <p>正在实时渲染，请保持此标签页可见，不要切换窗口。</p>
    </div>

    <div v-if="downloadUrl" class="player__download">
      <span>成片已生成</span>
      <a :href="downloadUrl" :download="downloadName">下载 {{ downloadName }}</a>
    </div>

    <p v-if="errorMessage" class="player__error" role="alert">{{ errorMessage }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { VideoDsl } from '../dsl/types'
import { applyDefaults } from '../dsl/defaults'
import {
  Engine,
  buildTimeline,
  createAmbientBgm,
  exportVideo,
  sceneIndexAt,
  type NarrationClip,
} from '../engine'

const props = defineProps<{
  dsl: VideoDsl
  narration?: (AudioBuffer | undefined)[]
  bgm?: AudioBuffer
}>()

const canvasRef = ref<HTMLCanvasElement>()
const video = computed(() => applyDefaults(props.dsl).dsl)
const timeline = computed(() =>
  buildTimeline(video.value, props.narration?.map((clip) => clip?.duration) ?? []),
)
const duration = computed(() => timeline.value.totalDuration)
const canvasSize = computed(() =>
  video.value.meta.resolution === '1080x1920'
    ? { width: 540, height: 960 }
    : { width: 960, height: 540 },
)
const activeScene = computed(() => sceneIndexAt(timeline.value, currentTime.value))
const hasRecordedNarration = computed(() => props.narration?.some(Boolean) ?? false)

const currentTime = ref(0)
const isPlaying = ref(false)
const isStarting = ref(false)
const isExporting = ref(false)
const exportProgress = ref(0)
const downloadUrl = ref('')
const downloadName = ref('')
const errorMessage = ref('')

let engine: Engine | undefined
let audioContext: AudioContext | undefined
let synthesizedBgm: AudioBuffer | undefined
let bgmGain: GainNode | undefined
let narrationGain: GainNode | undefined
let sources = new Set<AudioBufferSourceNode>()
let animationFrame = 0
let clockStartedAt = 0
let clockOffset = 0
let playRequest = 0
let activeSpeechScene = -1
let speechToken = 0

onMounted(resetEngine)
watch([video, timeline], resetEngine, { flush: 'post' })

onBeforeUnmount(() => {
  stopPlayback()
  if (downloadUrl.value) URL.revokeObjectURL(downloadUrl.value)
  void audioContext?.close()
})

async function play(): Promise<void> {
  if (isPlaying.value || isStarting.value || duration.value <= 0) return
  if (currentTime.value >= duration.value - 0.01) currentTime.value = 0

  const request = ++playRequest
  isStarting.value = true
  errorMessage.value = ''
  try {
    await ensureAudio()
    if (request !== playRequest) return
    startFrom(currentTime.value)
  } catch (error) {
    if (request === playRequest) {
      errorMessage.value = error instanceof Error ? `音频启动失败：${error.message}` : '音频启动失败'
    }
  } finally {
    if (request === playRequest) isStarting.value = false
  }
}

function pause(): void {
  if (isPlaying.value && audioContext) {
    currentTime.value = Math.min(
      duration.value,
      clockOffset + audioContext.currentTime - clockStartedAt,
    )
  }
  stopPlayback()
}

function togglePlay(): void {
  if (isPlaying.value) pause()
  else void play()
}

function replay(): void {
  stopPlayback()
  currentTime.value = 0
  engine?.renderAt(0)
  void play()
}

function seek(value: number): void {
  const resume = isPlaying.value
  stopPlayback()
  currentTime.value = Math.max(0, Math.min(duration.value, value))
  renderCurrentFrame()
  if (resume && currentTime.value < duration.value) startFrom(currentTime.value)
}

function onSeek(event: Event): void {
  seek(Number((event.target as HTMLInputElement).value))
}

function startFrom(offset: number): void {
  if (!audioContext || !engine) return
  clockOffset = offset
  clockStartedAt = audioContext.currentTime
  startAudio(offset, clockStartedAt)
  isPlaying.value = true
  syncSpeech(offset)
  animationFrame = requestAnimationFrame(tick)
}

function tick(): void {
  if (!isPlaying.value || !audioContext || !engine) return
  const t = clockOffset + audioContext.currentTime - clockStartedAt
  if (t >= duration.value) {
    currentTime.value = duration.value
    engine.renderAt(Math.max(0, duration.value - 0.001))
    stopPlayback()
    return
  }
  currentTime.value = t
  engine.renderAt(t)
  syncSpeech(t)
  animationFrame = requestAnimationFrame(tick)
}

async function ensureAudio(): Promise<void> {
  audioContext ??= new AudioContext()
  if (audioContext.state === 'suspended') await audioContext.resume()
  if (!props.bgm && !synthesizedBgm) {
    synthesizedBgm = await createAmbientBgm(duration.value)
  }
}

function startAudio(offset: number, now: number): void {
  const ctx = audioContext!
  const bgm = props.bgm ?? synthesizedBgm
  bgmGain = ctx.createGain()
  narrationGain = ctx.createGain()
  bgmGain.gain.setValueAtTime(0.22, now)
  narrationGain.gain.value = 0.9
  bgmGain.connect(ctx.destination)
  narrationGain.connect(ctx.destination)

  if (bgm) {
    const source = ctx.createBufferSource()
    source.buffer = bgm
    source.loop = true
    source.connect(bgmGain)
    source.start(now, offset % bgm.duration)
    sources.add(source)
  }

  for (const scene of timeline.value.scenes) {
    if (scene.narrationStart === null || scene.narrationEnd === null) continue
    if (scene.narrationEnd <= offset) continue

    const startInContext = now + Math.max(0, scene.narrationStart - offset)
    const endInContext = now + (scene.narrationEnd - offset)
    if (scene.narrationStart < offset) {
      bgmGain.gain.setValueAtTime(0.07, now)
    } else {
      bgmGain.gain.setTargetAtTime(0.07, startInContext, 0.12)
    }
    bgmGain.gain.setTargetAtTime(0.22, endInContext, 0.2)

    const buffer = props.narration?.[scene.index]
    if (!buffer) continue
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(narrationGain)
    const bufferOffset = Math.max(0, offset - scene.narrationStart)
    source.start(startInContext, bufferOffset)
    source.stop(endInContext)
    sources.add(source)
  }
}

function syncSpeech(t: number): void {
  const index = timeline.value.scenes.findIndex(
    (scene) =>
      scene.narrationStart !== null &&
      scene.narrationEnd !== null &&
      t >= scene.narrationStart &&
      t < scene.narrationEnd &&
      !props.narration?.[scene.index],
  )
  if (index === activeSpeechScene) return

  cancelSpeech()
  if (index < 0 || !('speechSynthesis' in window)) return

  const scene = timeline.value.scenes[index]
  const text = video.value.scenes[index].narration
  if (!text || scene.narrationStart === null || scene.narrationEnd === null) return

  const ratio = (t - scene.narrationStart) / (scene.narrationEnd - scene.narrationStart)
  const remaining = remainingText(text, ratio)
  if (!remaining) return

  const utterance = new SpeechSynthesisUtterance(remaining)
  utterance.lang = 'zh-CN'
  utterance.rate = 1
  const token = ++speechToken
  activeSpeechScene = index
  utterance.onend = () => {
    if (token === speechToken) activeSpeechScene = -1
  }
  utterance.onerror = utterance.onend
  window.speechSynthesis.speak(utterance)
}

function stopPlayback(): void {
  playRequest++
  isPlaying.value = false
  isStarting.value = false
  cancelAnimationFrame(animationFrame)
  for (const source of sources) {
    source.stop()
    source.disconnect()
  }
  sources = new Set()
  bgmGain?.disconnect()
  narrationGain?.disconnect()
  bgmGain = undefined
  narrationGain = undefined
  cancelSpeech()
}

function cancelSpeech(): void {
  speechToken++
  activeSpeechScene = -1
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

function resetEngine(): void {
  stopPlayback()
  currentTime.value = 0
  synthesizedBgm = undefined
  if (!canvasRef.value) return
  engine = new Engine({ dsl: video.value, timeline: timeline.value, canvas: canvasRef.value })
  renderCurrentFrame()
}

function renderCurrentFrame(): void {
  engine?.renderAt(Math.min(currentTime.value, Math.max(0, duration.value - 0.001)))
}

async function renderVideo(quality: '720p' | '1080p'): Promise<void> {
  if (isExporting.value) return
  pause()
  isExporting.value = true
  exportProgress.value = 0
  errorMessage.value = ''
  if (downloadUrl.value) URL.revokeObjectURL(downloadUrl.value)
  downloadUrl.value = ''
  downloadName.value = ''

  try {
    const portrait = video.value.meta.resolution === '1080x1920'
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = quality === '1080p' ? (portrait ? 1080 : 1920) : portrait ? 720 : 1280
    exportCanvas.height = quality === '1080p' ? (portrait ? 1920 : 1080) : portrait ? 1280 : 720
    const exportEngine = new Engine({
      dsl: video.value,
      timeline: timeline.value,
      canvas: exportCanvas,
    })
    const bgm = props.bgm ?? synthesizedBgm ?? (await createAmbientBgm(duration.value))
    const clips: NarrationClip[] = timeline.value.scenes.flatMap((scene) => {
      const buffer = props.narration?.[scene.index]
      if (!buffer || scene.narrationStart === null || scene.narrationEnd === null) return []
      return [{ buffer, start: scene.narrationStart, end: scene.narrationEnd }]
    })
    const result = await exportVideo({
      engine: exportEngine,
      canvas: exportCanvas,
      narration: clips,
      bgm,
      fps: 30,
      onProgress: (ratio) => {
        exportProgress.value = ratio
      },
    })
    downloadUrl.value = URL.createObjectURL(result.blob)
    downloadName.value = result.filename
  } catch (error) {
    errorMessage.value = error instanceof Error ? `导出失败：${error.message}` : '导出失败'
  } finally {
    isExporting.value = false
  }
}

function remainingText(text: string, ratio: number): string {
  if (ratio <= 0) return text
  const tokens = text.match(/[a-zA-Z0-9]+\s*|[\s\S]/g) ?? []
  return tokens.slice(Math.floor(tokens.length * Math.min(1, ratio))).join('').trimStart()
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

defineExpose({ play, pause, replay, seek })
</script>
