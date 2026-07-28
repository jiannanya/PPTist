<template>
  <div
    class="motion-editor"
    tabindex="-1"
    @focusin="mainStore.setDisableHotkeysState(true)"
    @focusout="mainStore.setDisableHotkeysState(false)"
    @keydown.capture="handleHistoryHotkey"
  >
    <section class="preview-panel">
      <header class="preview-toolbar">
        <div class="scene-meta">
          <span class="scene-badge">分镜 {{ String(slideIndex + 1).padStart(2, '0') }}</span>
          <strong>{{ sceneTitle }}</strong>
          <span>{{ formatTime(currentTime) }} / {{ formatTime(sceneDuration) }}</span>
        </div>
        <div class="preview-actions">
          <div class="history-controls">
            <button
              :disabled="!canUndo"
              :title="canUndo ? `撤销：${undoLabel}（Ctrl + Z）` : '没有可撤销的操作'"
              @click="undoMotion"
            >↶</button>
            <button
              :disabled="!canRedo"
              :title="canRedo ? `重做：${redoLabel}（Ctrl + Y）` : '没有可重做的操作'"
              @click="redoMotion"
            >↷</button>
          </div>
          <div class="playback-controls">
            <button title="回到首帧" @click="seek(0)">↺</button>
            <button class="play-button" :class="{ active: isPlaying }" @click="togglePlay()">
              {{ isPlaying ? 'Ⅱ' : '▶' }}
            </button>
            <button title="跳到末帧" @click="seek(sceneDuration)">↦</button>
          </div>
        </div>
      </header>

      <div class="preview-workspace" ref="previewWorkspaceRef">
        <div
          class="preview-stage"
          ref="previewStageRef"
          :style="{
            width: viewportSize * previewScale + 'px',
            height: viewportSize * viewportRatio * previewScale + 'px',
          }"
          @click.capture.stop="selectPreviewElement"
        >
          <ScreenSlide
            v-if="previewSlide"
            :slide="previewSlide"
            :active="false"
            :scale="previewScale"
            :animationIndex="0"
            :turnSlideToId="() => {}"
            :manualExitFullscreen="() => {}"
          />
        </div>
      </div>
    </section>

    <aside class="frame-inspector">
      <div class="inspector-heading">
        <div>
          <span>帧属性</span>
          <strong>{{ selectedStep ? selectedTrackName : '未选择动画帧' }}</strong>
        </div>
        <span class="fps">{{ fps }} FPS</span>
      </div>

      <template v-if="selectedStep">
        <div class="inspector-section">
          <label>
            <span>动画方式</span>
            <select :value="selectedStep.method" @change="updateStepMethod">
              <option value="from">从状态进入</option>
              <option value="to">动画到状态</option>
              <option value="fromTo">起止状态</option>
              <option value="set">瞬时设置</option>
              <option value="effect">GSAPify 注册效果</option>
            </select>
          </label>
          <label v-if="selectedStep.method === 'effect'">
            <span>GSAPify 效果</span>
            <select :value="selectedStep.effectId" @change="updateSelectedEffectId">
              <optgroup
                v-for="category in GSAPIFY_EFFECT_CATEGORIES"
                :key="category.id"
                :label="category.label"
              >
                <option
                  v-for="effect in category.effects"
                  :key="effect.id"
                  :value="effect.id"
                >{{ effect.label }}</option>
              </optgroup>
            </select>
          </label>
          <div class="two-fields">
            <label>
              <span>开始 / 秒</span>
              <input type="number" min="0" :max="sceneDuration" step="0.033" :value="selectedTiming?.start || 0" @change="updateStartTime">
            </label>
            <label>
              <span>时长 / 秒</span>
              <input type="number" min="0.03" max="30" step="0.05" :value="numberVar('duration', 0.6)" @change="updateNumberVar('duration', $event)">
            </label>
          </div>
          <label>
            <span>缓动曲线</span>
            <select :value="stringVar('ease', 'power3.out')" @change="updateStringVar('ease', $event)">
              <option v-for="ease in EASES" :key="ease" :value="ease">{{ ease }}</option>
            </select>
          </label>
        </div>

        <div class="inspector-section">
          <div class="section-title">变换</div>
          <div class="property-grid">
            <label><span>X</span><input type="number" step="1" :value="numberVar('x', 0)" @change="updateNumberVar('x', $event)"></label>
            <label><span>Y</span><input type="number" step="1" :value="numberVar('y', 0)" @change="updateNumberVar('y', $event)"></label>
            <label><span>缩放</span><input type="number" min="0" step="0.05" :value="numberVar('scale', 1)" @change="updateNumberVar('scale', $event)"></label>
            <label><span>旋转</span><input type="number" step="1" :value="numberVar('rotation', 0)" @change="updateNumberVar('rotation', $event)"></label>
            <label><span>旋转 X</span><input type="number" step="1" :value="numberVar('rotationX', 0)" @change="updateNumberVar('rotationX', $event)"></label>
            <label><span>旋转 Y</span><input type="number" step="1" :value="numberVar('rotationY', 0)" @change="updateNumberVar('rotationY', $event)"></label>
          </div>
        </div>

        <div class="inspector-section">
          <div class="section-title">视觉</div>
          <div class="property-grid">
            <label><span>透明度</span><input type="number" min="0" max="1" step="0.05" :value="numberVar('autoAlpha', 1)" @change="updateNumberVar('autoAlpha', $event)"></label>
            <label><span>重复</span><input type="number" min="0" max="20" step="1" :value="numberVar('repeat', 0)" @change="updateNumberVar('repeat', $event)"></label>
          </div>
          <label class="wide-field">
            <span>滤镜</span>
            <input type="text" :value="stringVar('filter', '')" placeholder="blur(12px)" @change="updateStringVar('filter', $event)">
          </label>
          <label class="check-field">
            <input type="checkbox" :checked="booleanVar('yoyo', false)" @change="updateBooleanVar('yoyo', $event)">
            <span>往返播放（yoyo）</span>
          </label>
        </div>

        <div class="inspector-actions">
          <button @click="duplicateSelectedStep">复制帧</button>
          <button class="danger" @click="deleteSelectedStep">删除帧</button>
        </div>
      </template>

      <div v-else class="empty-inspector">
        <div class="empty-icon">◆</div>
        <p>点击时间轴中的帧，或从下方预设为当前轨道添加新帧。</p>
      </div>

      <section class="motion-history">
        <header>
          <div>
            <strong>历史记录</strong>
            <span>{{ snapshotCursor + 1 }} / {{ snapshotLength }}</span>
          </div>
          <small>点击记录可回到该状态</small>
        </header>
        <div class="history-list">
          <button
            v-for="entry in visibleHistoryEntries"
            :key="entry.id"
            :class="{
              current: entry.cursor === snapshotCursor,
              future: entry.cursor > snapshotCursor,
              motion: entry.source === 'motion',
            }"
            :title="formatHistoryTime(entry.timestamp)"
            @click="jumpToHistory(entry.cursor)"
          >
            <span class="history-dot"></span>
            <span class="history-copy">
              <strong>{{ entry.label }}</strong>
              <small>{{ entry.source === 'motion' ? '动效时间轴' : entry.source === 'system' ? '系统' : '静态编辑' }}</small>
            </span>
            <span v-if="entry.cursor === snapshotCursor" class="current-mark">当前</span>
          </button>
        </div>
      </section>
    </aside>

    <section class="timeline-panel">
      <header class="timeline-toolbar">
        <div class="toolbar-group track-selector">
          <span>当前轨道</span>
          <select v-model="selectedTrackId">
            <option v-for="track in tracks" :key="track.id" :value="track.id">{{ track.name }}</option>
          </select>
        </div>

        <div class="preset-list">
          <button
            v-for="preset in PRESETS"
            :key="preset.id"
            :title="preset.description"
            @click="addPresetFrame(preset)"
          >
            <span :style="{ background: preset.color }"></span>{{ preset.label }}
          </button>
        </div>

        <div class="gsapify-picker">
          <span>GSAPify 100</span>
          <select v-model="selectedGsapifyEffectId">
            <optgroup
              v-for="category in GSAPIFY_EFFECT_CATEGORIES"
              :key="category.id"
              :label="category.label"
            >
              <option
                v-for="effect in category.effects"
                :key="effect.id"
                :value="effect.id"
              >{{ effect.label }}</option>
            </optgroup>
          </select>
          <button @click="addGsapifyEffectFrame">添加</button>
        </div>

        <div class="toolbar-group timeline-settings">
          <label>分镜 <input type="number" min="1" max="120" step="0.5" :value="sceneDuration" @change="updateSceneDuration"></label>
          <label>缩放 <input type="range" min="45" max="180" step="5" v-model.number="pixelsPerSecond"></label>
        </div>
      </header>

      <div class="timeline-scroll" ref="timelineScrollRef">
        <div
          class="timeline-content"
          :style="{ width: LABEL_WIDTH + timelineWidth + 'px' }"
        >
          <div class="timeline-row ruler-row">
            <div class="track-label ruler-label">
              <span>轨道 / 元素</span>
              <small>{{ motion?.steps.length || 0 }} 帧</small>
            </div>
            <div
              class="ruler-track"
              :style="{ width: timelineWidth + 'px' }"
              @mousedown="startPlayheadDrag"
            >
              <div
                v-for="tick in ticks"
                :key="tick"
                class="ruler-tick"
                :class="{ major: Number.isInteger(tick) }"
                :style="{ left: tick * pixelsPerSecond + 'px' }"
              >
                <span v-if="Number.isInteger(tick)">{{ tick }}s</span>
              </div>
            </div>
          </div>

          <div
            v-for="track in tracks"
            :key="track.id"
            class="timeline-row track-row"
            :class="{ selected: selectedTrackId === track.id }"
            @click="selectedTrackId = track.id"
          >
            <div class="track-label">
              <span class="track-type" :class="track.kind">{{ track.short }}</span>
              <div>
                <strong>{{ track.name }}</strong>
                <small>{{ trackSubtitle(track.id) }}</small>
              </div>
            </div>
            <div
              class="track-lane"
              :style="{
                width: timelineWidth + 'px',
                '--half-second': pixelsPerSecond / 2 + 'px',
              }"
              @mousedown="startPlayheadDrag"
            >
              <div
                v-for="timing in trackTimings(track.id)"
                :key="motion?.steps[timing.index].id || timing.index"
                class="frame-block"
                :class="[
                  motion?.steps[timing.index].method,
                  { selected: selectedStepIndex === timing.index },
                ]"
                :style="frameStyle(timing)"
                @mousedown.stop="startFrameDrag($event, timing)"
                @click.stop="selectStep(timing.index, track.id)"
              >
                <span class="frame-gem">◆</span>
                <span class="frame-name">{{ frameLabel(timing.index) }}</span>
                <span class="resize-handle" @mousedown.stop="startFrameResize($event, timing)"></span>
              </div>
            </div>
          </div>

          <div
            class="playhead"
            :style="{ left: LABEL_WIDTH + currentTime * pixelsPerSecond + 'px' }"
          >
            <span></span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { gsap } from 'gsap'
