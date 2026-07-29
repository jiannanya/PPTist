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

      <label class="duration-control">
        录制质量
        <select v-model.number="captureScale">
          <option :value="0.5">极速 50% · 1/4 帧采样</option>
          <option :value="0.8">均衡 80% · 1/2 帧采样</option>
          <option :value="1">原尺寸 100% · 全帧</option>
        </select>
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
        :key="`${captureSlide.id}-${captureRenderKey}`"
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
import { toCanvas as captureDomCanvas } from 'html-to-image'
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
const captureRenderKey = ref(0)
const clipReady = ref(false)
const rendererReady = ref(false)
const exporting = ref(false)
const exportProgress = ref('')
const fallbackDuration = ref(4)
const captureFps = ref(30)
const captureScale = ref(1)
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

const greatestCommonDivisor = (left: number, right: number) => {
  let a = Math.max(1, Math.round(Math.abs(left)))
  let b = Math.max(1, Math.round(Math.abs(right)))
  while (b !== 0) {
    const remainder = a % b
    a = b
    b = remainder
  }
  return a
}

const getCaptureDimensions = (width: number, height: number) => {
  const scale = Math.min(1, Math.max(0.5, Number(captureScale.value) || 0.8))
  const divisor = greatestCommonDivisor(width, height)
  const ratioWidth = width / divisor
  const ratioHeight = height / divisor
  let ratioMultiple = Math.max(1, Math.round(divisor * scale))

  // H.264 implementations are more reliable with even dimensions. Scaling by a
  // common ratio multiple keeps the storyboard aspect ratio exact.
  if ((ratioWidth % 2 !== 0 || ratioHeight % 2 !== 0) && ratioMultiple % 2 !== 0) {
    ratioMultiple += 1
  }

  return {
    width: ratioWidth * ratioMultiple,
    height: ratioHeight * ratioMultiple,
    scale,
    frameStep: scale <= 0.5 ? 4 : scale < 1 ? 2 : 1,
  }
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

interface PreparedFrame {
  draw: (context: CanvasRenderingContext2D) => void
  dispose: () => void
}

interface CachedFrameRenderer {
  prepare: () => Promise<PreparedFrame>
  dispose: () => void
}

const CAPTURE_STYLE_PROPERTIES: string[] = [
  'align-content', 'align-items', 'align-self',
  'backface-visibility',
  'background-color', 'background-image', 'background-origin', 'background-position',
  'background-repeat', 'background-size',
  'border-bottom-color', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'border-bottom-style', 'border-bottom-width',
  'border-left-color', 'border-left-style', 'border-left-width',
  'border-right-color', 'border-right-style', 'border-right-width',
  'border-top-color', 'border-top-left-radius', 'border-top-right-radius',
  'border-top-style', 'border-top-width',
  'bottom', 'box-shadow', 'box-sizing',
  'clip', 'clip-path', 'color', 'column-gap',
  'display',
  'fill', 'fill-opacity', 'fill-rule',
  'filter', 'flex-basis', 'flex-direction', 'flex-grow', 'flex-shrink', 'flex-wrap',
  'float',
  'font-family', 'font-feature-settings', 'font-kerning', 'font-size',
  'font-stretch', 'font-style', 'font-variant', 'font-weight',
  'gap', 'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows',
  'grid-column-end', 'grid-column-start', 'grid-row-end', 'grid-row-start',
  'grid-template-columns', 'grid-template-rows',
  'height',
  'inset', 'isolation',
  'justify-content', 'justify-items', 'justify-self',
  'left', 'letter-spacing', 'line-height', 'list-style-position', 'list-style-type',
  'margin-bottom', 'margin-left', 'margin-right', 'margin-top',
  'mask-image', 'mask-position', 'mask-repeat', 'mask-size',
  'max-height', 'max-width', 'min-height', 'min-width', 'mix-blend-mode',
  'object-fit', 'object-position', 'opacity', 'order', 'overflow', 'overflow-wrap',
  'overflow-x', 'overflow-y',
  'padding-bottom', 'padding-left', 'padding-right', 'padding-top',
  'paint-order', 'perspective', 'perspective-origin', 'pointer-events', 'position',
  'right', 'row-gap',
  'shape-rendering', 'stop-color', 'stop-opacity',
  'stroke', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap',
  'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width',
  'table-layout',
  'text-align', 'text-decoration-color', 'text-decoration-line',
  'text-decoration-style', 'text-indent', 'text-overflow', 'text-rendering',
  'text-shadow', 'text-transform',
  'top', 'transform', 'transform-origin', 'transform-style',
  'user-select',
  'vector-effect', 'vertical-align', 'visibility',
  'white-space', 'width', 'word-break', 'word-spacing', 'writing-mode',
  'z-index',
]

const createCachedFrameRenderer = (
  root: HTMLElement,
  sourceWidth: number,
  sourceHeight: number,
  outputWidth: number,
  outputHeight: number
): CachedFrameRenderer => {
  let disposed = false

  return {
    prepare: async () => {
      if (disposed) throw new Error('动态分镜缓存渲染器已释放')
      const canvas = await captureDomCanvas(root, {
        width: sourceWidth,
        height: sourceHeight,
        canvasWidth: outputWidth,
        canvasHeight: outputHeight,
        pixelRatio: 1,
        cacheBust: false,
        skipFonts: true,
        skipAutoScale: true,
        includeStyleProperties: CAPTURE_STYLE_PROPERTIES,
      })
      return preparedCanvasFrame(canvas, outputWidth, outputHeight)
    },
    dispose: () => {
      disposed = true
    },
  }
}

const captureCompatibleCanvas = async (
  root: HTMLElement,
  sourceWidth: number,
  sourceHeight: number,
  outputWidth: number,
  outputHeight: number
) => {
  return html2canvas(root, {
    backgroundColor: null,
    scale: outputWidth / sourceWidth,
    useCORS: true,
    allowTaint: false,
    logging: false,
    width: sourceWidth,
    height: sourceHeight,
    windowWidth: sourceWidth,
    windowHeight: sourceHeight,
    scrollX: 0,
    scrollY: 0,
    imageTimeout: 15000,
    removeContainer: true,
  })
}

const preparedCanvasFrame = (
  canvas: HTMLCanvasElement,
  outputWidth: number,
  outputHeight: number
): PreparedFrame => {
  let disposed = false
  return {
    draw: context => {
      if (disposed) throw new Error('分镜帧已释放')
      context.clearRect(0, 0, outputWidth, outputHeight)
      context.drawImage(canvas, 0, 0, outputWidth, outputHeight)
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      canvas.width = 1
      canvas.height = 1
    },
  }
}

type EncoderAcceleration = 'prefer-software' | 'no-preference' | 'prefer-hardware'

interface EncoderStrategy {
  acceleration: EncoderAcceleration
  label: string
}

const ENCODER_STRATEGIES: EncoderStrategy[] = [
  { acceleration: 'prefer-software', label: '软件兼容编码' },
  { acceleration: 'no-preference', label: '系统默认编码' },
  { acceleration: 'prefer-hardware', label: '硬件编码' },
]

class RecoverableEncoderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecoverableEncoderError'
  }
}

class RecoverableCaptureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecoverableCaptureError'
  }
}

const errorText = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (error instanceof Event) return `资源${error.type || '捕获'}事件`
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

const waitForDocumentVisible = async (index: number, total: number) => {
  if (document.visibilityState === 'visible') return

  exportProgress.value = `${index + 1}/${total} · 已暂停`
  setStatus('录制已暂停：请让 PPTist 标签页保持在前台', 'working')
  await new Promise<void>(resolve => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      document.removeEventListener('visibilitychange', handleVisibility)
      resolve()
    }
    document.addEventListener('visibilitychange', handleVisibility)
  })
  setStatus('页面已回到前台，继续录制动态分镜', 'working')
}

const getEncoderConfig = async (
  width: number,
  height: number,
  fps: number,
  strategy: EncoderStrategy
) => {
  if (!('VideoEncoder' in globalThis) || !('VideoFrame' in globalThis)) {
    throw new Error('当前浏览器不支持 WebCodecs，请使用最新版 Chrome 或 Edge')
  }

  const bitrate = Math.round(Math.min(16_000_000, Math.max(1_800_000, width * height * fps * 0.1)))
  const codecCandidates = ['avc1.420028', 'avc1.4d4028', 'avc1.640028']

  for (const codec of codecCandidates) {
    const config: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate,
      framerate: fps,
      latencyMode: 'quality',
      hardwareAcceleration: strategy.acceleration,
      avc: { format: 'avc' },
    }
    try {
      const support = await VideoEncoder.isConfigSupported(config)
      if (support.supported) return config
    } catch {
      // Try the next AVC profile before changing acceleration strategy.
    }
  }

  throw new RecoverableEncoderError(
    `浏览器不支持 ${strategy.label} 的 ${width}×${height} H.264 配置`
  )
}

