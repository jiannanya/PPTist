import { gsap } from 'gsap'
import { CustomBounce } from 'gsap/CustomBounce'
import { CustomEase } from 'gsap/CustomEase'
import { CustomWiggle } from 'gsap/CustomWiggle'
import { Draggable } from 'gsap/Draggable'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { Flip } from 'gsap/Flip'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { Observer } from 'gsap/Observer'
import { Physics2DPlugin } from 'gsap/Physics2DPlugin'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { TextPlugin } from 'gsap/TextPlugin'
import { GSAPIFY_EFFECTS_BY_ID } from '@/data/gsapifyEffects'
import type { SlideMotionPosition, SlideMotionTween } from '@/types/slides'
import { resolveMotionEase } from '@/utils/animeEase'
import type { EaseFunction } from '@/utils/animeEase'

/** A GSAPify effect ease: a GSAP ease string or a resolved anime.js function ease. */
type EffectEase = string | EaseFunction

gsap.registerPlugin(
  CustomEase,
  CustomBounce,
  CustomWiggle,
  Draggable,
  DrawSVGPlugin,
  Flip,
  InertiaPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  Observer,
  Physics2DPlugin,
  ScrambleTextPlugin,
  ScrollTrigger,
  SplitText,
  TextPlugin
)

export interface AppendGsapifyEffectOptions {
  root: HTMLElement
  timeline: gsap.core.Timeline
  step: SlideMotionTween
  targets: HTMLElement[]
  position?: SlideMotionPosition
  addCleanup: (cleanup: () => void) => void
}

const SPLIT_EFFECTS = new Set([
  'stagger-letter-reveal',
  'word-by-word-slide',
  'kinetic-split-lines',
  'letter-3d-flip',
  'per-char-physics',
  'liquid-text-wave',
])
const SCRAMBLE_EFFECTS = new Set([
  'text-scramble',
  'matrix-decode',
  'encryption-viz',
])
const TEXT_EFFECTS = new Set(['typewriter', 'counter-preloader'])
const DRAW_EFFECTS = new Set([
  'svg-line-draw',
  'logo-stroke-reveal',
  'blueprint-reveal',
  'constellation-connect',
  'signature-draw',
  'circuit-trace',
  'animated-infographic',
  'circular-progress',
])
const MORPH_EFFECTS = new Set([
  'icon-morph',
  'shape-morph',
  'animated-blob',
  'liquid-button-morph',
  'mood-face-morph',
  'animal-silhouette',
  'day-night-scene',
  'gooey-menu',
])
const MOTION_PATH_EFFECTS = new Set([
  'satellite-orbit',
  'conveyor-belt',
  'scroll-path-journey',
  'dna-helix',
  'rollercoaster-stats',
])
const PHYSICS_EFFECTS = new Set([
  'confetti-cannon',
  'gravity-card-drop',
  'popcorn-loader',
  'particle-text',
  'gravity-form',
])
const DRAG_EFFECTS = new Set([
  'before-after-slider',
  'elastic-stretch',
  'scratch-off',
  'card-deck-toss',
  'cube-drag-3d',
  'wheel-spin',
  'throw-and-snap',
  'draggable-carousel',
  'vertical-card-stack',
])
const FLIP_EFFECTS = new Set([
  'card-expand-detail',
  'flip-grid-filter',
  'shared-element-transition',
  'accordion-motion',
])
const HOVER_EFFECTS = new Set([
  'tilt-parallax-card',
  'card-hover-lift',
  'image-tilt-hover',
  'magnetic-button',
  'underline-slide',
  'hover-border-draw',
  'ripple-click',
  'button-shimmer',
  'cursor-spotlight',
])

const getNumber = (step: SlideMotionTween, key: string, fallback: number) => {
  const value = step.vars?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

const getString = (step: SlideMotionTween, key: string, fallback: string) => {
  const value = step.vars?.[key]
  return typeof value === 'string' ? value : fallback
}

const slideElements = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('.screen-element[data-element-id]'))
    .map(element => element.firstElementChild)
    .filter((element): element is HTMLElement => element instanceof HTMLElement)

