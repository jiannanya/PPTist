<template>
  <div class="pptist-editor">
    <EditorHeader class="layout-header" />
    <div class="layout-content">
      <Thumbnails class="layout-content-left" />
      <div class="layout-content-center" :class="{ wide: editorMode !== 'static' }">
        <div class="editor-mode-bar">
          <div class="mode-switch">
            <button :class="{ active: editorMode === 'static' }" @click="editorMode = 'static'">
              <span class="mode-icon">▣</span>
              静态设计
            </button>
            <button :class="{ active: editorMode === 'motion' }" @click="editorMode = 'motion'">
              <span class="mode-icon">◆</span>
              动效时间轴
            </button>
            <button :class="{ active: editorMode === 'clip' }" @click="editorMode = 'clip'">
              <span class="mode-icon">▶</span>
              视频剪辑
            </button>
          </div>
          <div class="mode-hint">
            {{ modeHint }}
          </div>
        </div>

        <template v-if="editorMode === 'static'">
          <CanvasTool class="center-top" />
          <Canvas class="center-body" :style="{ height: `calc(100% - ${remarkHeight + 80}px)` }" />
          <Remark
            class="center-bottom"
            v-model:height="remarkHeight"
            :style="{ height: `${remarkHeight}px` }"
          />
        </template>
        <MotionEditor v-else-if="editorMode === 'motion'" class="motion-editor-view" />
        <ClipVideoEditor v-else class="clip-editor-view" />
      </div>
      <Toolbar v-if="editorMode === 'static'" class="layout-content-right" />
    </div>
  </div>

  <SelectPanel v-if="showSelectPanel" />
  <SearchPanel v-if="showSearchPanel" />
  <NotesPanel v-if="showNotesPanel" />
  <MarkupPanel v-if="showMarkupPanel" />
  <SymbolPanel v-if="showSymbolPanel" />
  <ImageLibPanel v-if="showImageLibPanel" />
  <ChartDataEditorDialog />
  <LatexEditorDialog />

  <Modal
    :visible="!!dialogForExport" 
    :width="680"
    @closed="closeExportDialog()"
  >
    <ExportDialog />
  </Modal>

  <Modal
    :visible="!!showAIPPTDialog" 
    :width="720"
    :closeOnClickMask="false"
    :closeOnEsc="false"
    closeButton
    :wrapStyle="{ opacity: showAIPPTDialog === 'running' ? 0 : 1 }"
    @closed="closeAIPPTDialog()"
  >
    <AIPPTDialog />
  </Modal>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import useGlobalHotkey from '@/hooks/useGlobalHotkey'
import usePasteEvent from '@/hooks/usePasteEvent'

import EditorHeader from './EditorHeader/index.vue'
import Canvas from './Canvas/index.vue'
import CanvasTool from './CanvasTool/index.vue'
import Thumbnails from './Thumbnails/index.vue'
import Toolbar from './Toolbar/index.vue'
import Remark from './Remark/index.vue'
import MotionEditor from './MotionEditor/index.vue'
import ClipVideoEditor from './ClipVideoEditor/index.vue'
import ChartDataEditorDialog from './ChartDataEditorDialog.vue'
import LatexEditorDialog from './LatexEditorDialog.vue'
import ExportDialog from './ExportDialog/index.vue'
import SelectPanel from './SelectPanel.vue'
import SearchPanel from './SearchPanel.vue'
import NotesPanel from './NotesPanel.vue'
import SymbolPanel from './SymbolPanel.vue'
import MarkupPanel from './MarkupPanel.vue'
import ImageLibPanel from './ImageLibPanel.vue'
import AIPPTDialog from './AIPPTDialog.vue'
import Modal from '@/components/Modal.vue'

const mainStore = useMainStore()
const {
  dialogForExport,
  showSelectPanel,
  showSearchPanel,
  showNotesPanel,
  showSymbolPanel,
  showMarkupPanel,
  showImageLibPanel,
  showAIPPTDialog,
} = storeToRefs(mainStore)

const closeExportDialog = () => mainStore.setDialogForExport('')
const closeAIPPTDialog = () => mainStore.setAIPPTDialogState(false)

const remarkHeight = ref(40)
const editorMode = ref<'static' | 'motion' | 'clip'>('static')
const modeHint = computed(() => {
  if (editorMode.value === 'static') return '编辑幻灯片画面与内容'
  if (editorMode.value === 'motion') return '每页即分镜 · 轨道与帧驱动 GSAP 动效'
  return 'Clip-JS 时间线 · 自动组片、手动剪辑与浏览器本地渲染'
})

useGlobalHotkey()
usePasteEvent()
</script>

<style lang="scss" scoped>
.pptist-editor {
  height: 100%;
}
.layout-header {
  height: 40px;
}
.layout-content {
  height: calc(100% - 40px);
  display: flex;
}
.layout-content-left {
  width: 160px;
  height: 100%;
  flex-shrink: 0;
}
.layout-content-center {
  width: calc(100% - 160px - 260px);

  .center-top {
    height: 40px;
  }

  &.wide {
    width: calc(100% - 160px);
  }
}
.layout-content-right {
  width: 260px;
  height: 100%;
}
.editor-mode-bar {
  height: 40px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid $borderColor;
  background: #fff;
  user-select: none;
}
.mode-switch {
  height: 30px;
  padding: 3px;
  display: flex;
  align-items: center;
  border-radius: 7px;
  background: #f1f1f5;

  button {
    height: 24px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 0;
    border-radius: 5px;
    color: #666;
    background: transparent;
    font-size: 12px;
    cursor: pointer;

    &.active {
      color: #fff;
      background: #6d4aff;
      box-shadow: 0 2px 6px rgba(109, 74, 255, .25);
    }
  }
}
.mode-icon {
  font-size: 10px;
}
.mode-hint {
  color: #999;
  font-size: 11px;
}
.motion-editor-view {
  height: calc(100% - 40px);
}
.clip-editor-view {
  height: calc(100% - 40px);
}
</style>