import { useMainStore, useSlidesStore, useSnapshotStore } from '@/store'
import type { PPTElement, Slide, SlideMotion, SlideMotionTween, SlideMotionVars } from '@/types/slides'
import {
  GSAPIFY_EFFECT_CATEGORIES,
  GSAPIFY_EFFECTS,
  GSAPIFY_EFFECTS_BY_ID,
} from '@/data/gsapifyEffects'
import {
  calculateMotionStepTimings,
  createMotionTimeline,
  disposeMotionTimeline,
  getMotionDuration,
  type MotionStepTiming,
} from '@/utils/gsapMotion'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import ScreenSlide from '@/views/Screen/ScreenSlide.vue'

interface MotionTrack {
  id: string
  name: string
  short: string
  kind: 'camera' | 'background' | 'text' | 'image' | 'shape' | 'other'
}

interface MotionPreset {
  id: string
  label: string
  description: string
  color: string
  target?: '$stage' | '$background'
  step: Omit<SlideMotionTween, 'id' | 'elIds' | 'position'>
}

const LABEL_WIDTH = 190
const EASES = [
  'none',
  'power1.out',
  'power2.out',
  'power3.out',
  'power4.out',
  'power3.inOut',
  'back.out(1.7)',
  'elastic.out(1, 0.35)',
  'bounce.out',
  'expo.out',
  'sine.inOut',
]

