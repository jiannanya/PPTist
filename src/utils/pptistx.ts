import type { SceneTransition, Slide, TurningMode } from '@/types/slides'

export const PPTISTX_FORMAT = 'pptistx'
export const PPTISTX_FORMAT_VERSION = 1
export const DEFAULT_SCENE_DURATION = 2.5

export interface PPTistxPlayback {
  version: 1
  mode: 'scene'
  autoplay: true
  defaultTransition: 'cut'
  defaultSceneDuration: number
}

export interface PPTistxDocumentMeta {
  format?: string
  formatVersion?: number
  playback?: Partial<PPTistxPlayback>
}

const resolveSceneDuration = (slide: Slide, fallback: number) => {
  const authored = Number(slide.scene?.duration ?? slide.motion?.duration)
  return Number.isFinite(authored) && authored > 0 ? authored : fallback
}

const sceneTransitionToTurningMode = (transition?: SceneTransition): TurningMode | undefined => {
  if (!transition) return undefined
  return transition === 'cut' ? 'no' : transition
}

/**
 * Normalize PPTISTX scenes without mutating the editor store:
 * - every scene autoplays and advances when its exact timeline ends;
 * - the final scene holds instead of wrapping;
 * - a missing or random page transition becomes a hard cut;
 * - slides without authored motion receive a deterministic hold timeline.
 */
export const normalizePptistxSlides = (
  slides: Slide[],
  defaultSceneDuration = DEFAULT_SCENE_DURATION
) => {
  const fallback = Number.isFinite(defaultSceneDuration) && defaultSceneDuration > 0
    ? defaultSceneDuration
    : DEFAULT_SCENE_DURATION
  const lastIndex = slides.length - 1

  return slides.map((slide, index) => {
    const duration = resolveSceneDuration(slide, fallback)
    const sceneTurningMode = sceneTransitionToTurningMode(slide.scene?.transitionOut)
    const turningMode = sceneTurningMode || 'no'

    return {
      ...slide,
      turningMode,
      motion: {
        version: 1 as const,
        ...(slide.motion || {}),
        autoplay: true,
        autoAdvance: index < lastIndex,
        duration,
        steps: slide.motion?.steps || [],
      },
    }
  })
}

export const createPptistxPlayback = (
  defaultSceneDuration = DEFAULT_SCENE_DURATION
): PPTistxPlayback => ({
  version: 1,
  mode: 'scene',
  autoplay: true,
  defaultTransition: 'cut',
  defaultSceneDuration,
})

export const isPptistxDocument = (fileName: string, document: PPTistxDocumentMeta) => (
  fileName.toLowerCase().endsWith('.pptistx') ||
  document.format === PPTISTX_FORMAT
)
