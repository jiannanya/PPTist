import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import { SLIDE_ANIMATIONS } from '@/configs/animation'

export default () => {
  const { slides } = storeToRefs(useSlidesStore())

  const slidesWithTurningMode = computed(() => {
    return slides.value.map(slide => {
      let turningMode = slide.turningMode
      if (!turningMode) turningMode = slide.scene ? 'no' : 'slideY'
      if (turningMode === 'random') {
        if (slide.scene) turningMode = 'no'
        else {
          const turningModeKeys = SLIDE_ANIMATIONS.filter(item => !['random', 'no'].includes(item.value)).map(item => item.value)
          turningMode = turningModeKeys[Math.floor(Math.random() * turningModeKeys.length)]
        }
      }
      return {
        ...slide,
        turningMode,
      }
    })
  })

  return {
    slidesWithTurningMode,
  }
}