const PRESETS: MotionPreset[] = [
  {
    id: 'camera',
    label: '电影推镜',
    description: '整页镜头从近景平滑推回',
    color: '#a78bfa',
    target: '$stage',
    step: {
      method: 'fromTo',
      fromVars: { scale: 1.14, x: -24, y: 12, rotation: -0.6 },
      toVars: { scale: 1, x: 0, y: 0, rotation: 0, duration: 1.8, ease: 'power3.out' },
    },
  },
  {
    id: 'fade-up',
    label: '模糊上升',
    description: '带景深模糊的上升入场',
    color: '#38bdf8',
    step: {
      method: 'from',
      vars: { autoAlpha: 0, y: 80, filter: 'blur(12px)', duration: 0.8, ease: 'power4.out' },
    },
  },
  {
    id: 'elastic',
    label: '弹性缩放',
    description: '适合图标与强调元素',
    color: '#fbbf24',
    step: {
      method: 'from',
      vars: { autoAlpha: 0, scale: 0.25, rotation: -8, duration: 1, ease: 'elastic.out(1, 0.35)' },
    },
  },
  {
    id: 'fly-left',
    label: '高速飞入',
    description: '从左侧带斜切快速进入',
    color: '#fb7185',
    step: {
      method: 'from',
      vars: { autoAlpha: 0, x: -180, skewX: -10, duration: 0.7, ease: 'power4.out' },
    },
  },
  {
    id: 'flip-3d',
    label: '3D 翻转',
    description: '透视翻牌式入场',
    color: '#34d399',
    step: {
      method: 'from',
      vars: { autoAlpha: 0, rotationY: -90, scale: 0.8, transformPerspective: 1200, duration: 0.9, ease: 'back.out(1.4)' },
    },
  },
  {
    id: 'float',
    label: '漂浮呼吸',
    description: '柔和上下漂浮并回到原位',
    color: '#60a5fa',
    step: {
      method: 'to',
      vars: { y: -18, rotation: 2, scale: 1.025, duration: 1.3, repeat: 1, yoyo: true, ease: 'sine.inOut' },
    },
  },
  {
    id: 'background',
    label: '背景呼吸',
    description: '缓慢放大背景形成纵深',
    color: '#c084fc',
    target: '$background',
    step: {
      method: 'to',
      vars: { scale: 1.06, rotation: 0.35, duration: 3, repeat: 1, yoyo: true, ease: 'sine.inOut' },
    },
  },
  {
    id: 'exit',
    label: '景深退场',
    description: '放大、模糊并淡出',
    color: '#f87171',
    step: {
      method: 'to',
      vars: { autoAlpha: 0, scale: 1.15, filter: 'blur(10px)', duration: 0.65, ease: 'power3.in' },
    },
  },
]

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const snapshotStore = useSnapshotStore()
const { currentSlide, slideIndex, viewportSize, viewportRatio } = storeToRefs(slidesStore)
const {
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  snapshotCursor,
  snapshotLength,
  historyEntries,
} = storeToRefs(snapshotStore)
const { addHistorySnapshotNow, undo, redo } = useHistorySnapshot()

const previewWorkspaceRef = useTemplateRef<HTMLElement>('previewWorkspaceRef')
const previewStageRef = useTemplateRef<HTMLElement>('previewStageRef')
const timelineScrollRef = useTemplateRef<HTMLElement>('timelineScrollRef')

const previewScale = ref(0.5)
const currentTime = ref(0)
const isPlaying = ref(false)
const pixelsPerSecond = ref(90)
const selectedTrackId = ref('$stage')
const selectedStepIndex = ref(-1)
const selectedGsapifyEffectId = ref(GSAPIFY_EFFECTS[0].id)
const dragPreview = ref<{ index: number; start: number; duration: number } | null>(null)

let timeline: gsap.core.Timeline | null = null
let motionContext: gsap.Context | null = null
let resizeObserver: ResizeObserver | null = null
let committingMotionHistory = false

const previewSlide = computed<Slide | null>(() => {
  if (!currentSlide.value) return null
  return { ...currentSlide.value, motion: undefined }
})

const motion = computed(() => currentSlide.value?.motion)
const fps = computed(() => motion.value?.fps || 30)
const timings = computed(() => calculateMotionStepTimings(motion.value))
const sceneDuration = computed(() => getMotionDuration(motion.value))
const timelineWidth = computed(() => Math.max(640, sceneDuration.value * pixelsPerSecond.value))
const ticks = computed(() => {
  const result: number[] = []
  for (let time = 0; time <= sceneDuration.value + 0.001; time += 0.5) result.push(Number(time.toFixed(1)))
  return result
})
const visibleHistoryEntries = computed(() => {
  return historyEntries.value.slice().reverse()
})

const stripHtml = (html: string) => {
  const container = document.createElement('div')
  container.innerHTML = html
  return (container.textContent || '').replace(/\s+/g, ' ').trim()
}

const elementTrackName = (element: PPTElement, index: number) => {
  if (element.name) return element.name
  if (element.type === 'text') {
    const text = stripHtml(element.content)
    return text ? text.slice(0, 18) : `文本 ${index + 1}`
  }
  const typeNames: Record<string, string> = {
    image: '图片',
    shape: '形状',
    line: '线条',
    chart: '图表',
    table: '表格',
    latex: '公式',
    video: '视频',
    audio: '音频',
  }
  return `${typeNames[element.type] || '元素'} ${index + 1}`
}