const expandTargets = (root: HTMLElement, targets: HTMLElement[]) => {
  const expanded: HTMLElement[] = []
  for (const target of targets) {
    if (target.classList.contains('motion-layer')) expanded.push(...slideElements(root))
    else expanded.push(target)
  }
  return [...new Set(expanded)]
}

const textTargets = (targets: HTMLElement[]) =>
  targets.map(target => target.querySelector<HTMLElement>('.text') || target)

const svgPaths = (targets: HTMLElement[]) => {
  const paths: SVGPathElement[] = []
  for (const target of targets) {
    if (target instanceof SVGPathElement) paths.push(target)
    paths.push(...target.querySelectorAll<SVGPathElement>('path, line, polyline, polygon, rect, circle, ellipse'))
  }
  return [...new Set(paths)]
}

const addHold = (timeline: gsap.core.Timeline, duration: number) => {
  const state = { progress: 0 }
  timeline.to(state, { progress: 1, duration, ease: 'none' })
}

const attachHover = (
  targets: HTMLElement[],
  enter: (target: HTMLElement, event: PointerEvent) => void,
  leave: (target: HTMLElement) => void,
  addCleanup: (cleanup: () => void) => void
) => {
  for (const target of targets) {
    const onEnter = (event: PointerEvent) => enter(target, event)
    const onMove = (event: PointerEvent) => enter(target, event)
    const onLeave = () => leave(target)
    target.addEventListener('pointerenter', onEnter)
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerleave', onLeave)
    addCleanup(() => {
      target.removeEventListener('pointerenter', onEnter)
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerleave', onLeave)
    })
  }
}

const buildSplitEffect = (
  effectId: string,
  timeline: gsap.core.Timeline,
  targets: HTMLElement[],
  duration: number,
  ease: EffectEase,
  addCleanup: (cleanup: () => void) => void
) => {
  const mode = effectId === 'kinetic-split-lines'
    ? 'lines'
    : effectId === 'word-by-word-slide'
      ? 'words'
      : 'chars'
  const parts: Element[] = []

  for (const target of textTargets(targets)) {
    const split = SplitText.create(target, {
      type: mode,
      charsClass: 'pptist-motion-char',
      wordsClass: 'pptist-motion-word',
      linesClass: 'pptist-motion-line',
      aria: 'auto',
    })
    parts.push(...(mode === 'lines' ? split.lines : mode === 'words' ? split.words : split.chars))
    addCleanup(() => split.revert())
  }

  if (!parts.length) return false

  if (effectId === 'per-char-physics') {
    timeline.from(parts, {
      physics2D: { velocity: 220, angle: 250, gravity: 520 },
      autoAlpha: 0,
      duration,
      stagger: 0.025,
    } as gsap.TweenVars)
  }
  else if (effectId === 'liquid-text-wave') {
    const wiggle = CustomWiggle.create(`pptist-wiggle-${Date.now()}`, {
      wiggles: 6,
      type: 'easeInOut',
    })
    timeline.from(parts, {
      yPercent: 90,
      rotation: 8,
      autoAlpha: 0,
      duration,
      stagger: 0.035,
      ease: wiggle,
    })
  }
  else if (effectId === 'letter-3d-flip') {
    timeline.from(parts, {
      rotationX: -110,
      yPercent: 70,
      autoAlpha: 0,
      transformOrigin: '50% 100%',
      transformPerspective: 900,
      duration,
      stagger: 0.04,
      ease,
    })
  }
  else if (effectId === 'kinetic-split-lines') {
    timeline.from(parts, {
      xPercent: index => index % 2 ? 100 : -100,
      skewX: index => index % 2 ? 12 : -12,
      autoAlpha: 0,
      duration,
      stagger: 0.08,
      ease,
    })
  }
  else {
    timeline.from(parts, {
      yPercent: 120,
      rotationX: -70,
      autoAlpha: 0,
      transformOrigin: '50% 100%',
      duration,
      stagger: mode === 'words' ? 0.08 : 0.035,
      ease,
    })
  }
  return true
}

