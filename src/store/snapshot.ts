import { defineStore } from 'pinia'
import type { IndexableTypeArray } from 'dexie'
import {
  db,
  type Snapshot,
  type SnapshotMetadata,
  type SnapshotSource,
} from '@/utils/database'

import { useSlidesStore } from './slides'
import { useMainStore } from './main'

export interface SnapshotHistoryEntry extends SnapshotMetadata {
  id: number
  cursor: number
}

export interface SnapshotState {
  snapshotCursor: number
  snapshotLength: number
  historyEntries: SnapshotHistoryEntry[]
}

export interface AddSnapshotOptions {
  label?: string
  source?: SnapshotSource
  slideId?: string
}

const DEFAULT_METADATA: SnapshotMetadata = {
  label: '编辑演示文稿',
  source: 'editor',
  timestamp: 0,
}

let snapshotOperationQueue = Promise.resolve()
const queueSnapshotOperation = <T>(operation: () => Promise<T>) => {
  const result = snapshotOperationQueue.then(operation, operation)
  snapshotOperationQueue = result.then(() => undefined, () => undefined)
  return result
}

const metadataFor = (snapshot: Snapshot, cursor: number): SnapshotHistoryEntry => ({
  id: snapshot.id,
  cursor,
  label: snapshot.metadata?.label || DEFAULT_METADATA.label,
  source: snapshot.metadata?.source || DEFAULT_METADATA.source,
  timestamp: snapshot.metadata?.timestamp || 0,
  slideId: snapshot.metadata?.slideId,
})

export const useSnapshotStore = defineStore('snapshot', {
  state: (): SnapshotState => ({
    snapshotCursor: -1,
    snapshotLength: 0,
    historyEntries: [],
  }),

  getters: {
    canUndo(state) {
      return state.snapshotCursor > 0
    },
    canRedo(state) {
      return state.snapshotCursor < state.snapshotLength - 1
    },
    undoLabel(state) {
      return state.snapshotCursor > 0
        ? state.historyEntries[state.snapshotCursor]?.label || ''
        : ''
    },
    redoLabel(state) {
      return state.snapshotCursor < state.snapshotLength - 1
        ? state.historyEntries[state.snapshotCursor + 1]?.label || ''
        : ''
    },
  },

  actions: {
    setSnapshotCursor(cursor: number) {
      this.snapshotCursor = cursor
    },
    setSnapshotLength(length: number) {
      this.snapshotLength = length
    },
    setHistoryEntries(entries: SnapshotHistoryEntry[]) {
      this.historyEntries = entries
    },

    async refreshHistoryEntries() {
      const snapshots: Snapshot[] = await db.snapshots.orderBy('id').toArray()
      this.setHistoryEntries(snapshots.map(metadataFor))
      this.setSnapshotLength(snapshots.length)
    },

    initSnapshotDatabase() {
      const slidesStore = useSlidesStore()
      const newFirstSnapshot = {
        index: slidesStore.slideIndex,
        slides: JSON.parse(JSON.stringify(slidesStore.slides)),
        metadata: {
          label: '初始状态',
          source: 'system' as const,
          timestamp: Date.now(),
          slideId: slidesStore.currentSlide?.id,
        },
      }
      return queueSnapshotOperation(async () => {
        await db.snapshots.add(newFirstSnapshot)
        await this.refreshHistoryEntries()
        this.setSnapshotCursor(0)
      })
    },

    addSnapshot(options: AddSnapshotOptions = {}) {
      const slidesStore = useSlidesStore()
      // Capture synchronously, before the IndexedDB queue yields. This keeps
      // rapid consecutive motion edits as distinct, ordered history states.
      const capturedSnapshot: Omit<Snapshot, 'id'> = {
        index: slidesStore.slideIndex,
        slides: JSON.parse(JSON.stringify(slidesStore.slides)),
        metadata: {
          label: options.label || DEFAULT_METADATA.label,
          source: options.source || DEFAULT_METADATA.source,
          timestamp: Date.now(),
          slideId: options.slideId || slidesStore.currentSlide?.id,
        },
      }

      return queueSnapshotOperation(async () => {
        const allKeys = await db.snapshots.orderBy('id').keys()
        let needDeleteKeys: IndexableTypeArray = []

        // Creating a new branch after undo invalidates all redo records.
        if (this.snapshotCursor >= 0 && this.snapshotCursor < allKeys.length - 1) {
          needDeleteKeys = allKeys.slice(this.snapshotCursor + 1)
        }

        await db.snapshots.add(capturedSnapshot as Snapshot)

        let snapshotLength = allKeys.length - needDeleteKeys.length + 1

        // Full-deck snapshots are intentionally bounded. Every motion operation
        // still receives its own record inside this rolling history window.
        const snapshotLengthLimit = 30
        if (snapshotLength > snapshotLengthLimit) {
          needDeleteKeys.push(allKeys[0])
          snapshotLength--
        }

        if (snapshotLength >= 2) {
          const previousSnapshotKey = allKeys[allKeys.length - needDeleteKeys.length - 1]
          if (previousSnapshotKey !== undefined) {
            await db.snapshots.update(previousSnapshotKey as number, { index: capturedSnapshot.index })
          }
        }

        await db.snapshots.bulkDelete(needDeleteKeys as number[])
        await this.refreshHistoryEntries()
        this.setSnapshotCursor(this.snapshotLength - 1)
      })
    },

    async restoreSnapshot(cursor: number) {
      if (cursor < 0 || cursor >= this.snapshotLength) return

      const slidesStore = useSlidesStore()
      const mainStore = useMainStore()
      const snapshots: Snapshot[] = await db.snapshots.orderBy('id').toArray()
      const snapshot = snapshots[cursor]
      if (!snapshot) return

      const slideIndex = snapshot.index > snapshot.slides.length - 1
        ? snapshot.slides.length - 1
        : snapshot.index

      slidesStore.setSlides(snapshot.slides)
      slidesStore.updateSlideIndex(slideIndex)
      this.setSnapshotCursor(cursor)
      mainStore.setActiveElementIdList([])
    },

    unDo() {
      return queueSnapshotOperation(async () => {
        if (!this.canUndo) return
        await this.restoreSnapshot(this.snapshotCursor - 1)
      })
    },

    reDo() {
      return queueSnapshotOperation(async () => {
        if (!this.canRedo) return
        await this.restoreSnapshot(this.snapshotCursor + 1)
      })
    },

    jumpToSnapshot(cursor: number) {
      return queueSnapshotOperation(async () => {
        if (cursor === this.snapshotCursor) return
        await this.restoreSnapshot(cursor)
      })
    },
  },
})
