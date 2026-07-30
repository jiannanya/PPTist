<template>
  <div class="editable-element-embed"
    :class="{ 'lock': elementInfo.lock }"
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
        v-contextmenu="contextmenus"
        @mousedown="$event => handleSelectElement($event)"
        @touchstart="$event => handleSelectElement($event)"
      >
        <ElementOutline
          :width="elementInfo.width"
          :height="elementInfo.height"
          :outline="elementInfo.outline"
        />
        <img
          v-if="elementInfo.poster"
          class="embed-poster"
          :class="{ hidden: liveActive }"
          :src="elementInfo.poster"
          :draggable="false"
          alt=""
        />
        <div class="embed-live" ref="liveRef"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { PPTEmbedElement } from '@/types/slides'
import type { ContextmenuItem } from '@/components/Contextmenu/types'

import ElementOutline from '@/views/components/element/ElementOutline.vue'
import useEmbedRender from './useEmbedRender'

const props = defineProps<{
  elementInfo: PPTEmbedElement
  selectElement: (e: MouseEvent | TouchEvent, element: PPTEmbedElement, canMove?: boolean) => void
  contextmenus: () => ContextmenuItem[] | null
}>()

const liveRef = ref<HTMLElement | null>(null)
const elementInfo = computed(() => props.elementInfo)
const { liveActive } = useEmbedRender(elementInfo, liveRef)

const handleSelectElement = (e: MouseEvent | TouchEvent) => {
  if (props.elementInfo.lock) return
  e.stopPropagation()

  props.selectElement(e, props.elementInfo)
}
</script>

<style lang="scss" scoped>
.editable-element-embed {
  position: absolute;

  &.lock .element-content {
    cursor: default;
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
  cursor: move;
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