const buildTextEffect = (
  effectId: string,
  timeline: gsap.core.Timeline,
  targets: HTMLElement[],
  duration: number
) => {
  const nodes = textTargets(targets)
  if (!nodes.length) return false

  if (effectId === 'counter-preloader') {
    const state = { value: 0 }
    const original = nodes[0].textContent || '100'
    const target = Number(original.replace(/[^\d.-]/g, '')) || 100
    timeline.to(state, {
      value: target,
      duration,
      snap: { value: 1 },
      onUpdate: () => { nodes[0].textContent = `${Math.round(state.value)}%` },
    })
  }
  else {
    for (const node of nodes) {
      const finalText = node.textContent || ''
      node.textContent = ''
      timeline.to(node, { text: finalText, duration, ease: 'none' }, '<')
    }
  }
  return true
}

const buildScrambleEffect = (
  effectId: string,
  timeline: gsap.core.Timeline,
  targets: HTMLElement[],
  duration: number
) => {
  const chars = effectId === 'matrix-decode' ? '01' : effectId === 'encryption-viz' ? 'ABCDEF0123456789' : '!<>-_\\/[]{}—=+*^?#'
  for (const node of textTargets(targets)) {
    const finalText = node.textContent || ''
    timeline.to(node, {
      scrambleText: {
        text: finalText,
        chars,
        revealDelay: duration * 0.22,
        speed: 0.45,
      },
      duration,
      ease: 'none',
    } as gsap.TweenVars, '<')
  }
  return true
}

const buildDrawEffect = (
  effectId: string,
  timeline: gsap.core.Timeline,
  targets: HTMLElement[],
  duration: number,
  ease: EffectEase
) => {
  const paths = svgPaths(targets)
  if (!paths.length) {
    timeline.from(targets, {
      scaleX: 0,
      transformOrigin: effectId === 'signature-draw' ? '0% 50%' : '50% 50%',
      duration,
      stagger: 0.08,
      ease,
    })
    return true
  }

  timeline.fromTo(paths,
    { drawSVG: '0% 0%' },
    {
      drawSVG: '0% 100%',
      duration,
      stagger: effectId === 'circuit-trace' ? 0.12 : 0.06,
      ease,
    } as gsap.TweenVars
  )
  return true
}

const buildMorphEffect = (
  effectId: string,
  timeline: gsap.core.Timeline,
  targets: HTMLElement[],
  duration: number,
  ease: EffectEase
) => {
  const paths = svgPaths(targets)
  if (paths.length >= 2) {
    timeline.to(paths[0], {
      morphSVG: {
        shape: paths[1],
        type: effectId === 'animated-blob' ? 'rotational' : 'linear',
      },
      duration,
      ease,
    } as gsap.TweenVars)
    if (effectId === 'animal-silhouette' && paths.length > 2) {
      paths.slice(2).forEach(path => {
        timeline.to(paths[0], { morphSVG: path, duration, ease } as gsap.TweenVars)
      })
    }
  }
  else {
    timeline.to(targets, {
      borderRadius: effectId.includes('liquid') || effectId.includes('gooey') ? '45% 55% 60% 40%' : '50%',
      scale: 1.06,
      rotation: effectId === 'mood-face-morph' ? 5 : 0,
      duration,
      repeat: effectId === 'animated-blob' ? 1 : 0,
      yoyo: true,
      ease,
    })
  }
  return true
}