const tracks = computed<MotionTrack[]>(() => {
  const baseTracks: MotionTrack[] = [
    { id: '$stage', name: '镜头 / 整体场景', short: 'CAM', kind: 'camera' },
    { id: '$background', name: '背景', short: 'BG', kind: 'background' },
  ]
  const elementTracks = (currentSlide.value?.elements || []).map((element, index) => ({
    id: element.id,
    name: elementTrackName(element, index),
    short: element.type.slice(0, 3).toUpperCase(),
    kind: (['text', 'image', 'shape'].includes(element.type) ? element.type : 'other') as MotionTrack['kind'],
  }))
  return [...baseTracks, ...elementTracks]
})

const sceneTitle = computed(() => {
  const titleElement = currentSlide.value?.elements.find(element => element.name === 'title')
  if (titleElement?.type === 'text') return stripHtml(titleElement.content).slice(0, 30)
  return currentSlide.value?.type === 'cover' ? '封面分镜' : '当前幻灯片'
})

const selectedStep = computed(() => {
  if (!motion.value || selectedStepIndex.value < 0) return null
  return motion.value.steps[selectedStepIndex.value] || null
})
const selectedTiming = computed(() => timings.value.find(item => item.index === selectedStepIndex.value) || null)
const selectedTrackName = computed(() => tracks.value.find(track => track.id === selectedTrackId.value)?.name || '动画帧')
const selectedVars = computed<SlideMotionVars>(() => {
  const step = selectedStep.value
  if (!step) return {}
  if (step.method === 'fromTo') return step.toVars || {}
  return step.vars || {}
})

const ensureMotion = (): SlideMotion => {
  if (motion.value) return JSON.parse(JSON.stringify(motion.value))
  return {
    version: 1,
    autoplay: true,
    duration: 6,
    fps: 30,
    reducedMotion: 'fade',
    defaults: { duration: 0.6, ease: 'power3.out', overwrite: 'auto' },
    steps: [],
  }
}

const commitMotion = async (
  nextMotion: SlideMotion,
  label = '编辑动画帧',
  snapshot = true,
  preserveTime = true
) => {
  slidesStore.updateSlide({ motion: nextMotion })
  if (snapshot) {
    committingMotionHistory = true
    try {
      await addHistorySnapshotNow({
        label,
        source: 'motion',
        slideId: currentSlide.value.id,
      })
    }
    finally {
      committingMotionHistory = false
    }
  }
  await nextTick()
  rebuildTimeline(preserveTime)
}

const updatePreviewScale = () => {
  const workspace = previewWorkspaceRef.value
  if (!workspace) return
  const padding = 38
  const availableWidth = Math.max(100, workspace.clientWidth - padding * 2)
  const availableHeight = Math.max(100, workspace.clientHeight - padding * 2)
  previewScale.value = Math.min(
    availableWidth / viewportSize.value,
    availableHeight / (viewportSize.value * viewportRatio.value)
  )
}

const refreshSelectedOutline = () => {
  const stage = previewStageRef.value
  if (!stage) return
  stage.querySelectorAll('.motion-selected').forEach(element => element.classList.remove('motion-selected'))
  if (selectedTrackId.value.startsWith('$')) return
  const target = Array.from(stage.querySelectorAll<HTMLElement>('.screen-element[data-element-id]'))
    .find(element => element.dataset.elementId === selectedTrackId.value)
  target?.classList.add('motion-selected')
}

const rebuildTimeline = async (preserveTime = true) => {
  const targetTime = preserveTime ? currentTime.value : 0
  isPlaying.value = false
  disposeMotionTimeline(timeline)
  motionContext?.revert()
  motionContext = null
  timeline = null

  await nextTick()
  const root = previewStageRef.value?.querySelector<HTMLElement>('.screen-slide')
  if (!root || !motion.value) return

  motionContext = gsap.context(() => {
    timeline = createMotionTimeline(root, motion.value!, {
      paused: true,
      onUpdate: () => {
        if (!timeline) return
        currentTime.value = timeline.time()
      },
      onComplete: () => {
        isPlaying.value = false
      },
    })
  }, root)

  const activeTimeline = timeline as gsap.core.Timeline | null
  activeTimeline?.time(Math.min(targetTime, sceneDuration.value), false)
  currentTime.value = Math.min(targetTime, sceneDuration.value)
  refreshSelectedOutline()
}

const seek = (time: number) => {
  const nextTime = Math.max(0, Math.min(sceneDuration.value, time))
  timeline?.pause().time(nextTime, false)
  currentTime.value = nextTime
  isPlaying.value = false
}

const togglePlay = () => {
  if (!motion.value) {
    commitMotion(ensureMotion(), '创建动效时间轴', true, false)
    return
  }
  if (!timeline) return
  if (isPlaying.value) {
    timeline.pause()
    isPlaying.value = false
  }
  else {
    if (timeline.time() >= sceneDuration.value - 0.01) timeline.time(0)
    timeline.play()
    isPlaying.value = true
  }
}

const formatTime = (time: number) => {
  const safe = Math.max(0, time)
  const seconds = Math.floor(safe)
  const frames = Math.floor((safe - seconds) * fps.value)
  return `${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`
}

const snapTime = (time: number) => Math.max(0, Math.round(time * fps.value) / fps.value)

const trackTimings = (trackId: string) => {
  if (!motion.value) return []
  return timings.value.filter(timing => motion.value!.steps[timing.index].elIds.includes(trackId))
}

const trackSubtitle = (trackId: string) => {
  const count = trackTimings(trackId).length
  return count ? `${count} 个动画帧` : '暂无帧'
}

const selectStep = (index: number, trackId?: string) => {
  selectedStepIndex.value = index
  if (trackId) selectedTrackId.value = trackId
}

