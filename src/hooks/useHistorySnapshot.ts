import { debounce, throttle } from 'lodash'
import { useSnapshotStore } from '@/store'
import type { AddSnapshotOptions } from '@/store/snapshot'

export default () => {
  const snapshotStore = useSnapshotStore()

  // Most static editor changes are debounced to avoid a snapshot for every
  // pointer/input event. Callers may pass metadata for the visible history.
  const addHistorySnapshot = debounce((options?: AddSnapshotOptions) => {
    return snapshotStore.addSnapshot(options)
  }, 300, { trailing: true })

  // Motion-editor operations are already transactional (one preset click, one
  // drag end, one property commit), so they must be recorded immediately.
  const addHistorySnapshotNow = async (options?: AddSnapshotOptions) => {
    const pendingSnapshot = addHistorySnapshot.flush()
    if (pendingSnapshot) await pendingSnapshot
    return snapshotStore.addSnapshot(options)
  }

  const redo = throttle(async () => {
    await addHistorySnapshot.flush()
    await snapshotStore.reDo()
  }, 100, { leading: true, trailing: false })

  const undo = throttle(async () => {
    await addHistorySnapshot.flush()
    await snapshotStore.unDo()
  }, 100, { leading: true, trailing: false })

  return {
    addHistorySnapshot,
    addHistorySnapshotNow,
    redo,
    undo,
  }
}