const buildMotionPathEffect = (
  effectId: string,
  timeline: gsap.core.Timeline,
  targets: HTMLElement[],
  duration: number
) => {
  const paths = svgPaths(targets)
  const mover = targets.find(target => !target.querySelector('path')) || targets[0]
  const path = paths[0]
  if (mover && path) {
    timeline.to(mover, {
      motionPath: {
        path,
        align: path,
        alignOrigin: [0.5, 0.5],
        autoRotate: effectId !== 'dna-helix',
      },
      duration,
      ease: effectId === 'conveyor-belt' ? 'none' : 'power1.inOut',
    } as gsap.TweenVars)
  }
  else {
    timeline.to(targets, {
      keyframes: effectId === 'conveyor-belt'
        ? { x: [0, 180, 360], y: [0, 0, 0] }
        : { x: [0, 100, 0, -100, 0], y: [-70, 0, 70, 0, -70] },
      duration,
      ease: 'none',
    })
  }
  return true
}

const createParticles = (
  root: HTMLElement,
  count: number,
  addCleanup: (cleanup: () => void) => void
) => {
  const host = root.querySelector<HTMLElement>('.motion-layer') || root
  const particles: HTMLElement[] = []
  for (let index = 0; index < count; index++) {
    const particle = document.createElement('span')
    particle.dataset.pptistMotionParticle = 'true'
    Object.assign(particle.style, {
      position: 'absolute',
      left: '50%',
      top: '52%',
      width: `${6 + index % 4 * 2}px`,
      height: `${6 + index % 4 * 2}px`,
      borderRadius: index % 3 ? '50%' : '2px',
      background: ['#8b5cf6', '#22d3ee', '#fbbf24', '#fb7185'][index % 4],
      pointerEvents: 'none',
      zIndex: '999',
    })
    host.appendChild(particle)
    particles.push(particle)
  }
  addCleanup(() => particles.forEach(particle => particle.remove()))
  return particles
}

const buildPhysicsEffect = (
  effectId: string,
  timeline: gsap.core.Timeline,
  root: HTMLElement,
  targets: HTMLElement[],
  duration: number,
  addCleanup: (cleanup: () => void) => void
) => {
  const particles = effectId === 'confetti-cannon' || effectId === 'popcorn-loader'
    ? createParticles(root, effectId === 'confetti-cannon' ? 28 : 14, addCleanup)
    : targets
  const count = Math.max(1, particles.length)
  const bounce = CustomBounce.create(`pptist-bounce-${Date.now()}`, {
    strength: 0.6,
    squash: 2,
  })

  if (effectId === 'gravity-card-drop' || effectId === 'gravity-form') {
    timeline.from(particles, {
      y: -220,
      rotation: index => (index - count / 2) * 3,
      autoAlpha: 0,
      duration,
      stagger: 0.12,
      ease: bounce,
    })
  }
  else if (effectId === 'particle-text') {
    timeline.from(particles, {
      physics2D: {
        velocity: 180,
        angle: 250,
        gravity: 380,
      },
      autoAlpha: 0,
      duration,
      stagger: 0.02,
    } as gsap.TweenVars)
  }
  else {
    timeline.fromTo(particles,
      { x: 0, y: 0, scale: 0, autoAlpha: 1 },
      {
        physics2D: {
          velocity: 220,
          angle: index => 210 + index / count * 120,
          gravity: 420,
        },
        scale: 1,
        autoAlpha: 0,
        duration,
        stagger: 0.015,
      } as gsap.TweenVars
    )
  }
  return true
}

const buildDragEffect = (
  effectId: string,
  root: HTMLElement,
  targets: HTMLElement[],
  addCleanup: (cleanup: () => void) => void
) => {
  const type = effectId === 'wheel-spin'
    ? 'rotation'
    : effectId === 'vertical-card-stack'
      ? 'y'
      : effectId === 'draggable-carousel' || effectId === 'before-after-slider'
        ? 'x'
        : 'x,y'
  const instances = Draggable.create(targets, {
    type,
    bounds: root,
    inertia: ['card-deck-toss', 'wheel-spin', 'throw-and-snap', 'draggable-carousel'].includes(effectId),
    edgeResistance: 0.78,
    cursor: 'grab',
    activeCursor: 'grabbing',
    snap: effectId === 'throw-and-snap'
      ? { x: value => Math.round(value / 40) * 40, y: value => Math.round(value / 40) * 40 }
      : undefined,
  })
  addCleanup(() => instances.forEach(instance => instance.kill()))
  return true
}