const frameLabel = (index: number) => {
  const step = motion.value?.steps[index]
  if (!step) return ''
  if (step.method === 'effect') {
    return GSAPIFY_EFFECTS_BY_ID.get(step.effectId || '')?.label || 'GSAPify'
  }
  const labels = { from: '入场', to: '动作', fromTo: '关键帧', set: '设置' }
  return labels[step.method]
}

const frameStyle = (timing: MotionStepTiming) => {
  const preview = dragPreview.value?.index === timing.index ? dragPreview.value : null
  const start = preview?.start ?? timing.start
  const duration = preview?.duration ?? timing.duration
  return {
    left: start * pixelsPerSecond.value + 'px',
    width: Math.max(16, duration * pixelsPerSecond.value) + 'px',
  }
}

const addPresetFrame = (preset: MotionPreset) => {
  const nextMotion = ensureMotion()
  const target = preset.target || selectedTrackId.value
  const step: SlideMotionTween = {
    ...JSON.parse(JSON.stringify(preset.step)),
    id: nanoid(10),
    elIds: [target],
    position: snapTime(currentTime.value),
  }
  nextMotion.steps.push(step)
  nextMotion.duration = Math.max(nextMotion.duration || 0, currentTime.value + 1)
  selectedStepIndex.value = nextMotion.steps.length - 1
  selectedTrackId.value = target
  commitMotion(nextMotion, `添加预设：${preset.label}`)
}

const addGsapifyEffectFrame = () => {
  const effect = GSAPIFY_EFFECTS_BY_ID.get(selectedGsapifyEffectId.value)
  if (!effect) return

  const elementTrack = tracks.value.find(track => !track.id.startsWith('$'))
  const target = effect.scope === 'stage'
    ? '$stage'
    : effect.scope === 'background'
      ? '$background'
      : selectedTrackId.value.startsWith('$')
        ? elementTrack?.id
        : selectedTrackId.value
  if (!target) return

  const nextMotion = ensureMotion()
  nextMotion.steps.push({
    id: nanoid(10),
    method: 'effect',
    effectId: effect.id,
    elIds: [target],
    position: snapTime(currentTime.value),
    vars: {
      duration: effect.duration,
      ease: 'power3.out',
    },
  })
  nextMotion.duration = Math.max(
    nextMotion.duration || 0,
    currentTime.value + effect.duration
  )
  selectedStepIndex.value = nextMotion.steps.length - 1
  selectedTrackId.value = target
  commitMotion(nextMotion, `添加 GSAPify 效果：${effect.label}`)
}

const deleteSelectedStep = () => {
  if (!motion.value || selectedStepIndex.value < 0) return
  const nextMotion = ensureMotion()
  nextMotion.steps.splice(selectedStepIndex.value, 1)
  selectedStepIndex.value = -1
  commitMotion(nextMotion, '删除动画帧')
}

const duplicateSelectedStep = () => {
  if (!selectedStep.value) return
  const nextMotion = ensureMotion()
  const clone: SlideMotionTween = JSON.parse(JSON.stringify(selectedStep.value))
  clone.id = nanoid(10)
  clone.position = snapTime((selectedTiming.value?.start || 0) + 0.25)
  nextMotion.steps.push(clone)
  selectedStepIndex.value = nextMotion.steps.length - 1
  commitMotion(nextMotion, '复制动画帧')
}

const updateSelectedStep = (
  updater: (step: SlideMotionTween) => void,
  label = '编辑动画帧'
) => {
  if (!motion.value || selectedStepIndex.value < 0) return
  const nextMotion = ensureMotion()
  const step = nextMotion.steps[selectedStepIndex.value]
  const before = JSON.stringify(step)
  updater(step)
  if (JSON.stringify(step) === before) return
  commitMotion(nextMotion, label)
}

const varsForStep = (step: SlideMotionTween) => {
  if (step.method === 'fromTo') {
    step.toVars = step.toVars || {}
    return step.toVars
  }
  step.vars = step.vars || {}
  return step.vars
}

const numberVar = (key: string, fallback: number) => {
  const value = selectedVars.value[key]
  return typeof value === 'number' ? value : fallback
}
const stringVar = (key: string, fallback: string) => {
  const value = selectedVars.value[key]
  return typeof value === 'string' ? value : fallback
}
const booleanVar = (key: string, fallback: boolean) => {
  const value = selectedVars.value[key]
  return typeof value === 'boolean' ? value : fallback
}
const eventInput = (event: Event) => event.target as HTMLInputElement
const PROPERTY_LABELS: Record<string, string> = {
  duration: '时长',
  ease: '缓动曲线',
  x: 'X 位移',
  y: 'Y 位移',
  scale: '缩放',
  rotation: '旋转',
  rotationX: '旋转 X',
  rotationY: '旋转 Y',
  autoAlpha: '透明度',
  repeat: '重复次数',
  filter: '滤镜',
  yoyo: '往返播放',
}
const propertyLabel = (key: string) => PROPERTY_LABELS[key] || key

const updateNumberVar = (key: string, event: Event) => {
  const value = Number(eventInput(event).value)
  if (!Number.isFinite(value)) return
  updateSelectedStep(step => {
    varsForStep(step)[key] = value
  }, `修改帧属性：${propertyLabel(key)}`)
}

const updateStringVar = (key: string, event: Event) => {
  const value = eventInput(event).value
  updateSelectedStep(step => {
    varsForStep(step)[key] = value
  }, `修改帧属性：${propertyLabel(key)}`)
}

const updateBooleanVar = (key: string, event: Event) => {
  const value = eventInput(event).checked
  updateSelectedStep(step => {
    varsForStep(step)[key] = value
  }, `修改帧属性：${propertyLabel(key)}`)
}

