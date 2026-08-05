import { nextTick, onUnmounted, watch, type Ref } from 'vue'
import { gsap } from 'gsap'
import type { SlideMotion } from '@/types/slides'
import {
  createMotionTimeline,
  disposeMotionTimeline,
  getMotionDuration,
  resolveMotionTargets,
  sanitizeMotionVars,
} from '@/utils/gsapMotion'

const isZeroPosition = (position: unknown) => (
  position === 0 || position === '0'
)

// Apply authored position-0 sets before waiting for image decoding. Frame
// sequences are stacked DOM images; without this priming pass every frame is
// briefly visible while decode() runs, which makes translucent chart fills and
// rough strokes accumulate into bright/dark bands in fullscreen playback.
const primeMotionInitialState = (root: HTMLElement, motion: SlideMotion) => {
  motion.steps.forEach(step => {
    if (step.method !== 'set' || !isZeroPosition(step.position)) return
    const targets = resolveMotionTargets(root, step.elIds)
    if (!targets.length) return
    gsap.set(targets, sanitizeMotionVars(step.vars))
  })
}

const nextPaint = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

const waitForImageEvent = (image: HTMLImageElement, timeoutMs = 1800) => (
  new Promise<boolean>(resolve => {
    let timer = 0
    const cleanup = () => {
      image.removeEventListener('load', done)
      image.removeEventListener('error', done)
      window.clearTimeout(timer)
    }
    const done = () => {
      cleanup()
      resolve(image.complete && image.naturalWidth > 0)
    }
    image.addEventListener('load', done, { once: true })
    image.addEventListener('error', done, { once: true })
    timer = window.setTimeout(done, timeoutMs)
  })
)

const decodeMotionImage = async (image: HTMLImageElement) => {
  if (image.complete && image.naturalWidth > 0) return true
  const initialSrc = image.currentSrc || image.src

  if (typeof image.decode === 'function') {
    try {
      await image.decode()
    }
    catch {
      // Image components retry rejected data URIs through Blob URLs. Wait for
      // that reactive source replacement before deciding that the frame failed.
    }
  }
  if (image.complete && image.naturalWidth > 0) return true

  await nextTick()
  await nextPaint()
  const retrySrc = image.currentSrc || image.src
  if (retrySrc !== initialSrc && typeof image.decode === 'function') {
    try {
      await image.decode()
    }
    catch {
      // The nearest successfully decoded sequence frame is used below.
    }
  }
  if (image.complete && image.naturalWidth > 0) return true
  if (!image.complete || retrySrc !== initialSrc) return waitForImageEvent(image)
  return false
}

const decodeInBatches = async (images: HTMLImageElement[], concurrency = 6) => {
  const decoded = Array<boolean>(images.length).fill(false)
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(concurrency, images.length) },
    async () => {
      while (cursor < images.length) {
        const index = cursor++
        decoded[index] = await decodeMotionImage(images[index])
      }
    }
  )
  await Promise.all(workers)
  return decoded
}

const sequenceFrameInfo = (image: HTMLImageElement) => {
  const elementId = image.closest<HTMLElement>('.screen-element')?.dataset.elementId || ''
  const match = elementId.match(/^(.*)-f(\d+)$/)
  if (!match) return null
  return { key: match[1], frame: Number(match[2]) }
}

const recoverFailedSequenceFrames = async (images: HTMLImageElement[], decoded: boolean[]) => {
  const groups = new Map<string, Array<{ image: HTMLImageElement, index: number, frame: number }>>()
  images.forEach((image, index) => {
    const info = sequenceFrameInfo(image)
    if (!info) return
    const group = groups.get(info.key) || []
    group.push({ image, index, frame: info.frame })
    groups.set(info.key, group)
  })

  for (const group of groups.values()) {
    const healthy = group.filter(item => decoded[item.index] && item.image.naturalWidth > 0)
    if (!healthy.length) continue

    for (const failed of group.filter(item => !decoded[item.index] || item.image.naturalWidth <= 0)) {
      const nearest = healthy.reduce((best, candidate) => (
        Math.abs(candidate.frame - failed.frame) < Math.abs(best.frame - failed.frame)
          ? candidate
          : best
      ))
      failed.image.src = nearest.image.currentSrc || nearest.image.src
      failed.image.dataset.motionImageFallback = 'nearest-frame'
      decoded[failed.index] = await decodeMotionImage(failed.image)
    }
  }
}