const buildFlipEffect = (
  effectId: string,
  timeline: gsap.core.Timeline,
  targets: HTMLElement[],
  duration: number,
  ease: EffectEase
) => {
  const state = Flip.getState(targets)
  gsap.set(targets, {
    x: index => effectId === 'accordion-motion' ? 0 : (index - targets.length / 2) * 24,
    y: index => effectId === 'accordion-motion' ? index * 8 : 0,
    scale: effectId === 'card-expand-detail' ? 1.08 : 1,
  })
  const tween = Flip.from(state, {
    duration,
    ease,
    stagger: 0.06,
    absolute: effectId === 'shared-element-transition',
    scale: true,
  })
  timeline.add(tween, 0)
  return true
}

const buildHoverEffect = (
  effectId: string,
  root: HTMLElement,
  targets: HTMLElement[],
  addCleanup: (cleanup: () => void) => void
) => {
  if (effectId === 'ripple-click') {
    for (const target of targets) {
      const onClick = (event: PointerEvent) => {
        const rect = target.getBoundingClientRect()
        const ripple = document.createElement('span')
        Object.assign(ripple.style, {
          position: 'absolute',
          left: `${event.clientX - rect.left}px`,
          top: `${event.clientY - rect.top}px`,
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'currentColor',
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
        })
        target.appendChild(ripple)
        gsap.to(ripple, {
          scale: 8,
          autoAlpha: 0,
          duration: 0.65,
          onComplete: () => ripple.remove(),
        })
      }
      target.addEventListener('pointerdown', onClick)
      addCleanup(() => target.removeEventListener('pointerdown', onClick))
    }
    return true
  }

  attachHover(
    targets,
    (target, event) => {
      const rect = target.getBoundingClientRect()
      const dx = (event.clientX - rect.left - rect.width / 2) / Math.max(1, rect.width)
      const dy = (event.clientY - rect.top - rect.height / 2) / Math.max(1, rect.height)
      if (effectId === 'magnetic-button') {
        gsap.to(target, { x: dx * 28, y: dy * 20, duration: 0.28, overwrite: 'auto' })
      }
      else if (effectId === 'tilt-parallax-card' || effectId === 'image-tilt-hover') {
        gsap.to(target, {
          rotationY: dx * 14,
          rotationX: -dy * 12,
          transformPerspective: 900,
          scale: 1.035,
          duration: 0.28,
          overwrite: 'auto',
        })
      }
      else if (effectId === 'cursor-spotlight') {
        gsap.to(root, {
          '--pptist-spot-x': `${event.clientX - root.getBoundingClientRect().left}px`,
          '--pptist-spot-y': `${event.clientY - root.getBoundingClientRect().top}px`,
          duration: 0.18,
        } as gsap.TweenVars)
      }
      else {
        gsap.to(target, {
          y: -10,
          scale: 1.035,
          boxShadow: '0 18px 42px rgba(0,0,0,.28)',
          duration: 0.28,
          overwrite: 'auto',
        })
      }
    },
    target => {
      gsap.to(target, {
        x: 0,
        y: 0,
        rotationX: 0,
        rotationY: 0,
        scale: 1,
        boxShadow: 'none',
        duration: 0.4,
        overwrite: 'auto',
      })
    },
    addCleanup
  )
  return true
}

