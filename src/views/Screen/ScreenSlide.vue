<template>
  <div 
    class="screen-slide"
    ref="slideRef"
    :style="{
      width: viewportSize + 'px',
      height: viewportSize * viewportRatio + 'px',
      transform: `scale(${scale})`,
    }"
  >
    <div class="motion-layer">
      <div class="background" :style="{ ...backgroundStyle }"></div>
      <ScreenElement
        v-for="(element, index) in slide.elements"
        :key="element.id"
        :elementInfo="element"
        :elementIndex="index + 1"
        :animationIndex="animationIndex"
        :turnSlideToId="turnSlideToId"
        :manualExitFullscreen="manualExitFullscreen"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, provide, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import type { Slide } from '@/types/slides'
import { injectKeySlideId } from '@/types/injectKey'
import useSlideBackgroundStyle from '@/hooks/useSlideBackgroundStyle'
import useGsapSlideMotion from './hooks/useGsapSlideMotion'

import ScreenElement from './ScreenElement.vue'

const props = defineProps<{
  slide: Slide
  active: boolean
  scale: number
  animationIndex: number
  turnSlideToId: (id: string) => void
  manualExitFullscreen: () => void
}>()

const { viewportRatio, viewportSize } = storeToRefs(useSlidesStore())

const background = computed(() => props.slide.background)
const { backgroundStyle } = useSlideBackgroundStyle(background)

const slideId = computed(() => props.slide.id)
provide(injectKeySlideId, slideId)

const slideRef = useTemplateRef<HTMLElement>('slideRef')
const motion = computed(() => props.slide.motion)
const active = computed(() => props.active)
useGsapSlideMotion(slideRef, motion, active)
</script>

<style lang="scss" scoped>
.screen-slide {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  overflow: hidden;
}
.motion-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
}
.background {
  width: 100%;
  height: 100%;
  background-position: center;
  position: absolute;
}
</style>
