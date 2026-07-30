<template>
  <div class="base-element-embed"
    :class="{ 'is-thumbnail': target === 'thumbnail' }"
    :style="{
      top: elementInfo.top + 'px',
      left: elementInfo.left + 'px',
      width: elementInfo.width + 'px',
      height: elementInfo.height + 'px',
    }"
  >
    <div
      class="rotate-wrapper"
      :style="{ transform: `rotate(${elementInfo.rotate}deg)` }"
    >
      <div
        class="element-content"
        :style="{ backgroundColor: elementInfo.fill }"
      >
        <ElementOutline
          :width="elementInfo.width"
          :height="elementInfo.height"
          :outline="elementInfo.outline"
        />
        <!-- Poster: baked fallback frame. Always in the DOM → never blank in
             thumbnails, for kinds with no live renderer, or if the live render
             fails / isn't ready when Clip-JS rasterizes the frame. -->
        <img
          v-if="elementInfo.poster"
          class="embed-poster"
          :class="{ hidden: liveActive }"
          :src="elementInfo.poster"
          :draggable="false"
          alt=""
        />
        <!-- Live layer: inline SVG from the trusted registry (skipped in
             thumbnails, where the poster is faithful and cheap). -->
        <div class="embed-live" ref="liveRef"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { PPTEmbedElement } from '@/types/slides'

import ElementOutline from '@/views/components/element/ElementOutline.vue'
import useEmbedRender from './useEmbedRender'

const props = defineProps<{
  elementInfo: PPTEmbedElement
  target?: string
  active?: boolean
}>()

const liveRef = ref<HTMLElement | null>(null)
const elementInfo = computed(() => props.elementInfo)
const { liveActive } = useEmbedRender(elementInfo, liveRef, {
  enabled: () => props.target !== 'thumbnail' && props.active !== false,
})
</script>

<style lang="scss" scoped>
.base-element-embed {
  position: absolute;

  &.is-thumbnail {
    pointer-events: none;
  }
}
.rotate-wrapper {
  width: 100%;
  height: 100%;
}
.element-content {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.embed-poster,
.embed-live {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.embed-poster {
  object-fit: contain;

  &.hidden {
    opacity: 0;
  }
}
.embed-live :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