const decodeMotionImages = async (root: HTMLElement) => {
  const images = [...root.querySelectorAll<HTMLImageElement>('img')]
  const decoded = await decodeInBatches(images)
  await recoverFailedSequenceFrames(images, decoded)

  const failures = images.filter((image, index) => !decoded[index] || image.naturalWidth <= 0)
  if (failures.length) {
    console.warn(`[PPTist motion] ${failures.length} image frame(s) could not be decoded`)
  }

  // Give complex SVG/Blob images one paint opportunity before opacity steps can
  // hide the currently covered frame.
  await nextPaint()
}

export default (
  slideRef: Readonly<Ref<HTMLElement | null>>,
  motionRef: Readonly<Ref<SlideMotion | undefined>>,
  activeRef: Readonly<Ref<boolean>>,
  onMotionComplete?: () => void
) => {
  let matchMedia: ReturnType<typeof gsap.matchMedia> | null = null
  let initialStateContext: gsap.Context | null = null
  let timeline: gsap.core.Timeline | null = null
  let buildToken = 0

  const reset = () => {
    disposeMotionTimeline(timeline)
    timeline = null
    matchMedia?.revert()
    matchMedia = null
    initialStateContext?.revert()
    initialStateContext = null
  }

  const teardown = () => {
    buildToken += 1
    reset()
  }

  const build = async () => {
    const token = ++buildToken

    // `active` changes at the START of a CSS page transition, while the
    // outgoing slide remains visible as `.last` for up to 750ms. Reverting
    // GSAP here would remove every frame-sequence autoAlpha style and expose
    // all stacked SVG frames. Freeze the exact current visual state instead;
    // reset only when the slide is reactivated or actually unmounted.
    if (!activeRef.value) {
      timeline?.pause()
      return
    }

    timeline?.pause()
    await nextTick()
    if (token !== buildToken || !activeRef.value) return

    const root = slideRef.value
    const motion = motionRef.value
    if (!root || !motion || motion.version !== 1) {
      reset()
      return
    }

    // Revert the frozen state and synchronously prime frame 0 in the same
    // microtask, so a re-entering slide never paints all stacked frames.
    reset()

    initialStateContext = gsap.context(() => {
      primeMotionInitialState(root, motion)
    }, root)

    await decodeMotionImages(root)
    if (token !== buildToken || !activeRef.value) return

    const allTargets = resolveMotionTargets(root, [...new Set(motion.steps.flatMap(step => step.elIds))])
    const handleComplete = () => {
      if (
        token === buildToken &&
        activeRef.value &&
        motion.autoAdvance
      ) onMotionComplete?.()
    }
    matchMedia = gsap.matchMedia()
    matchMedia.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
        allowMotion: '(prefers-reduced-motion: no-preference)',
      },
      context => {
        const reduceMotion = !!context.conditions?.reduceMotion

        if (reduceMotion) {
          const duration = getMotionDuration(motion)
          if (motion.reducedMotion === 'fade' && allTargets.length) {
            timeline = gsap.timeline({ paused: true, onComplete: handleComplete })
              .from(allTargets, { autoAlpha: 0, duration: 0.18, stagger: 0.01, ease: 'none' })
          }
          else {
            timeline = gsap.timeline({ paused: true, onComplete: handleComplete })
          }
          if (duration > timeline.duration()) timeline.call(() => {}, [], duration)
        }
        else {
          timeline = createMotionTimeline(root, motion, {
            onComplete: handleComplete,
          })
        }

        const readyTimeline = timeline
        readyTimeline.timeScale(motion.timeScale ?? 1)
        readyTimeline.pause(0)
        if (motion.autoplay !== false) {
          requestAnimationFrame(() => {
            if (token === buildToken && activeRef.value && timeline === readyTimeline) {
              readyTimeline.play(0)
            }
          })
        }

        return () => {
          disposeMotionTimeline(timeline)
          timeline = null
        }
      },
      root
    )
  }

  watch([slideRef, motionRef, activeRef], build, { immediate: true })
  onUnmounted(teardown)

  return {
    play: () => timeline?.play(),
    pause: () => timeline?.pause(),
    restart: () => timeline?.restart(),
    seek: (time: number) => timeline?.time(Math.max(0, time)),
  }
}
