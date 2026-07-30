import { nextTick, onUnmounted, watch, type Ref } from 'vue'
import { gsap } from 'gsap'
import type { SlideMotion } from '@/types/slides'
import {
  createMotionTimeline,
  disposeMotionTimeline,
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

const decodeMotionImages = async (root: HTMLElement) => {
  const images = [...root.querySelectorAll<HTMLImageElement>('img')]
  await Promise.all(images.map(async image => {
    if (typeof image.decode === 'function') {
      try {
        await image.decode()
      }
      catch {
        // A decode failure must not deadlock slide activation. The normal image
        // fallback remains visible and the player can continue.
      }
      return
    }
    if (image.complete) return
    await new Promise<void>(resolve => {
      const done = () => resolve()
      image.addEventListener('load', done, { once: true })
      image.addEventListener('error', done, { once: true })
    })
  }))

  // Give complex SVG data-URIs one paint opportunity before opacity steps can
  // hide the currently covered frame.
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
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
    matchMedia = gsap.matchMedia()
    matchMedia.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
        allowMotion: '(prefers-reduced-motion: no-preference)',
      },
      context => {
        const reduceMotion = !!context.conditions?.reduceMotion

        if (reduceMotion) {
          if (motion.reducedMotion === 'fade' && allTargets.length) {
            timeline = gsap.timeline({ paused: true })
              .from(allTargets, { autoAlpha: 0, duration: 0.18, stagger: 0.01, ease: 'none' })
          }
          else {
            timeline = gsap.timeline({ paused: true })
          }
        }
        else {
          timeline = createMotionTimeline(root, motion, {
            onComplete: () => {
              if (
                token === buildToken &&
                activeRef.value &&
                motion.autoAdvance
              ) onMotionComplete?.()
            },
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
