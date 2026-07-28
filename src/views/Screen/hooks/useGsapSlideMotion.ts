import { nextTick, onUnmounted, watch, type Ref } from 'vue'
import { gsap } from 'gsap'
import type { SlideMotion } from '@/types/slides'
import { createMotionTimeline, resolveMotionTargets } from '@/utils/gsapMotion'

export default (
  slideRef: Readonly<Ref<HTMLElement | null>>,
  motionRef: Readonly<Ref<SlideMotion | undefined>>,
  activeRef: Readonly<Ref<boolean>>
) => {
  let matchMedia: ReturnType<typeof gsap.matchMedia> | null = null
  let timeline: gsap.core.Timeline | null = null
  let buildToken = 0

  const teardown = () => {
    buildToken += 1
    timeline = null
    matchMedia?.revert()
    matchMedia = null
  }

  const build = async () => {
    const token = ++buildToken
    matchMedia?.revert()
    matchMedia = null
    timeline = null

    if (!activeRef.value || !motionRef.value) return

    await nextTick()
    if (token !== buildToken || !activeRef.value) return

    const root = slideRef.value
    const motion = motionRef.value
    if (!root || !motion || motion.version !== 1) return

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
          timeline = createMotionTimeline(root, motion)
        }

        timeline.timeScale(motion.timeScale ?? 1)
        if (motion.autoplay !== false) timeline.play(0)

        return () => {
          timeline?.kill()
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
