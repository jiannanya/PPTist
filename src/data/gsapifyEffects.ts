export type GsapifyTargetScope = 'selected' | 'stage' | 'background'

export interface GsapifyEffectDefinition {
  id: string
  label: string
  categoryId: string
  category: string
  plugins: string[]
  scope: GsapifyTargetScope
  duration: number
}

interface EffectCategorySource {
  id: string
  label: string
  scope: GsapifyTargetScope
  duration: number
  rows: string
}

const CATEGORY_SOURCES: EffectCategorySource[] = [
  {
    id: 'text-typography',
    label: 'Text & Typography',
    scope: 'selected',
    duration: 1.2,
    rows: `
stagger-letter-reveal|Stagger Letter Reveal|SplitText,ScrollTrigger
typewriter|Typewriter|TextPlugin
text-scramble|Text Scramble|ScrambleText
word-by-word-slide|Word-by-Word Slide|SplitText
kinetic-split-lines|Kinetic Split Lines|SplitText
letter-3d-flip|3D Letter Flip|SplitText
gradient-text-reveal|Gradient Text Reveal|Core GSAP
glitch-text|Glitch Text|Core GSAP
matrix-decode|Matrix Decode|ScrambleText
encryption-viz|Encryption Visualizer|ScrambleText
per-char-physics|Per-Character Physics Drop|SplitText,Physics2D
liquid-text-wave|Liquid Text Wave|SplitText,CustomWiggle`,
  },
  {
    id: 'scroll-animations',
    label: 'Scroll Animations',
    scope: 'stage',
    duration: 1.8,
    rows: `
fade-up-scroll|Fade Up on Scroll|ScrollTrigger
parallax-layers|Parallax Layers|ScrollTrigger
horizontal-scroll|Horizontal Scroll Section|ScrollTrigger
scroll-scrub|Scroll-Scrubbed Progress|ScrollTrigger
staggered-grid-reveal|Staggered Grid Reveal|ScrollTrigger
scroll-velocity-skew|Scroll Velocity Skew|ScrollTrigger
layered-zoom|Layered Zoom Scroll|ScrollTrigger
velocity-blur|Velocity Blur|ScrollTrigger
tilt-parallax-card|Tilt Parallax Card|Observer`,
  },
  {
    id: 'cards-components',
    label: 'Cards & Components',
    scope: 'stage',
    duration: 1.2,
    rows: `
card-hover-lift|Card Hover Lift|Core GSAP
card-3d-flip|3D Card Flip|Core GSAP
card-expand-detail|Card Expand to Detail|Flip
stacked-card-fan|Stacked Card Fan|Core GSAP
card-slide-stagger|Card Slide-In Stagger|ScrollTrigger
card-bg-shift|Card Background Shift|Core GSAP
flip-grid-filter|Flip Grid Filter|Flip,ScrollTrigger
shared-element-transition|Shared Element Transition|Flip
accordion-motion|Accordion with Motion|Flip`,
  },
  {
    id: 'image-gallery',
    label: 'Image & Gallery',
    scope: 'selected',
    duration: 1.6,
    rows: `
clip-path-reveal|Clip-Path Image Reveal|ScrollTrigger
image-parallax-zoom|Image Parallax Zoom|ScrollTrigger
before-after-slider|Before/After Slider|Draggable
grayscale-to-color|Grayscale to Color|ScrollTrigger
masonry-cascade|Masonry Cascade|ScrollTrigger
image-tilt-hover|Image Tilt on Hover|Core GSAP
ken-burns-slideshow|Ken Burns Slideshow|Core GSAP`,
  },
  {
    id: 'hover-interactions',
    label: 'Hover & Interactions',
    scope: 'selected',
    duration: 0.8,
    rows: `
magnetic-button|Magnetic Button|Core GSAP
underline-slide|Underline Slide|Core GSAP
hover-border-draw|Hover Border Draw|Core GSAP
ripple-click|Ripple Click|Core GSAP
icon-morph|Icon Morph|MorphSVG
button-shimmer|Button Shimmer|Core GSAP
elastic-stretch|Elastic Stretch Drag|Draggable,CustomBounce
scratch-off|Scratch-Off Reveal|Draggable
card-deck-toss|Card Deck Toss|Draggable,InertiaPlugin
cube-drag-3d|3D Cube Drag|Draggable
wheel-spin|Wheel of Fortune Spin|Draggable,InertiaPlugin`,
  },
  {
    id: 'svg-morphing',
    label: 'SVG & Morphing',
    scope: 'selected',
    duration: 1.5,
    rows: `
svg-line-draw|SVG Line Draw|DrawSVG,ScrollTrigger
shape-morph|Shape Morph|MorphSVG
animated-blob|Animated Blob|MorphSVG
logo-stroke-reveal|Logo Stroke Reveal|DrawSVG
floating-shapes|Floating Geometric Shapes|Core GSAP
liquid-button-morph|Liquid Button Morph|MorphSVG
mood-face-morph|Mood Face Morph|MorphSVG
animal-silhouette|Animal Silhouette Chain|MorphSVG
day-night-scene|Day-to-Night Scene|MorphSVG
gooey-menu|Gooey Menu Hover|MorphSVG`,
  },
  {
    id: 'line-drawing',
    label: 'Line Drawing',
    scope: 'stage',
    duration: 1.8,
    rows: `
blueprint-reveal|Blueprint Reveal|DrawSVG
constellation-connect|Constellation Connect|DrawSVG,ScrollTrigger
signature-draw|Signature Autograph|DrawSVG
circuit-trace|Circuit Board Trace|DrawSVG
animated-infographic|Animated Infographic|DrawSVG,ScrollTrigger`,
  },
  {
    id: 'motion-paths',
    label: 'Motion Paths',
    scope: 'stage',
    duration: 2.4,
    rows: `
satellite-orbit|Satellite Orbit|MotionPath
conveyor-belt|Conveyor Belt|MotionPath
scroll-path-journey|Scroll Path Journey|MotionPath,DrawSVG,ScrollTrigger
dna-helix|DNA Helix|MotionPath
rollercoaster-stats|Rollercoaster Stats|MotionPath,ScrollTrigger`,
  },
  {
    id: 'physics-particles',
    label: 'Physics & Particles',
    scope: 'stage',
    duration: 1.5,
    rows: `
confetti-cannon|Confetti Cannon|Physics2D
gravity-card-drop|Gravity Card Drop|Physics2D,CustomBounce
magnetic-repel|Magnetic Repel Grid|Core GSAP
throw-and-snap|Throw & Snap|Draggable,InertiaPlugin
popcorn-loader|Popcorn Loader|Physics2D
jelly-button|Jelly Button|CustomBounce
notification-shake|Notification Shake|CustomWiggle
wobble-card-enter|Wobble Card Enter|CustomBounce
springboard-menu|Springboard Menu|CustomBounce
newtons-cradle|Newton's Cradle|Core GSAP`,
  },
  {
    id: 'carousels-sliders',
    label: 'Carousels & Sliders',
    scope: 'stage',
    duration: 2.8,
    rows: `
infinite-loop|Infinite Loop Carousel|Core GSAP
coverflow-3d|3D Coverflow Carousel|Core GSAP
draggable-carousel|Draggable Carousel|Draggable,InertiaPlugin
vertical-card-stack|Vertical Card Stack|Draggable
parallax-slider|Parallax Slider|Core GSAP`,
  },
  {
    id: 'loaders-transitions',
    label: 'Loaders & Transitions',
    scope: 'stage',
    duration: 1.4,
    rows: `
staggered-blinds|Staggered Blinds Reveal|Core GSAP
counter-preloader|Counter Preloader|TextPlugin
circle-wipe|Circle Wipe Transition|Core GSAP
skeleton-to-content|Skeleton to Content|Core GSAP
curtain-reveal|Curtain Reveal|Core GSAP`,
  },
  {
    id: 'counters-data',
    label: 'Counters & Data',
    scope: 'selected',
    duration: 1.8,
    rows: `
count-up|Count-Up Numbers|ScrollTrigger
odometer|Odometer Counter|Core GSAP
circular-progress|Circular Progress Ring|DrawSVG,ScrollTrigger
animated-bar-chart|Animated Bar Chart|ScrollTrigger`,
  },
  {
    id: 'backgrounds-atmosphere',
    label: 'Backgrounds & Atmosphere',
    scope: 'background',
    duration: 4,
    rows: `
animated-gradient|Animated Gradient Background|Core GSAP
particle-float|Particle Float Field|Core GSAP
cursor-spotlight|Cursor Spotlight|Core GSAP
aurora-waves|Aurora Borealis Waves|Core GSAP`,
  },
  {
    id: 'showcases',
    label: 'Multi-Plugin Showcases',
    scope: 'stage',
    duration: 3.2,
    rows: `
particle-text|Interactive Particle Text|SplitText,Physics2D
scroll-storyteller|Scroll Storyteller|DrawSVG,MorphSVG,ScrambleText,ScrollTrigger
gravity-form|Gravity Form|Physics2D,CustomBounce
timeline-scroll-experience|Timeline Scroll Experience|DrawSVG,ScrollTrigger,SplitText,Flip`,
  },
]

