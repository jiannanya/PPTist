<template>
  <div class="clip-video-editor">
    <div class="clip-toolbar">
      <div class="clip-actions">
        <button
          class="clip-button"
          :disabled="!clipReady || exporting"
          @click="sendStoryboard(false)"
        >
          {{ exporting ? `正在录制 ${exportProgress}` : '同步全部动态分镜' }}
        </button>
        <button
          class="clip-button primary"
          :disabled="!clipReady || exporting"
          @click="sendStoryboard(true)"
        >
          一键组片并渲染
        </button>
        <button class="clip-button ghost" @click="openClipJs()">
          新窗口打开
        </button>
      </div>

      <label class="duration-control">
        无时间轴分镜
        <input v-model.number="fallbackDuration" type="number" min="0.5" max="60" step="0.5" />
        秒
      </label>

      <label class="duration-control">
        动效录制帧率
        <input v-model.number="captureFps" type="number" min="6" max="60" step="1" />
        FPS
      </label>

      <div class="clip-status" :class="statusTone">
        <span class="status-dot"></span>
        {{ statusText }}
      </div>
    </div>

    <div class="clip-frame-wrap">
      <iframe
        ref="clipFrameRef"
        class="clip-frame"
        :src="clipEditorUrl"
        title="Clip-JS 视频剪辑器"
        allow="cross-origin-isolated; fullscreen; clipboard-read; clipboard-write"
      ></iframe>

      <div class="clip-connection-help" v-if="!clipReady">
        <strong>正在连接 Clip-JS</strong>
        <span>请先运行 <code>npm run dev:clip</code>，或配置 <code>VITE_CLIP_JS_URL</code>。</span>
        <span>Clip-JS 会在浏览器本地完成动态分镜组片与 FFmpeg 渲染。</span>
      </div>
    </div>

    <div
      class="capture-deck"
      ref="captureDeckRef"
      :style="captureDeckStyle"
      aria-hidden="true"
    >
      <ScreenSlide
        v-if="captureSlide"
        :key="captureSlide.id"
        :slide="captureSlide"
        :active="false"
        :scale="1"
        :animationIndex="-1"
        :turnSlideToId="noop"
        :manualExitFullscreen="noop"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import html2canvas from 'html2canvas'
import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { useSlidesStore } from '@/store'
import type { Slide } from '@/types/slides'
import {
  createMotionTimeline,
  disposeMotionTimeline,
  getMotionDuration,
} from '@/utils/gsapMotion'
import message from '@/utils/message'

import ScreenSlide from '@/views/Screen/ScreenSlide.vue'