const buildCoreEffect = (
  effectId: string,
  timeline: gsap.core.Timeline,
  targets: HTMLElement[],
  duration: number,
  ease: EffectEase
) => {
  const many = Math.max(1, targets.length)

  switch (effectId) {
    case 'gradient-text-reveal':
      timeline.fromTo(targets,
        { clipPath: 'inset(0 100% 0 0)', backgroundPosition: '100% 50%' },
        { clipPath: 'inset(0 0% 0 0)', backgroundPosition: '0% 50%', duration, ease }
      )
      break
    case 'glitch-text':
      timeline.fromTo(targets,
        { autoAlpha: 0, x: -8, skewX: -8, filter: 'hue-rotate(90deg)' },
        {
          autoAlpha: 1,
          keyframes: { x: [-8, 7, -4, 2, 0], skewX: [-8, 6, -3, 0] },
          filter: 'hue-rotate(0deg)',
          duration,
          ease: 'steps(6)',
        }
      )
      break
    case 'fade-up-scroll':
    case 'card-slide-stagger':
    case 'masonry-cascade':
    case 'staggered-grid-reveal':
      timeline.from(targets, {
        y: 80,
        autoAlpha: 0,
        scale: 0.92,
        duration,
        stagger: 0.08,
        ease,
      })
      break
    case 'parallax-layers':
      timeline.fromTo(targets,
        { y: index => (index - many / 2) * 42 },
        { y: index => (many / 2 - index) * 30, duration, stagger: 0.04, ease: 'none' }
      )
      break
    case 'horizontal-scroll':
      timeline.fromTo(targets,
        { x: index => index * 120 },
        { x: index => (index - many + 1) * -120, duration, stagger: 0.04, ease: 'none' }
      )
      break
    case 'scroll-scrub':
      timeline.from(targets, { scaleX: 0, transformOrigin: '0% 50%', duration, ease: 'none' })
      break
    case 'scroll-velocity-skew':
      timeline.from(targets, { x: -180, skewX: -18, autoAlpha: 0, duration, stagger: 0.06, ease: 'power4.out' })
      break
    case 'layered-zoom':
    case 'image-parallax-zoom':
    case 'ken-burns-slideshow':
      timeline.fromTo(targets, { scale: 1.16, xPercent: -3 }, { scale: 1, xPercent: 0, duration, ease: 'sine.out' })
      break
    case 'velocity-blur':
      timeline.from(targets, { x: -160, filter: 'blur(18px)', autoAlpha: 0, duration, stagger: 0.05, ease })
      break
    case 'card-3d-flip':
      timeline.from(targets, { rotationY: -100, autoAlpha: 0, transformPerspective: 1000, duration, stagger: 0.08, ease })
      break
    case 'stacked-card-fan':
      timeline.from(targets, {
        y: 120,
        scale: 0.76,
        rotation: index => (index - many / 2) * 7,
        autoAlpha: 0,
        duration,
        stagger: 0.08,
        ease: 'back.out(1.5)',
      })
      break
    case 'card-bg-shift':
      timeline.to(targets, { backgroundColor: '#7c3aed', color: '#ffffff', duration, stagger: 0.05, yoyo: true, repeat: 1, ease })
      break
    case 'clip-path-reveal':
      timeline.from(targets, { clipPath: 'inset(0 100% 0 0 round 16px)', duration, stagger: 0.08, ease: 'power4.inOut' })
      break
    case 'grayscale-to-color':
      timeline.from(targets, { filter: 'grayscale(1)', scale: 1.04, duration, ease })
      break
    case 'floating-shapes':
    case 'particle-float':
      timeline.to(targets, {
        x: index => (index % 2 ? 1 : -1) * (12 + index % 4 * 5),
        y: index => -12 - index % 5 * 5,
        rotation: index => (index % 2 ? 1 : -1) * 5,
        duration,
        stagger: 0.06,
        repeat: 1,
        yoyo: true,
        ease: 'sine.inOut',
      })
      break
    case 'magnetic-repel':
      timeline.from(targets, {
        x: index => Math.cos(index / many * Math.PI * 2) * 120,
        y: index => Math.sin(index / many * Math.PI * 2) * 90,
        scale: 0.6,
        autoAlpha: 0,
        duration,
        stagger: 0.025,
        ease,
      })
      break
    case 'jelly-button':
    case 'wobble-card-enter':
    case 'springboard-menu': {
      const bounce = CustomBounce.create(`pptist-core-bounce-${Date.now()}`, { strength: 0.55, squash: 2 })
      timeline.from(targets, {
        y: effectId === 'springboard-menu' ? 100 : 40,
        scaleX: 0.72,
        scaleY: 1.2,
        autoAlpha: 0,
        duration,
        stagger: 0.08,
        ease: bounce,
      })
      break
    }
    case 'notification-shake': {
      const wiggle = CustomWiggle.create(`pptist-notice-${Date.now()}`, { wiggles: 8, type: 'uniform' })
      timeline.to(targets, { x: 14, rotation: 3, duration, ease: wiggle })
      break
    }
    case 'newtons-cradle':
      timeline.fromTo(targets,
        { rotation: index => index === 0 ? -35 : 0, transformOrigin: '50% 0%' },
        { rotation: index => index === many - 1 ? 35 : 0, duration, stagger: 0.06, ease: 'sine.inOut' }
      )
      break
    case 'infinite-loop':
    case 'parallax-slider':
      timeline.to(targets, { xPercent: -100, duration, stagger: 0.12, ease: 'power2.inOut' })
      break
    case 'coverflow-3d':
      timeline.from(targets, {
        x: index => (index - many / 2) * 130,
        rotationY: index => (index - many / 2) * -32,
        scale: index => index === Math.floor(many / 2) ? 1 : 0.76,
        autoAlpha: 0,
        transformPerspective: 1100,
        duration,
        stagger: 0.07,
        ease,
      })
      break
    case 'staggered-blinds':
    case 'curtain-reveal':
      timeline.from(targets, {
        scaleY: 0,
        transformOrigin: effectId === 'curtain-reveal' ? '50% 0%' : '50% 50%',
        autoAlpha: 0,
        duration,
        stagger: { each: 0.055, from: 'edges' },
        ease: 'power4.inOut',
      })
      break
    case 'circle-wipe':
      timeline.from(targets, { clipPath: 'circle(0% at 50% 50%)', duration, ease: 'power3.inOut' })
      break
    case 'skeleton-to-content':
      timeline.from(targets, { autoAlpha: 0, filter: 'blur(10px)', duration, stagger: 0.07, ease })
      break
    case 'count-up':
    case 'odometer':
      timeline.from(targets, { yPercent: 100, autoAlpha: 0, duration, stagger: 0.04, ease })
      break
    case 'animated-bar-chart':
      timeline.from(targets, { scaleY: 0, transformOrigin: '50% 100%', duration, stagger: 0.08, ease })
      break
    case 'animated-gradient':
    case 'aurora-waves':
      timeline.to(targets, {
        backgroundPosition: '100% 50%',
        filter: effectId === 'aurora-waves' ? 'hue-rotate(35deg) saturate(1.25)' : 'hue-rotate(25deg)',
        scale: 1.05,
        duration,
        repeat: 1,
        yoyo: true,
        ease: 'sine.inOut',
      })
      break
    default:
      timeline.from(targets, {
        y: 42,
        scale: 0.9,
        rotation: targets.length > 1 ? index => (index - many / 2) * 2 : 0,
        autoAlpha: 0,
        duration,
        stagger: 0.06,
        ease,
      })
  }
  return true
}

