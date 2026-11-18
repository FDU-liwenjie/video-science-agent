<template>
  <main class="app">
    <header class="hero">
      <span class="hero__badge">W1 · 确定性渲染引擎</span>
      <h1>视频科普 Agent</h1>
      <p>输入任意知识点，自动生成带配音、字幕和动画的科普视频。</p>
    </header>

    <PreviewPlayer :dsl="butterflyDsl" />

    <section class="demo-note">
      <div>
        <strong>蝴蝶效应 · 三幕实时样例</strong>
        <p>六类元素、进场与循环动画、转场、字幕均由同一份 DSL 驱动。</p>
      </div>
      <span>浏览器语音 + 合成 BGM</span>
    </section>
  </main>
</template>

<script setup lang="ts">
import PreviewPlayer from './components/PreviewPlayer.vue'
import { butterflyDsl } from './demo/butterfly'
</script>