const updateStepMethod = (event: Event) => {
  const method = eventInput(event).value as SlideMotionTween['method']
  updateSelectedStep(step => {
    const oldVars = step.method === 'fromTo' ? step.toVars : step.vars
    step.method = method
    if (method === 'fromTo') {
      step.fromVars = step.fromVars || { autoAlpha: 0, scale: 0.8 }
      step.toVars = step.toVars || oldVars || { duration: 0.6, ease: 'power3.out' }
      delete step.vars
      delete step.effectId
    }
    else if (method === 'effect') {
      const effect = GSAPIFY_EFFECTS_BY_ID.get(step.effectId || selectedGsapifyEffectId.value)
        || GSAPIFY_EFFECTS[0]
      step.effectId = effect.id
      step.vars = {
        duration: effect.duration,
        ease: 'power3.out',
      }
      delete step.fromVars
      delete step.toVars
    }
    else {
      step.vars = oldVars || step.toVars || { duration: 0.6, ease: 'power3.out' }
      delete step.fromVars
      delete step.toVars
      delete step.effectId
    }
  }, '修改动画方式')
}

const updateSelectedEffectId = (event: Event) => {
  const effectId = eventInput(event).value
  const effect = GSAPIFY_EFFECTS_BY_ID.get(effectId)
  if (!effect) return
  selectedGsapifyEffectId.value = effectId
  updateSelectedStep(step => {
    step.method = 'effect'
    step.effectId = effect.id
    step.vars = {
      ...(step.vars || {}),
      duration: effect.duration,
      ease: typeof step.vars?.ease === 'string' ? step.vars.ease : 'power3.out',
    }
    delete step.fromVars
    delete step.toVars
  }, `更换 GSAPify 效果：${effect.label}`)
}

const updateStartTime = (event: Event) => {
  const value = snapTime(Number(eventInput(event).value))
  updateSelectedStep(step => {
    step.position = value
  }, '修改帧开始时间')
}

const updateSceneDuration = (event: Event) => {
  const value = Math.max(1, Number(eventInput(event).value) || 1)
  const nextMotion = ensureMotion()
  if (nextMotion.duration === value) return
  nextMotion.duration = value
  commitMotion(nextMotion, '修改分镜时长')
}

const selectPreviewElement = (event: MouseEvent) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('.screen-element[data-element-id]')
  if (!target?.dataset.elementId) return
  selectedTrackId.value = target.dataset.elementId
  const firstTiming = trackTimings(selectedTrackId.value)[0]
  if (firstTiming) selectedStepIndex.value = firstTiming.index
}

