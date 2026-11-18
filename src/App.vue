<template>
  <main class="app">
    <header class="hero">
      <span class="hero__badge">W1 · 确定性渲染引擎</span>
      <h1>视频科普 Agent</h1>
      <p>输入任意知识点，自动生成带配音、字幕和动画的科普视频。</p>
    </header>

    <PreviewPlayer :dsl="butterflyDsl" :narration="narration" :bgm="bgm" />

    <section class="demo-note">
      <div>
        <strong>蝴蝶效应 · 三幕实时样例</strong>
        <p>六类元素、进场与循环动画、转场、字幕均由同一份 DSL 驱动。</p>
      </div>
      <span>{{ audioStatus }}</span>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PreviewPlayer from './components/PreviewPlayer.vue'
import { butterflyDsl } from './demo/butterfly'
import { applyDefaults } from './dsl/defaults'
import { buildTimeline, createAmbientBgm } from './engine'

const narration = ref<(AudioBuffer | undefined)[]>([])
const bgm = ref<AudioBuffer>()
const audioStatus = ref('正在加载中文旁白…')

onMounted(async () => {
  const decoder = new AudioContext()
  try {
    const clips = await Promise.all(
      [1, 2, 3].map(async (index) => {
        const response = await fetch(`/audio/butterfly-scene${index}.m4a`)
        if (!response.ok) throw new Error(`旁白 ${index} 加载失败`)
        return decoder.decodeAudioData(await response.arrayBuffer())
      }),
    )
    narration.value = clips
    const video = applyDefaults(butterflyDsl).dsl
    const timeline = buildTimeline(video, clips.map((clip) => clip.duration))
    bgm.value = await createAmbientBgm(timeline.totalDuration)
    audioStatus.value = '中文旁白 + 合成 BGM'
  } catch {
    audioStatus.value = '旁白加载失败，已降级浏览器语音'
  } finally {
    await decoder.close()
  }
})
</script>