const BRIDGE_VERSION = 1
const CLIP_JS_BASE_URL = (import.meta.env.VITE_CLIP_JS_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const noop = () => {}

const slidesStore = useSlidesStore()
const { slides, title, viewportSize, viewportRatio } = storeToRefs(slidesStore)

const clipFrameRef = useTemplateRef<HTMLIFrameElement>('clipFrameRef')
const captureDeckRef = useTemplateRef<HTMLElement>('captureDeckRef')
const captureSlide = ref<Slide | null>(null)
const clipReady = ref(false)
const rendererReady = ref(false)
const exporting = ref(false)
const exportProgress = ref('')
const fallbackDuration = ref(4)
const captureFps = ref(30)
const statusText = ref('等待 Clip-JS')
const statusTone = ref<'idle' | 'working' | 'success' | 'error'>('idle')
const pendingAutoRender = ref(false)
const clipProjectId = ref('')
const bridgeToken = crypto.randomUUID()
let captureBackend: 'cached' | 'compatible' = 'cached'

const clipEditorUrl = computed(() => {
  const url = new URL(`${CLIP_JS_BASE_URL}/projects/pptist-bridge`)
  url.searchParams.set('embed', '1')
  url.searchParams.set('bridge', bridgeToken)
  url.searchParams.set('parentOrigin', window.location.origin)
  return url.toString()
})

const clipOrigin = computed(() => new URL(clipEditorUrl.value).origin)
const captureDeckStyle = computed(() => ({
  width: `${viewportSize.value}px`,
  height: `${Math.round(viewportSize.value * viewportRatio.value)}px`,
}))

const setStatus = (
  text: string,
  tone: 'idle' | 'working' | 'success' | 'error' = 'idle'
) => {
  statusText.value = text
  statusTone.value = tone
}

const getCaptureFps = () => {
  const value = Math.round(Number(captureFps.value) || slides.value[0]?.motion?.fps || 30)
  return Math.min(60, Math.max(6, value))
}

const sceneDuration = (slide: Slide) => {
  if (!slide.motion) return Math.max(0.5, Number(fallbackDuration.value) || 4)

  const timeScale = Math.max(0.05, Math.abs(Number(slide.motion.timeScale) || 1))
  const repeat = Math.max(0, Number(slide.motion.repeat) || 0)
  return Math.max(0.5, (getMotionDuration(slide.motion) * (repeat + 1)) / timeScale)
}

const postToClipJs = (payload: Record<string, unknown>, transfer: Transferable[] = []) => {
  const frameWindow = clipFrameRef.value?.contentWindow
  if (!frameWindow) throw new Error('Clip-JS iframe 尚未加载')
  frameWindow.postMessage({
    version: BRIDGE_VERSION,
    token: bridgeToken,
    ...payload,
  }, clipOrigin.value, transfer)
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

const waitForSlideAssets = async (root: HTMLElement) => {
  await document.fonts?.ready
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'))
  await Promise.all(images.map(async image => {
    if (image.complete && image.naturalWidth > 0) return
    try {
      await image.decode()
    } catch {
      // html2canvas will report a useful resource error if decoding is impossible.
    }
  }))
  await nextFrame()
  await nextFrame()
}

interface CachedFrameRenderer {
  capture: () => Promise<HTMLCanvasElement>
  dispose: () => void
}

const serializeComputedStyle = (element: Element) => {
  const style = getComputedStyle(element)
  let cssText = ''
  for (let index = 0; index < style.length; index++) {
    const property = style.item(index)
    cssText += `${property}:${style.getPropertyValue(property)}${style.getPropertyPriority(property) ? ' !important' : ''};`
  }
  return cssText
}

const createCachedFrameRenderer = (
  root: HTMLElement,
  width: number,
  height: number
): CachedFrameRenderer => {
  const clone = root.cloneNode(true) as HTMLElement
  const liveNodes = [root, ...Array.from(root.querySelectorAll('*'))]
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll('*'))]
  if (liveNodes.length !== cloneNodes.length) {
    throw new Error('动态分镜缓存树与播放树不一致')
  }

  const baseStyles = liveNodes.map(serializeComputedStyle)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) throw new Error('无法创建分镜录制画布')

  const capture = async () => {
    for (let index = 0; index < liveNodes.length; index++) {
      const inlineStyle = liveNodes[index].getAttribute('style')
      cloneNodes[index].setAttribute(
        'style',
        inlineStyle ? `${baseStyles[index]};${inlineStyle}` : baseStyles[index]
      )
    }

    const markup = new XMLSerializer().serializeToString(clone)
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<foreignObject x="0" y="0" width="${width}" height="${height}">`,
      markup,
      '</foreignObject>',
      '</svg>',
    ].join('')
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))

    try {
      const image = new Image()
      image.decoding = 'sync'
      image.src = url
      await image.decode()
      context.clearRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)
      return canvas
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return {
    capture,
    dispose: () => {
      canvas.width = 1
      canvas.height = 1
    },
  }
}

const captureCompatibleCanvas = async (root: HTMLElement, width: number, height: number) => {
  return html2canvas(root, {
    backgroundColor: null,
    scale: 1,
    useCORS: true,
    allowTaint: false,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    imageTimeout: 15000,
    removeContainer: true,
  })
}

const getEncoderConfig = async (width: number, height: number, fps: number) => {
  if (!('VideoEncoder' in globalThis) || !('VideoFrame' in globalThis)) {
    throw new Error('当前浏览器不支持 WebCodecs，请使用最新版 Chrome 或 Edge')
  }

  const bitrate = Math.round(Math.min(20_000_000, Math.max(2_000_000, width * height * fps * 0.14)))
  const codecCandidates = ['avc1.420028', 'avc1.4d4028', 'avc1.640028']

  for (const codec of codecCandidates) {
    const config: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate,
      framerate: fps,
      latencyMode: 'quality',
      hardwareAcceleration: 'prefer-hardware',
      avc: { format: 'avc' },
    }
    const support = await VideoEncoder.isConfigSupported(config)
    if (support.supported) return config
  }

  throw new Error(`浏览器无法编码 ${width}×${height} H.264 视频`)
}

const encodeSlide = async (
  slide: Slide,
  index: number,
  total: number,
  width: number,
  height: number,
  fps: number
) => {
  captureSlide.value = slide
  await nextTick()

  const stage = captureDeckRef.value
  const root = stage?.querySelector<HTMLElement>('.screen-slide')
  if (!stage || !root) throw new Error(`第 ${index + 1} 页录制舞台未挂载`)

  await waitForSlideAssets(root)

  const duration = sceneDuration(slide)
  const frameCount = Math.max(1, Math.ceil(duration * fps))
  const encodedDuration = frameCount / fps
  const frameDurationUs = Math.round(1_000_000 / fps)
  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: fps,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  })

  let encoderError: Error | null = null
  const encoder = new VideoEncoder({
    output: (chunk, metadata) => {
      try {
        muxer.addVideoChunk(chunk, metadata)
      } catch (error) {
        encoderError = error instanceof Error ? error : new Error(String(error))
      }
    },
    error: error => {
      encoderError = error
    },
  })
  encoder.configure(await getEncoderConfig(width, height, fps))

  const timeline = slide.motion?.version === 1
    ? createMotionTimeline(root, slide.motion, { paused: true })
    : null
  const timeScale = Math.max(0.05, Math.abs(Number(slide.motion?.timeScale) || 1))
  let cachedRenderer: CachedFrameRenderer | null = null
  let staticCanvas: HTMLCanvasElement | null = null

  try {
    if (captureBackend === 'cached') {
      try {
        cachedRenderer = createCachedFrameRenderer(root, width, height)
      } catch (error) {
        captureBackend = 'compatible'
        console.warn('Cached storyboard renderer unavailable; switching to html2canvas:', error)
      }
    }

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      if (encoderError) throw encoderError
      while (encoder.encodeQueueSize > 6) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        if (encoderError) throw encoderError
      }

      const sampleTime = Math.min(duration, frameIndex / fps)
      if (timeline) {
        timeline.totalTime(sampleTime * timeScale, true)
        await nextFrame()
      }

      if (!timeline && staticCanvas) {
        // Static pages only need one DOM rasterization; the canvas can be encoded repeatedly.
      } else {
        if (cachedRenderer && captureBackend === 'cached') {
          try {
            staticCanvas = await cachedRenderer.capture()
          } catch (error) {
            captureBackend = 'compatible'
            cachedRenderer.dispose()
            cachedRenderer = null
            console.warn('Cached storyboard capture failed; switching to html2canvas:', error)
            staticCanvas = await captureCompatibleCanvas(root, width, height)
          }
        } else {
          staticCanvas = await captureCompatibleCanvas(root, width, height)
        }
      }

      exportProgress.value = `${index + 1}/${total} · ${frameIndex + 1}/${frameCount}`
      const frame = new VideoFrame(staticCanvas, {
        timestamp: Math.round(frameIndex * 1_000_000 / fps),
        duration: frameDurationUs,
      })
      encoder.encode(frame, {
        keyFrame: frameIndex === 0 || frameIndex % Math.max(1, fps * 2) === 0,
      })
      frame.close()
    }

    await encoder.flush()
    if (encoderError) throw encoderError
    muxer.finalize()
  } finally {
    disposeMotionTimeline(timeline)
    cachedRenderer?.dispose()
    if (encoder.state !== 'closed') encoder.close()
    staticCanvas = null
  }

  return {
    data: target.buffer,
    duration: encodedDuration,
  }
}

const captureSlides = async () => {
  captureBackend = 'cached'
  const width = Math.round(viewportSize.value)
  const height = Math.round(viewportSize.value * viewportRatio.value)
  const fps = getCaptureFps()
  let positionStart = 0
  const clips = []
  const transfer: Transferable[] = []

  try {
    for (let index = 0; index < slides.value.length; index++) {
      const encoded = await encodeSlide(
        slides.value[index],
        index,
        slides.value.length,
        width,
        height,
        fps
      )
      clips.push({
        id: `pptist-scene-${index + 1}`,
        fileName: `scene-${String(index + 1).padStart(3, '0')}.mp4`,
        mimeType: 'video/mp4',
        data: encoded.data,
        duration: encoded.duration,
        positionStart,
        hasAudio: false,
      })
      transfer.push(encoded.data)
      positionStart += encoded.duration
    }
  } finally {
    captureSlide.value = null
  }

  return {
    clips,
    transfer,
    width,
    height,
    fps,
    duration: positionStart,
  }
}

const requestRender = () => {
  postToClipJs({ type: 'pptist:clipjs:render' })
  pendingAutoRender.value = false
  setStatus('Clip-JS 正在按分镜原比例渲染完整视频', 'working')
}

const normalizeError = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return '分镜同步失败'
  }
}

const sendStoryboard = async (autoRender: boolean) => {
  if (!clipReady.value || exporting.value) return

  exporting.value = true
  pendingAutoRender.value = autoRender
  rendererReady.value = false
  setStatus('正在逐页运行 GSAP 并录制动态分镜', 'working')

  try {
    const result = await captureSlides()
    postToClipJs({
      type: 'pptist:clipjs:import',
      autoRender,
      project: {
        id: `pptist-${Date.now()}`,
        name: title.value || 'PPTist storyboard',
        width: result.width,
        height: result.height,
        fps: result.fps,
        clips: result.clips,
      },
    }, result.transfer)
    setStatus(
      `已发送 ${result.clips.length} 个动态分镜 · ${result.width}×${result.height} · ${result.fps} FPS`,
      'working'
    )
  } catch (error) {
    pendingAutoRender.value = false
    const text = normalizeError(error)
    console.error('Failed to capture PPTist storyboard:', error)
    setStatus(text, 'error')
    message.error(text)
  } finally {
    exporting.value = false
    exportProgress.value = ''
  }
}

const handleClipMessage = (event: MessageEvent) => {
  if (
    event.source !== clipFrameRef.value?.contentWindow ||
    event.origin !== clipOrigin.value ||
    event.data?.version !== BRIDGE_VERSION ||
    event.data?.token !== bridgeToken
  ) return

  const payload = event.data
  if (payload.type === 'clipjs:ready') {
    clipReady.value = true
    setStatus('Clip-JS 已连接', 'success')
  }
  else if (payload.type === 'clipjs:imported') {
    clipProjectId.value = payload.projectId || ''
    setStatus(
      `已铺入 ${payload.clipCount} 个动态分镜 · ${Number(payload.duration || 0).toFixed(2)} 秒`,
      'success'
    )
    if (pendingAutoRender.value && rendererReady.value) requestRender()
  }
  else if (payload.type === 'clipjs:renderer-ready') {
    rendererReady.value = true
    if (pendingAutoRender.value) requestRender()
  }
  else if (payload.type === 'clipjs:render-started') {
    setStatus('Clip-JS 正在按分镜原比例渲染完整视频', 'working')
  }
  else if (payload.type === 'clipjs:rendered') {
    setStatus(`视频已渲染：${payload.fileName}`, 'success')
    message.success('Clip-JS 视频渲染完成，可在剪辑器中预览并下载')
  }
  else if (payload.type === 'clipjs:error') {
    pendingAutoRender.value = false
    setStatus(payload.message || 'Clip-JS 操作失败', 'error')
    message.error(payload.message || 'Clip-JS 操作失败')
  }
}

const openClipJs = () => {
  const url = clipProjectId.value
    ? `${CLIP_JS_BASE_URL}/projects/${encodeURIComponent(clipProjectId.value)}`
    : `${CLIP_JS_BASE_URL}/projects`
  window.open(url, '_blank', 'noopener,noreferrer')
}

onMounted(() => window.addEventListener('message', handleClipMessage))
onUnmounted(() => window.removeEventListener('message', handleClipMessage))
</script>

<style lang="scss" scoped>
.clip-video-editor {
  height: calc(100% - 40px);
  display: flex;
  flex-direction: column;
  background: #171719;
  position: relative;
  overflow: hidden;
}
.clip-toolbar {
  min-height: 48px;
  padding: 7px 12px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: #d7d7dc;
  background: #232327;
  border-bottom: 1px solid #34343a;
}
.clip-actions {
  display: flex;
  gap: 8px;
}
.clip-button {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #494951;
  border-radius: 6px;
  color: #eeeef3;
  background: #303036;
  font-size: 12px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #3b3b43;
  }
  &:disabled {
    opacity: .45;
    cursor: not-allowed;
  }
  &.primary {
    border-color: #7b5cff;
    background: #6d4aff;
  }
  &.ghost {
    color: #b9b9c2;
    background: transparent;
  }
}
.duration-control {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #aaaab3;
  font-size: 11px;

  input {
    width: 54px;
    height: 28px;
    padding: 0 7px;
    color: #eee;
    background: #19191d;
    border: 1px solid #45454d;
    border-radius: 5px;
  }
}
.clip-status {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #aaaab3;
  font-size: 11px;

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #777;
  }
  &.working .status-dot { background: #e0a82e; }
  &.success .status-dot { background: #55c98f; }
  &.error .status-dot { background: #f16d73; }
}
.clip-frame-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}
.clip-frame {
  width: 100%;
  height: 100%;
  display: block;
  border: 0;
  background: #111;
}
.clip-connection-help {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #b8b8c0;
  background: rgba(20, 20, 23, .94);
  pointer-events: none;

  strong {
    color: #f2f2f5;
    font-size: 18px;
  }
  code {
    color: #e8d080;
  }
}
.capture-deck {
  position: fixed;
  left: -20000px;
  top: 0;
  pointer-events: none;
  opacity: 1;
  overflow: hidden;
}
</style>
