import { onMounted, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { PPTEmbedElement } from '@/types/slides'
import { renderEmbed, type EmbedRenderHandle } from './registry'

/**
 * Live-render an embed element into `liveRef` via the trusted registry, keeping it
 * in sync with spec/size changes. Shared by the editor (index.vue) and the
 * screen/thumbnail renderer (BaseEmbedElement.vue).
 *
 * `liveActive` is true once a live renderer has mounted; callers hide the poster
 * then to avoid double-painting. When it stays false (thumbnail, no renderer for
 * the kind, or a render error) the poster remains visible — the export/blank-proof
 * fallback.
 *
 * `enabled()` lets a caller opt out of live rendering (e.g. thumbnails, which show
 * the faithful poster and skip spinning up an ECharts instance per tile).
 */
export default function useEmbedRender(
  elementInfo: Ref<PPTEmbedElement>,
  liveRef: Ref<HTMLElement | null>,
  options: { enabled?: () => boolean } = {},
) {
  const liveActive = ref(false)
  let handle: EmbedRenderHandle | null = null

  const destroy = () => {
    if (handle) {
      handle.destroy()
      handle = null
    }
    liveActive.value = false
  }

  const mount = () => {
    destroy()
    if (options.enabled && !options.enabled()) return
    if (!liveRef.value) return
    handle = renderEmbed(elementInfo.value, liveRef.value, {
      width: elementInfo.value.width,
      height: elementInfo.value.height,
    })
    liveActive.value = !!handle
  }

  onMounted(mount)
  onBeforeUnmount(destroy)

  watch(() => elementInfo.value.vizKind, mount)
  watch(() => elementInfo.value.spec, mount, { deep: true })
  watch(() => [elementInfo.value.width, elementInfo.value.height], () => {
    if (handle && handle.resize) handle.resize(elementInfo.value.width, elementInfo.value.height)
    else mount()
  })

  return { liveActive }
}