const encodeSlideAttempt = async (
  slide: Slide,
  index: number,
  total: number,
  width: number,
  height: number,
  encodeWidth: number,
  encodeHeight: number,
  fps: number,
  frameStep: number,
  strategy: EncoderStrategy
) => {
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
      width: encodeWidth,
      height: encodeHeight,
      frameRate: fps,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  })

  const renderCanvas = document.createElement('canvas')
  renderCanvas.width = encodeWidth
  renderCanvas.height = encodeHeight
  const renderContext = renderCanvas.getContext('2d', { alpha: true })
  if (!renderContext) throw new Error('无法创建视频编码画布')

  let encoderError: Error | null = null
  let muxerError: Error | null = null
  const encoder = new VideoEncoder({
    output: (chunk, metadata) => {
      try {
        muxer.addVideoChunk(chunk, metadata)
      } catch (error) {
        if (!muxerError) {
          muxerError = error instanceof Error ? error : new Error(String(error))
        }
      }
    },
    error: error => {
      if (!encoderError) encoderError = error
    },
  })

  const encoderFailure = (phase: string, fallback?: unknown) => {
    const cause = encoderError || fallback
    const detail = cause ? `：${errorText(cause)}` : ''
    return new RecoverableEncoderError(
      `第 ${index + 1} 页${strategy.label}在${phase}阶段被浏览器关闭${detail}`
    )
  }

  const assertEncoderReady = (phase: string) => {
    if (muxerError) throw muxerError
    if (encoderError || encoder.state !== 'configured') {
      throw encoderFailure(phase)
    }
  }

  let timeline: ReturnType<typeof createMotionTimeline> | null = null
  const timeScale = Math.max(0.05, Math.abs(Number(slide.motion?.timeScale) || 1))
  let cachedRenderer: CachedFrameRenderer | null = null
  let staticFrame: PreparedFrame | null = null

  try {
    try {
      encoder.configure(await getEncoderConfig(encodeWidth, encodeHeight, fps, strategy))
    } catch (error) {
      if (error instanceof RecoverableEncoderError) throw error
      throw encoderFailure('初始化', error)
    }

    timeline = slide.motion?.version === 1
      ? createMotionTimeline(root, slide.motion, { paused: true })
      : null

    if (captureBackend === 'cached') {
      try {
        cachedRenderer = createCachedFrameRenderer(
          root,
          width,
          height,
          encodeWidth,
          encodeHeight
        )
      } catch (error) {
        captureBackend = 'compatible'
        console.warn('Cached storyboard renderer unavailable; switching to html2canvas:', error)
      }
    }

    const waitForEncoderCapacity = async () => {
      while (encoder.encodeQueueSize > 6) {
        await new Promise<void>(resolve => setTimeout(resolve, 8))
        assertEncoderReady('等待输出')
      }
    }

    const encodePreparedFrame = async (prepared: PreparedFrame, frameIndex: number) => {
      await waitForDocumentVisible(index, total)
      assertEncoderReady('帧编码')
      await waitForEncoderCapacity()
      prepared.draw(renderContext)

      const frame = new VideoFrame(renderCanvas, {
        timestamp: Math.round(frameIndex * 1_000_000 / fps),
        duration: frameDurationUs,
      })
      try {
        assertEncoderReady('提交帧')
        encoder.encode(frame, {
          keyFrame: frameIndex === 0 || frameIndex % Math.max(1, fps * 2) === 0,
        })
      } catch (error) {
        if (error instanceof RecoverableEncoderError) throw error
        throw encoderFailure('提交帧', error)
      } finally {
        frame.close()
      }
      exportProgress.value = `${index + 1}/${total} · ${frameIndex + 1}/${frameCount}`
    }

    const prepareCurrentFrame = async (): Promise<PreparedFrame> => {
      if (cachedRenderer && captureBackend === 'cached') {
        try {
          return await cachedRenderer.prepare()
        } catch (error) {
          throw new RecoverableCaptureError(
            `第 ${index + 1} 页缓存捕获失败：${errorText(error)}`
          )
        }
      }
      return preparedCanvasFrame(
        await captureCompatibleCanvas(root, width, height, encodeWidth, encodeHeight),
        encodeWidth,
        encodeHeight
      )
    }

    if (!timeline) {
      staticFrame = await prepareCurrentFrame()
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        await encodePreparedFrame(staticFrame, frameIndex)
      }
    }
    else {
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += frameStep) {
        await waitForDocumentVisible(index, total)
        assertEncoderReady('准备动画画面')
        const sampleTime = Math.min(duration, frameIndex / fps)
        timeline.totalTime(sampleTime * timeScale, true)
        const prepared = await prepareCurrentFrame()
        try {
          const frameEnd = Math.min(frameCount, frameIndex + frameStep)
          for (let outputFrame = frameIndex; outputFrame < frameEnd; outputFrame++) {
            await encodePreparedFrame(prepared, outputFrame)
          }
        } finally {
          prepared.dispose()
        }
      }
    }

    try {
      await encoder.flush()
    } catch (error) {
      throw encoderFailure('刷新输出', error)
    }
    assertEncoderReady('完成输出')
    muxer.finalize()
  } finally {
    disposeMotionTimeline(timeline)
    cachedRenderer?.dispose()
    staticFrame?.dispose()
    if (encoder.state !== 'closed') encoder.close()
    renderCanvas.width = 1
    renderCanvas.height = 1
    await new Promise<void>(resolve => setTimeout(resolve, 40))
  }

  return {
    data: target.buffer,
    duration: encodedDuration,
  }
}