const SELECTED_SCOPE_OVERRIDES = new Set([
  'card-hover-lift',
  'card-3d-flip',
  'card-expand-detail',
  'card-bg-shift',
  'shared-element-transition',
  'accordion-motion',
  'jelly-button',
  'notification-shake',
  'wobble-card-enter',
  'springboard-menu',
  'count-up',
  'odometer',
  'circular-progress',
])

export const GSAPIFY_EFFECTS: GsapifyEffectDefinition[] = CATEGORY_SOURCES.flatMap(category =>
  category.rows.trim().split('\n').map(row => {
    const [id, label, pluginText] = row.trim().split('|')
    const scope = SELECTED_SCOPE_OVERRIDES.has(id) ? 'selected' : category.scope
    return {
      id,
      label,
      categoryId: category.id,
      category: category.label,
      plugins: pluginText.split(','),
      scope,
      duration: category.duration,
    }
  })
)

export const GSAPIFY_EFFECTS_BY_ID = new Map(
  GSAPIFY_EFFECTS.map(effect => [effect.id, effect])
)

export const GSAPIFY_EFFECT_CATEGORIES = CATEGORY_SOURCES.map(category => ({
  id: category.id,
  label: category.label,
  effects: GSAPIFY_EFFECTS.filter(effect => effect.categoryId === category.id),
}))

if (GSAPIFY_EFFECTS.length !== 100) {
  throw new Error(`GSAPify effect catalog must contain 100 effects, got ${GSAPIFY_EFFECTS.length}`)
}
