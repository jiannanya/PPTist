import { gsap } from 'gsap'
import type { SlideMotion, SlideMotionPosition, SlideMotionTween, SlideMotionVars } from '@/types/slides'
import { appendGsapifyEffect } from '@/utils/gsapifyEffectRuntime'

const ALLOWED_VARS = new Set([
  'duration',
  'delay',
  'ease',
  'x',
  'y',
  'z',
  'xPercent',
  'yPercent',
  'scale',
  'scaleX',
  'scaleY',
  'rotation',
  'rotationX',
  'rotationY',
  'skewX',
  'skewY',
  'transformOrigin',
  'transformPerspective',
  'autoAlpha',
  'opacity',
  'filter',
  'clipPath',
  'backgroundColor',
  'backgroundImage',
  'backgroundPosition',
  'backgroundSize',
  'color',
  'borderColor',
  'borderRadius',
  'boxShadow',
  'textShadow',
  'letterSpacing',
  'stroke',
  'strokeWidth',
  'strokeDasharray',
  'strokeDashoffset',
  'fill',
  'perspective',
  'transformStyle',
  'transformBox',
  'svgOrigin',
  'force3D',
  'keyframes',
  'snap',
  'clearProps',
  'repeat',
  'yoyo',
  'stagger',
  'overwrite',
  'immediateRender',
])

const MOTION_CLEANUPS = new WeakMap<gsap.core.Timeline, Set<() => void>>()

export interface MotionStepTiming {
  index: number
  start: number
  duration: number
  end: number
}

export interface CreateMotionTimelineOptions {
  paused?: boolean
  onUpdate?: () => void
  onComplete?: () => void
}

export const sanitizeMotionVars = (vars?: SlideMotionVars): gsap.TweenVars => {
  if (!vars) return {}
  return Object.fromEntries(
    Object.entries(vars).filter(([key]) => ALLOWED_VARS.has(key))
  ) as gsap.TweenVars
}

export const normalizeMotionPosition = (position?: SlideMotionPosition) => {
  if (typeof position === 'number' && Number.isFinite(position)) return position
  if (typeof position === 'string' && position.length <= 80) return position
  return undefined
}

export const resolveMotionTargets = (root: HTMLElement, elIds: string[]) => {
  const elementsById = new Map<string, HTMLElement>()
  root.querySelectorAll<HTMLElement>('.screen-element[data-element-id]').forEach(element => {
    const id = element.dataset.elementId
    if (!id) return

    // `.screen-element` is a full-slide overlay; the actual positioned PPT
    // object is its first child. Animating the overlay makes rotation/scale
    // orbit around the whole canvas instead of the element's own transform
    // origin, which is especially visible in card flips and domino shots.
    const visualElement = element.firstElementChild
    elementsById.set(
      id,
      visualElement instanceof HTMLElement ? visualElement : element
    )
  })

  const specialTargets = new Map<string, HTMLElement | null>([
    ['$stage', root.querySelector<HTMLElement>('.motion-layer')],
    ['$background', root.querySelector<HTMLElement>('.background')],
  ])

  const targets = elIds
    .map(id => specialTargets.has(id) ? specialTargets.get(id) : elementsById.get(id))
    .filter((element): element is HTMLElement => !!element)
  return [...new Set(targets)]
}

const getStepVars = (step: SlideMotionTween) => step.method === 'fromTo' ? step.toVars : step.vars

export const calculateMotionStepTimings = (motion?: SlideMotion): MotionStepTiming[] => {
  if (!motion) return []

  const defaultDuration = Number(motion.defaults?.duration) || 0.5
  const timings: MotionStepTiming[] = []
  let previousStart = 0
  let previousEnd = 0

  motion.steps.forEach((step, index) => {
    const vars = getStepVars(step)
    const tweenDuration = Math.max(0, Number(vars?.duration) || defaultDuration)
    const repeat = Math.max(0, Number(vars?.repeat) || 0)
    const duration = tweenDuration * (repeat + 1)
    const position = step.position
    let start = previousEnd

    if (typeof position === 'number' && Number.isFinite(position)) {
      start = Math.max(0, position)
    }
    else if (typeof position === 'string') {
      const value = Number.parseFloat(position.replace(/[<>=]/g, '')) || 0
      if (position.startsWith('+=')) start = previousEnd + value
      else if (position.startsWith('-=')) start = previousEnd - value
      else if (position.startsWith('<')) start = previousStart + value
      else if (position.startsWith('>')) start = previousEnd + value
      else if (Number.isFinite(Number(position))) start = Number(position)
    }

    start = Math.max(0, start)
    const end = start + duration
    timings.push({ index, start, duration, end })
    previousStart = start
    previousEnd = end
  })

  return timings
}

export const getMotionDuration = (motion?: SlideMotion) => {
  if (!motion) return 5
  const contentDuration = Math.max(0, ...calculateMotionStepTimings(motion).map(item => item.end))
  return Math.max(1, motion.duration || 0, contentDuration)
}

export const createMotionTimeline = (
  root: HTMLElement,
  motion: SlideMotion,
  options: CreateMotionTimelineOptions = {}
) => {
  const cleanups = new Set<() => void>()
  const timeline = gsap.timeline({
    paused: options.paused ?? true,
    repeat: motion.repeat ?? 0,
    yoyo: motion.yoyo ?? false,
    defaults: sanitizeMotionVars(motion.defaults),
    onUpdate: options.onUpdate,
    onComplete: options.onComplete,
  })

  for (const step of motion.steps) {
    const targets = resolveMotionTargets(root, step.elIds)
    if (!targets.length) continue

    const position = normalizeMotionPosition(step.position)
    if (step.method === 'effect') {
      appendGsapifyEffect({
        root,
        timeline,
        step,
        targets,
        position,
        addCleanup: cleanup => cleanups.add(cleanup),
      })
    }
    else if (step.method === 'set') {
      timeline.set(targets, sanitizeMotionVars(step.vars), position)
    }
    else if (step.method === 'from') {
      timeline.from(targets, sanitizeMotionVars(step.vars), position)
    }
    else if (step.method === 'to') {
      timeline.to(targets, sanitizeMotionVars(step.vars), position)
    }
    else {
      timeline.fromTo(
        targets,
        sanitizeMotionVars(step.fromVars),
        sanitizeMotionVars(step.toVars),
        position
      )
    }
  }

  const sceneDuration = getMotionDuration(motion)
  if (sceneDuration > timeline.duration()) timeline.call(() => {}, [], sceneDuration)
  timeline.timeScale(motion.timeScale ?? 1)
  MOTION_CLEANUPS.set(timeline, cleanups)
  return timeline
}

export const disposeMotionTimeline = (timeline?: gsap.core.Timeline | null) => {
  if (!timeline) return
  const cleanups = MOTION_CLEANUPS.get(timeline)
  if (cleanups) {
    for (const cleanup of cleanups) cleanup()
    cleanups.clear()
    MOTION_CLEANUPS.delete(timeline)
  }
  timeline.kill()
}
