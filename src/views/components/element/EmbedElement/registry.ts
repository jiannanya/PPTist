/**
 * Trusted local registry for the live `embed` element.
 *
 * SECURITY: a `.pptistx`/`.pptist` stores ONLY sanitized data (the element's `spec`), never
 * executable JavaScript. This registry is the single place that turns a
 * `vizKind` + data `spec` into DOM, so no code carried by a deck is ever run.
 *
 * DETERMINISM: every renderer here produces INLINE SVG, which the Clip-JS capture
 * loop rasterizes deterministically (unlike live <canvas>/WebGL, which reads back
 * blank). Any vizKind without a renderer returns `null`, and the caller shows the
 * baked `poster` frame instead — so an embed is never blank in export.
 *
 * Only `echarts` (SVG renderer, already bundled) is rendered live today. `rough`,
 * `d3`, `three`, and `excalidraw` embeds fall back to their poster, which is byte-
 * faithful to a live render (same ops/seed/scene) — adding a renderer here is the
 * one-line way to make any of them live later.
 */
import type { PPTEmbedElement } from '@/types/slides'
import * as echarts from 'echarts'

export interface EmbedRenderHandle {
  destroy: () => void
  resize?: (width: number, height: number) => void
}

type Renderer = (
  spec: { [key: string]: any },
  mount: HTMLElement,
  ctx: { width: number; height: number },
) => EmbedRenderHandle | null

const renderers: { [vizKind: string]: Renderer } = {
  echarts(spec, mount, { width, height }) {
    const option = spec && spec.option
    if (!option) return null
    const chart = echarts.init(mount, null, { renderer: 'svg', width, height })
    // Animate the chart's INTERNAL parts on mount (bars rise, line draws on, pie sweeps)
    // for a lively editor/presentation preview. This is a presentation-time flourish:
    // Clip-JS export rasterizes a paused timeline, so it falls back to the static baked
    // `poster` (a completed chart — never blank). For internal animation that must appear
    // IN THE EXPORTED VIDEO, author the chart with echartsSvgFrames() + sequence() instead.
    // Set spec.liveAnimation === false to force a static live frame (poster parity).
    const animate = spec.liveAnimation !== false
    chart.setOption({
      ...option,
      animation: animate,
      animationDuration: 850,
      animationDurationUpdate: 500,
      animationEasing: 'cubicOut',
    })
    return {
      destroy: () => chart.dispose(),
      resize: (w, h) => chart.resize({ width: w, height: h }),
    }
  },
}

/** Whether an embed of this kind can be rendered live (vs. poster-only). */
export const canRenderLive = (vizKind: string) => vizKind in renderers

/**
 * Render an embed into `mount`. Returns a handle to destroy/resize it, or `null`
 * when the kind has no live renderer or rendering throws — the caller then relies
 * on the poster image.
 */
export const renderEmbed = (
  el: Pick<PPTEmbedElement, 'vizKind' | 'spec'>,
  mount: HTMLElement,
  ctx: { width: number; height: number },
): EmbedRenderHandle | null => {
  const renderer = renderers[el.vizKind]
  if (!renderer) return null
  try {
    return renderer(el.spec || {}, mount, ctx)
  }
  catch (err) {
    console.warn('[embed] live render failed for vizKind:', el.vizKind, err)
    return null
  }
}
