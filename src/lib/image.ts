/**
 * Prepare a photo for the scorecard reader.
 *
 * A phone camera produces 4000px, 5MB files. That's larger than a serverless
 * request body allows, slower to upload on course wifi, and more image detail
 * than the read needs — so the browser shrinks it before it goes anywhere.
 *
 * The size below is a deliberate balance. Scorecard print is small, and
 * downscaling too far turns a "4" into a "1"; but every pixel is billed, so
 * there's no point sending more than can be read. 2000px on the long edge
 * keeps an 18-column grid legible while landing around a few hundred KB.
 */

const MAX_EDGE = 2000
const JPEG_QUALITY = 0.85

export interface PreparedImage {
  /** Base64 with no data-URL prefix — what the API expects. */
  data: string
  mediaType: 'image/jpeg'
  /** For showing the organiser what they're about to send. */
  previewUrl: string
  bytes: number
}

export async function prepareScorecardPhoto(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not a photo. Take or choose a picture of the scorecard.')
  }

  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error("This browser wouldn't let the app resize the photo.")
  // Photos of paper are all fine detail; the smoothing default would blur the
  // digits we're trying to keep.
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  close(bitmap)

  // Always re-encode as JPEG: HEIC off an iPhone isn't a format the API takes,
  // and the canvas round-trip normalises everything to something that is.
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  const data = dataUrl.slice(dataUrl.indexOf(',') + 1)

  return { data, mediaType: 'image/jpeg', previewUrl: dataUrl, bytes: data.length }
}

/**
 * `createImageBitmap` handles HEIC and EXIF rotation where it exists; the
 * `<img>` path is the fallback for browsers that don't have it.
 */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through — some browsers reject HEIC here but can still decode it
      // through an <img> tag.
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("That photo couldn't be opened. Try a JPEG or PNG."))
    }
    img.src = url
  })
}

function close(bitmap: ImageBitmap | HTMLImageElement) {
  if ('close' in bitmap) bitmap.close()
}