const encodeSlide = async (
  slide: Slide,
  index: number,
  total: number,
  width: number,
  height: number,
  encodeWidth: number,
  encodeHeight: number,
  fps: number,
  frameStep: number
) => {
  let strategyIndex = 0
  let retriedCompatibleCapture = false
  let lastError: unknown = null

  while (strategyIndex < ENCODER_STRATEGIES.length) {
    await waitForDocumentVisible(index, total)
    captureSlide.value = null
    await nextTick()
    captureRenderKey.value += 1
    captureSlide.value = slide
    await nextTick()

    const strategy = ENCODER_STRATEGIES[strategyIndex]
    try {
      return await encodeSlideAttempt(
        slide,
        index,
        total,
        width,
        height,
        encodeWidth,
        encodeHeight,
        fps,
        frameStep,
        strategy
      )
    } catch (error) {
      lastError = error
      if (error instanceof RecoverableCaptureError) {
        console.warn('Storyboard capture attempt failed:', error)
        if (!retriedCompatibleCapture) {
          retriedCompatibleCapture = true
          captureBackend = 'compatible'
          setStatus(
            `第 ${index + 1}/${total} 页切换到兼容画面捕获后重试：${errorText(error)}`,
            'working'
          )
          continue
        }
      }
      if (error instanceof RecoverableEncoderError) {
        strategyIndex += 1
        if (strategyIndex < ENCODER_STRATEGIES.length) {
          setStatus(
            `第 ${index + 1}/${total} 页编码器被浏览器关闭，正在使用${ENCODER_STRATEGIES[strategyIndex].label}重试`,
            'working'
          )
          await new Promise<void>(resolve => setTimeout(resolve, 200))
          continue
        }
      }
      throw error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`第 ${index + 1} 页视频编码失败`)
}

const captureSlides = async () => {
  captureBackend = 'cached'
  const width = Math.round(viewportSize.value)
  const height = Math.round(viewportSize.value * viewportRatio.value)
  const captureDimensions = getCaptureDimensions(width, height)
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
        captureDimensions.width,
        captureDimensions.height,
        fps,
        captureDimensions.frameStep
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
    captureWidth: captureDimensions.width,
    captureHeight: captureDimensions.height,
    captureScale: captureDimensions.scale,
    frameStep: captureDimensions.frameStep,
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
      `已发送 ${result.clips.length} 个动态分镜 · 输出 ${result.width}×${result.height} · 采样 ${result.captureWidth}×${result.captureHeight} · ${result.fps} FPS`,
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

  input,
  select {
    width: 54px;
    height: 28px;
    padding: 0 7px;
    color: #eee;
    background: #19191d;
    border: 1px solid #45454d;
    border-radius: 5px;
  }
  select {
    width: 164px;
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