const buildShowcase = (
  effectId: string,
  timeline: gsap.core.Timeline,
  root: HTMLElement,
  targets: HTMLElement[],
  duration: number,
  ease: EffectEase,
  addCleanup: (cleanup: () => void) => void
) => {
  if (effectId === 'particle-text') {
    const nodes = textTargets(targets)
    return buildSplitEffect('per-char-physics', timeline, nodes, duration, ease, addCleanup)
  }
  if (effectId === 'gravity-form') {
    return buildPhysicsEffect(effectId, timeline, root, targets, duration, addCleanup)
  }

  const paths = svgPaths(targets)
  if (paths.length) {
    timeline.from(paths, { drawSVG: '0%', duration: duration * 0.45, stagger: 0.05 } as gsap.TweenVars)
  }
  timeline.from(targets, {
    y: 70,
    rotationX: -20,
    autoAlpha: 0,
    duration: duration * 0.35,
    stagger: 0.06,
    ease,
  }, paths.length ? '<0.15' : 0)
  const text = textTargets(targets)[0]
  if (text && effectId === 'scroll-storyteller') {
    timeline.to(text, {
      scrambleText: { text: text.textContent || '', chars: '01ABCDEF' },
      duration: duration * 0.35,
    } as gsap.TweenVars)
  }
  return true
}

