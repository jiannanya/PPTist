import { onUnmounted, ref, watch, type Ref } from 'vue'

const dataUriToBlobUrl = (src: string) => {
  const match = src.match(/^data:([^;,]+)?((?:;[^,]*)?),(.*)$/s)
  if (!match) return null

  const mimeType = match[1] || 'application/octet-stream'
  const metadata = match[2] || ''
  const payload = match[3] || ''

  try {
    if (/;base64/i.test(metadata)) {
      const binary = window.atob(payload.replace(/\s/g, ''))
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
    }

    const decoded = decodeURIComponent(payload)
    return URL.createObjectURL(new Blob([decoded], { type: mimeType }))
  }
  catch {
    return null
  }
}

/**
 * Chromium can occasionally reject a data-URI image when many baked SVG
 * sequence frames are created at once. Retrying the same bytes through a Blob
 * URL avoids the data-URI loader path while keeping the presentation fully
 * self-contained.
 */
export default (source: Readonly<Ref<string>>) => {
  const resolvedSrc = ref(source.value)
  let objectUrl = ''
  let fallbackAttempted = false

  const releaseObjectUrl = () => {
    if (!objectUrl) return
    URL.revokeObjectURL(objectUrl)
    objectUrl = ''
  }

  watch(source, value => {
    releaseObjectUrl()
    fallbackAttempted = false
    resolvedSrc.value = value
  }, { immediate: true })

  const handleImageError = () => {
    if (fallbackAttempted || resolvedSrc.value !== source.value) return
    fallbackAttempted = true
    const fallbackUrl = dataUriToBlobUrl(source.value)
    if (!fallbackUrl) return
    objectUrl = fallbackUrl
    resolvedSrc.value = fallbackUrl
  }

  onUnmounted(releaseObjectUrl)

  return {
    resolvedSrc,
    handleImageError,
  }
}