const startFrameDrag = (event: MouseEvent, timing: MotionStepTiming) => {
  selectStep(timing.index, motion.value?.steps[timing.index].elIds[0])
  const startX = event.clientX
  const originStart = timing.start
  dragPreview.value = { index: timing.index, start: timing.start, duration: timing.duration }

  const move = (moveEvent: MouseEvent) => {
    if (!dragPreview.value) return
    dragPreview.value.start = snapTime(originStart + (moveEvent.clientX - startX) / pixelsPerSecond.value)
    seek(dragPreview.value.start)
  }
  const up = () => {
    const preview = dragPreview.value
    dragPreview.value = null
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    if (!preview) return
    updateSelectedStep(step => {
      step.position = preview.start
    }, '拖动动画帧')
  }

  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

const startFrameResize = (event: MouseEvent, timing: MotionStepTiming) => {
  selectStep(timing.index, motion.value?.steps[timing.index].elIds[0])
  const startX = event.clientX
  const originDuration = timing.duration
  dragPreview.value = { index: timing.index, start: timing.start, duration: timing.duration }

  const move = (moveEvent: MouseEvent) => {
    if (!dragPreview.value) return
    dragPreview.value.duration = Math.max(1 / fps.value, snapTime(originDuration + (moveEvent.clientX - startX) / pixelsPerSecond.value))
  }
  const up = () => {
    const preview = dragPreview.value
    dragPreview.value = null
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    if (!preview) return
    updateSelectedStep(step => {
      const vars = varsForStep(step)
      const repeat = Math.max(0, Number(vars.repeat) || 0)
      vars.duration = preview.duration / (repeat + 1)
    }, '调整动画帧时长')
  }

  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

const startPlayheadDrag = (event: MouseEvent) => {
  const lane = event.currentTarget as HTMLElement
  const update = (moveEvent: MouseEvent) => {
    const rect = lane.getBoundingClientRect()
    seek(snapTime((moveEvent.clientX - rect.left) / pixelsPerSecond.value))
  }
  update(event)
  const up = () => {
    window.removeEventListener('mousemove', update)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', update)
  window.addEventListener('mouseup', up)
}

const formatHistoryTime = (timestamp: number) => {
  if (!timestamp) return '早期历史记录'
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const refreshAfterHistory = async () => {
  await nextTick()
  if (selectedStepIndex.value >= (motion.value?.steps.length || 0)) {
    selectedStepIndex.value = -1
  }
  if (!tracks.value.some(track => track.id === selectedTrackId.value)) {
    selectedTrackId.value = '$stage'
  }
  currentTime.value = 0
  await rebuildTimeline(false)
}

const undoMotion = async () => {
  if (!canUndo.value) return
  await undo()
}

const redoMotion = async () => {
  if (!canRedo.value) return
  await redo()
}

const jumpToHistory = async (cursor: number) => {
  if (cursor === snapshotCursor.value) return
  await snapshotStore.jumpToSnapshot(cursor)
}

const handleHistoryHotkey = (event: KeyboardEvent) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return
  const key = event.key.toLowerCase()
  const isUndo = key === 'z' && !event.shiftKey
  const isRedo = key === 'y' || (key === 'z' && event.shiftKey)
  if (!isUndo && !isRedo) return

  event.preventDefault()
  event.stopPropagation()
  if (isUndo) undoMotion()
  else redoMotion()
}

watch(selectedTrackId, () => nextTick(refreshSelectedOutline))
watch(snapshotCursor, () => {
  if (!committingMotionHistory) nextTick(refreshAfterHistory)
})
watch(slideIndex, () => {
  currentTime.value = 0
  selectedStepIndex.value = -1
  selectedTrackId.value = '$stage'
  nextTick(() => rebuildTimeline(false))
})

onMounted(() => {
  resizeObserver = new ResizeObserver(updatePreviewScale)
  if (previewWorkspaceRef.value) resizeObserver.observe(previewWorkspaceRef.value)
  updatePreviewScale()
  rebuildTimeline(false)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  disposeMotionTimeline(timeline)
  motionContext?.revert()
  mainStore.setDisableHotkeysState(false)
})
</script>

<style lang="scss" scoped>
.motion-editor {
  --motion-bg: #14141b;
  --motion-panel: #1d1d27;
  --motion-panel-2: #242431;
  --motion-border: #343446;
  --motion-text: #f2f2f7;
  --motion-muted: #9a9aaa;
  --motion-accent: #8b5cf6;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 286px;
  grid-template-rows: minmax(280px, 56%) minmax(250px, 44%);
  background: var(--motion-bg);
  color: var(--motion-text);
  overflow: hidden;
}

button,
input,
select {
  font: inherit;
}

button {
  border: 0;
  color: inherit;
  cursor: pointer;
}

.preview-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--motion-border);
}

.preview-toolbar,
.timeline-toolbar {
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  background: var(--motion-panel);
  border-bottom: 1px solid var(--motion-border);
}

.preview-toolbar {
  justify-content: space-between;
  padding: 0 14px;
}

.scene-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;

  strong {
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  & > span:last-child {
    color: var(--motion-muted);
    font-family: Consolas, monospace;
    font-size: 12px;
  }
}

.scene-badge {
  padding: 4px 8px;
  border-radius: 4px;
  color: #ddd6fe;
  background: rgba(139, 92, 246, .18);
  border: 1px solid rgba(139, 92, 246, .4);
  font-size: 12px;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.history-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 10px;
  border-right: 1px solid var(--motion-border);

  button {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    background: var(--motion-panel-2);
    font-size: 18px;

    &:hover:not(:disabled) {
      color: #ddd6fe;
      background: #343445;
    }

    &:disabled {
      opacity: .3;
      cursor: not-allowed;
    }
  }
}

.playback-controls {
  display: flex;
  align-items: center;
  gap: 6px;

  button {
    width: 30px;
    height: 28px;
    border-radius: 5px;
    background: var(--motion-panel-2);

    &:hover {
      background: #343445;
    }
  }

  .play-button {
    width: 42px;
    background: var(--motion-accent);

    &.active {
      background: #ef4444;
    }
  }
}

.preview-workspace {
  min-height: 0;
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 50% 42%, rgba(94, 77, 145, .18), transparent 42%),
    linear-gradient(45deg, #17171f 25%, transparent 25%),
    linear-gradient(-45deg, #17171f 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #17171f 75%),
    linear-gradient(-45deg, transparent 75%, #17171f 75%);
  background-size: auto, 20px 20px, 20px 20px, 20px 20px, 20px 20px;
  background-position: center, 0 0, 0 10px, 10px -10px, -10px 0;
}

.preview-stage {
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 16px 45px rgba(0, 0, 0, .55);
  overflow: hidden;

  :deep(.screen-element) {
    cursor: pointer;
  }

  :deep(.screen-element.motion-selected) {
    outline: 3px solid #8b5cf6;
    outline-offset: 3px;
  }
}

.frame-inspector {
  grid-row: 1 / span 2;
  grid-column: 2;
  min-height: 0;
  overflow-y: auto;
  background: var(--motion-panel);
  border-left: 1px solid var(--motion-border);
}

.inspector-heading {
  min-height: 66px;
  padding: 13px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--motion-border);

  div {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  span {
    color: var(--motion-muted);
    font-size: 11px;
  }

  strong {
    max-width: 190px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fps {
    padding: 4px 6px;
    border-radius: 3px;
    background: #2c2c3a;
    color: #c4b5fd;
    font-family: Consolas, monospace;
  }
}

.inspector-section {
  padding: 14px;
  border-bottom: 1px solid var(--motion-border);

  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 11px;

    > span {
      color: var(--motion-muted);
      font-size: 11px;
    }
  }

  input,
  select {
    width: 100%;
    height: 30px;
    padding: 0 8px;
    color: var(--motion-text);
    background: #15151d;
    border: 1px solid #3a3a4c;
    border-radius: 4px;
    outline: none;

    &:focus {
      border-color: var(--motion-accent);
    }
  }
}

.section-title {
  margin-bottom: 10px;
  font-weight: 600;
  color: #d8d8e3;
}

.two-fields,
.property-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.property-grid label {
  position: relative;

  span {
    position: absolute;
    left: 8px;
    top: 27px;
    z-index: 1;
    color: #77778a;
    font-size: 10px;
    pointer-events: none;
  }

  input {
    padding-left: 28px;
  }
}

.wide-field {
  margin-top: 3px;
}

.check-field {
  flex-direction: row !important;
  align-items: center;

  input {
    width: 16px;
    height: 16px;
  }
}

.inspector-actions {
  padding: 14px;
  display: flex;
  gap: 8px;

  button {
    flex: 1;
    height: 32px;
    border-radius: 5px;
    background: #313141;

    &:hover {
      background: #3c3c4f;
    }

    &.danger {
      color: #fecaca;
      background: rgba(239, 68, 68, .18);
    }
  }
}

.empty-inspector {
  min-height: 220px;
  padding: 40px 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--motion-muted);
  line-height: 1.6;
}

.empty-icon {
  margin-bottom: 16px;
  color: #8b5cf6;
  font-size: 38px;
}

.motion-history {
  border-top: 1px solid var(--motion-border);

  > header {
    padding: 13px 14px 10px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;

    div {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    span,
    small {
      color: var(--motion-muted);
      font-size: 10px;
    }

    span {
      padding: 2px 5px;
      border-radius: 3px;
      background: #292937;
      font-family: Consolas, monospace;
    }
  }
}

.history-list {
  padding: 0 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;

  > button {
    width: 100%;
    min-height: 42px;
    padding: 6px 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
    border-radius: 5px;
    background: transparent;

    &:hover {
      background: #292937;
    }

    &.current {
      background: rgba(139, 92, 246, .18);
      box-shadow: inset 2px 0 #8b5cf6;
    }

    &.future {
      opacity: .45;
    }
  }
}

.history-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #6b7280;

  .motion & {
    background: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, .14);
  }
}

.history-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    overflow: hidden;
    color: #e8e8f0;
    font-size: 11px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: var(--motion-muted);
    font-size: 9px;
  }
}