export const appendGsapifyEffect = ({
  root,
  timeline,
  step,
  targets,
  position,
  addCleanup,
}: AppendGsapifyEffectOptions) => {
  const effectId = step.effectId || ''
  const definition = GSAPIFY_EFFECTS_BY_ID.get(effectId)
  if (!definition || !targets.length) return false

  const duration = Math.max(0.05, getNumber(step, 'duration', definition.duration))
  // Resolve `anime:`-prefixed ease tokens to anime.js function eases; native
  // GSAP ease strings pass through unchanged.
  const ease: EffectEase = resolveMotionEase(getString(step, 'ease', 'power3.out')) ?? 'power3.out'
  const resolvedTargets = expandTargets(root, targets)
  if (!resolvedTargets.length) return false

  const effectTimeline = gsap.timeline()
  let built = false

  if (effectId === 'particle-text' || effectId === 'scroll-storyteller' || effectId === 'gravity-form' || effectId === 'timeline-scroll-experience') {
    built = buildShowcase(effectId, effectTimeline, root, resolvedTargets, duration, ease, addCleanup)
  }
  else if (SPLIT_EFFECTS.has(effectId)) {
    built = buildSplitEffect(effectId, effectTimeline, resolvedTargets, duration, ease, addCleanup)
  }
  else if (SCRAMBLE_EFFECTS.has(effectId)) {
    built = buildScrambleEffect(effectId, effectTimeline, resolvedTargets, duration)
  }
  else if (TEXT_EFFECTS.has(effectId)) {
    built = buildTextEffect(effectId, effectTimeline, resolvedTargets, duration)
  }
  else if (DRAW_EFFECTS.has(effectId)) {
    built = buildDrawEffect(effectId, effectTimeline, resolvedTargets, duration, ease)
  }
  else if (MORPH_EFFECTS.has(effectId)) {
    built = buildMorphEffect(effectId, effectTimeline, resolvedTargets, duration, ease)
  }
  else if (MOTION_PATH_EFFECTS.has(effectId)) {
    built = buildMotionPathEffect(effectId, effectTimeline, resolvedTargets, duration)
  }
  else if (PHYSICS_EFFECTS.has(effectId)) {
    built = buildPhysicsEffect(effectId, effectTimeline, root, resolvedTargets, duration, addCleanup)
  }
  else if (DRAG_EFFECTS.has(effectId)) {
    built = buildDragEffect(effectId, root, resolvedTargets, addCleanup)
    addHold(effectTimeline, duration)
  }
  else if (FLIP_EFFECTS.has(effectId)) {
    built = buildFlipEffect(effectId, effectTimeline, resolvedTargets, duration, ease)
  }
  else if (HOVER_EFFECTS.has(effectId)) {
    built = buildHoverEffect(effectId, root, resolvedTargets, addCleanup)
    addHold(effectTimeline, duration)
  }
  else {
    built = buildCoreEffect(effectId, effectTimeline, resolvedTargets, duration, ease)
  }

  if (!built) return false
  timeline.add(effectTimeline, position)
  return true
}
