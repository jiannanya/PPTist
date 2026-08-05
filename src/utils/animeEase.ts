/**
 * anime.js easing bridge for the GSAP slide-motion engine.
 *
 * The cinematic motion player is GSAP-driven, but GSAP accepts a *function* ease
 * (`(progress: number) => number`) anywhere it accepts an ease string. anime.js
 * (v4) exposes exactly this shape for every one of its curves, so its rich,
 * silky-smooth easing catalog can drive GSAP tweens — most importantly the
 * `$stage` camera track — without leaving the GSAP timeline.
 *
 * Serialized `.pptistx`/`.pptist` motion data stays pure data: an ease is written as a
 * short string token such as `"anime:inOutSine"`, `"anime:outBack(1.7)"`, or
 * `"anime:spring(0.3, 700)"`. This module parses that token (name + numeric
 * args only — never executable JS) and returns the corresponding anime.js
 * `EasingFunction`. Any ease value that is not an `anime:`/`animejs:` token is
 * returned untouched, so native GSAP ease strings (`"power3.out"`, `"none"`,
 * `"back.out(2)"`, …) keep working exactly as before.
 *
 * Token grammar:
 *   anime:<name>                fixed curve, e.g. anime:inOutSine, anime:outExpo
 *   anime:<name>(a, b, …)       parametric curve with numeric args:
 *       anime:outBack(1.7)              back overshoot
 *       anime:outElastic(1, 0.3)       elastic amplitude / period
 *       anime:inOut(3)                 power ease with exponent
 *       anime:cubicBezier(.7,.1,.5,.9) custom bézier
 *       anime:spring(0.35, 650)        spring by feel  (bounce, duration-ms)
 *       anime:spring(90, 14, 1, 0)     spring by physics (stiffness, damping, mass, velocity)
 *       anime:steps(6)                 stepped
 *       anime:linear(0, .25, 1)        multi-point linear
 *       anime:irregular(12, 0.8)       irregular
 */
import { cubicBezier, eases, irregular, linear, spring, steps } from 'animejs'

export type EaseFunction = (progress: number) => number

const ANIME_EASE_PREFIX = /^anime(?:js)?:/i

const easeCache = new Map<string, EaseFunction | null>()

interface ParsedEaseSpec {
  name: string
  args: number[]
}

const parseEaseSpec = (spec: string): ParsedEaseSpec | null => {
  const match = /^([a-zA-Z][a-zA-Z0-9]*)\s*(?:\(([^()]*)\))?$/.exec(spec.trim())
  if (!match) return null
  const args = match[2]
    ? match[2]
      .split(',')
      .map(part => Number.parseFloat(part.trim()))
      .filter(value => Number.isFinite(value))
    : []
  return { name: match[1], args }
}

/**
 * Resolve a curve from the `eases` catalog. Fixed-power families
 * (`inQuad`, `inOutSine`, …) are already `(t) => value`; the bare power
 * (`in`/`out`/`inOut`/`outIn`), `Back`, and `Elastic` families are factories
 * that must be invoked to yield the curve. A single probe call distinguishes
 * the two without hard-coding every name.
 */
const resolveFromEases = (name: string, args: number[]): EaseFunction | undefined => {
  const candidate = (eases as Record<string, unknown>)[name]
  if (typeof candidate !== 'function') return undefined
  const fn = candidate as (...values: number[]) => unknown
  const probe = fn(0)
  if (typeof probe === 'function') {
    // Parametric family: invoke with the supplied args (or its own defaults).
    return (args.length ? fn(...args) : (fn as () => EaseFunction)()) as EaseFunction
  }
  // Fixed curve already shaped as (t) => value; extra args are meaningless here.
  return candidate as EaseFunction
}

const buildAnimeEase = (spec: string): EaseFunction | undefined => {
  const parsed = parseEaseSpec(spec)
  if (!parsed) return undefined
  const { name, args } = parsed

  try {
    switch (name) {
      case 'cubicBezier':
        return cubicBezier(args[0] ?? 0.25, args[1] ?? 0.1, args[2] ?? 0.25, args[3] ?? 1) as EaseFunction
      case 'spring': {
        const params = args.length >= 3
          ? { stiffness: args[0], damping: args[1], mass: args[2], velocity: args[3] ?? 0 }
          : { bounce: args[0] ?? 0.2, duration: args[1] ?? 600 }
        return spring(params).ease as EaseFunction
      }
      case 'steps':
        return steps(args[0] ?? 10, Boolean(args[1])) as EaseFunction
      case 'irregular':
        return irregular(args[0] ?? 10, args[1] ?? 1) as EaseFunction
      case 'linear':
        // Multi-point linear factory; with no args fall back to the identity curve.
        return args.length ? (linear(...args) as EaseFunction) : (eases.linear as EaseFunction)
      default:
        return resolveFromEases(name, args)
    }
  }
  catch {
    return undefined
  }
}

/** True when `value` is an `anime:`/`animejs:`-prefixed ease token. */
export const isAnimeEaseToken = (value: unknown): value is string =>
  typeof value === 'string' && ANIME_EASE_PREFIX.test(value)

/**
 * Resolve an `anime:`-prefixed token into an anime.js `EasingFunction`.
 * Results are memoised (spring solving is not free). Returns `undefined` when
 * the token cannot be resolved.
 */
export const resolveAnimeEase = (value: string): EaseFunction | undefined => {
  const spec = value.replace(ANIME_EASE_PREFIX, '').trim()
  if (!spec) return undefined
  if (easeCache.has(spec)) return easeCache.get(spec) ?? undefined
  const fn = buildAnimeEase(spec)
  easeCache.set(spec, fn ?? null)
  return fn
}

/**
 * Normalise any serialized ease value for GSAP consumption.
 * - `anime:` tokens become anime.js easing functions (used as GSAP function eases);
 *   an unresolvable token becomes `undefined` so GSAP falls back to its default
 *   rather than choking on an unknown string.
 * - every other value (GSAP ease strings, existing functions) passes through.
 */
export const resolveMotionEase = (value: unknown): string | EaseFunction | undefined => {
  if (isAnimeEaseToken(value)) return resolveAnimeEase(value)
  return value as string | EaseFunction | undefined
}