.current-mark {
  color: #c4b5fd;
  font-size: 9px;
}

.timeline-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--motion-panel);
}

.timeline-toolbar {
  padding: 0 10px;
  gap: 10px;
  overflow: hidden;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  > span,
  label {
    color: var(--motion-muted);
    font-size: 11px;
  }

  select,
  input[type='number'] {
    height: 26px;
    color: var(--motion-text);
    background: #15151d;
    border: 1px solid #3a3a4c;
    border-radius: 4px;
  }
}

.track-selector select {
  width: 135px;
}

.preset-list {
  min-width: 0;
  flex: 1;
  display: flex;
  gap: 5px;
  overflow-x: auto;

  button {
    height: 28px;
    padding: 0 8px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    border-radius: 4px;
    background: #2a2a38;
    font-size: 11px;

    &:hover {
      background: #383849;
    }

    span {
      width: 6px;
      height: 14px;
      border-radius: 2px;
    }
  }
}

.gsapify-picker {
  width: 250px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;

  > span {
    color: #c4b5fd;
    font-size: 10px;
    white-space: nowrap;
  }

  select {
    min-width: 0;
    flex: 1;
    height: 27px;
    color: var(--motion-text);
    background: #15151d;
    border: 1px solid #514b70;
    border-radius: 4px;
  }

  button {
    height: 27px;
    padding: 0 8px;
    flex-shrink: 0;
    border-radius: 4px;
    background: #6d4dd8;
    font-size: 11px;

    &:hover {
      background: #805eea;
    }
  }
}

.timeline-settings {
  input[type='number'] {
    width: 48px;
    padding: 0 4px;
  }

  input[type='range'] {
    width: 72px;
  }
}

.timeline-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  position: relative;
}

.timeline-content {
  min-height: 100%;
  position: relative;
}

.timeline-row {
  height: 36px;
  display: flex;
  border-bottom: 1px solid #292936;
}

.ruler-row {
  height: 28px;
  position: sticky;
  top: 0;
  z-index: 8;
  background: #20202b;
}

.track-label {
  width: 190px;
  padding: 0 10px;
  flex-shrink: 0;
  position: sticky;
  left: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #20202b;
  border-right: 1px solid var(--motion-border);

  > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  strong {
    max-width: 138px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 500;
  }

  small {
    color: #777789;
    font-size: 9px;
  }
}

.ruler-label {
  justify-content: space-between;
  color: var(--motion-muted);
  font-size: 10px;
}

.track-type {
  width: 30px;
  height: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: #dbeafe;
  background: #334155;
  font: 9px Consolas, monospace;

  &.camera { background: #6d28d9; }
  &.background { background: #7c3aed; }
  &.text { background: #0369a1; }
  &.image { background: #047857; }
  &.shape { background: #b45309; }
}

.track-row.selected .track-label {
  background: #28283a;
  box-shadow: inset 3px 0 #8b5cf6;
}

.ruler-track,
.track-lane {
  flex-shrink: 0;
  position: relative;
}

.ruler-track {
  cursor: ew-resize;
}

.ruler-tick {
  position: absolute;
  top: 12px;
  bottom: 0;
  width: 1px;
  background: #4a4a5c;

  &.major {
    top: 7px;
    background: #66667a;
  }

  span {
    position: absolute;
    top: -7px;
    left: 4px;
    color: #8e8e9f;
    font: 9px Consolas, monospace;
  }
}

.track-lane {
  cursor: crosshair;
  background-image: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent calc(var(--half-second) - 1px),
    rgba(255, 255, 255, .04) calc(var(--half-second) - 1px),
    rgba(255, 255, 255, .04) var(--half-second)
  );
}

.frame-block {
  height: 24px;
  min-width: 16px;
  position: absolute;
  top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 4px;
  color: #e0f2fe;
  background: linear-gradient(90deg, #0369a1, #075985);
  border: 1px solid #38bdf8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .35);
  cursor: grab;
  overflow: hidden;
  user-select: none;

  &.to {
    color: #dcfce7;
    background: linear-gradient(90deg, #047857, #065f46);
    border-color: #34d399;
  }

  &.fromTo {
    color: #ede9fe;
    background: linear-gradient(90deg, #6d28d9, #5b21b6);
    border-color: #a78bfa;
  }

  &.set {
    color: #fef3c7;
    background: #92400e;
    border-color: #fbbf24;
  }

  &.selected {
    z-index: 3;
    outline: 2px solid #fff;
    outline-offset: 1px;
  }
}

.frame-gem {
  margin-left: 5px;
  font-size: 8px;
}

.frame-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
}

.resize-handle {
  width: 5px;
  height: 100%;
  margin-left: auto;
  flex-shrink: 0;
  cursor: ew-resize;
  background: rgba(255, 255, 255, .28);
}

.playhead {
  width: 1px;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 7;
  pointer-events: none;
  background: #ef4444;

  span {
    width: 9px;
    height: 9px;
    position: absolute;
    top: 1px;
    left: -4px;
    transform: rotate(45deg);
    background: #ef4444;
  }
}

::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}
::-webkit-scrollbar-thumb {
  border: 2px solid #1d1d27;
  border-radius: 8px;
  background: #4a4a5e;
}
::-webkit-scrollbar-corner {
  background: #1d1d27;
}
</style>
