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
  // A PDF of the card is a reasonable thing to try, so say what's wrong rather
  // than just "not a photo".
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    throw new Error("PDFs aren't supported yet. Screenshot the scorecard page and use that.")
  }
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
 * `createImageBitmap` handles EXIF rotation and more formats where it exists;
 * the `<img>` path is the fallback for browsers that don't have it.
 */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through — some browsers reject a format here but can still decode
      // it through an <img> tag.
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
      reject(new Error(undecodableMessage(file)))
    }
    img.src = url
  })
}

/**
 * iPhones save photos as HEIC. Handing one to a web page usually converts it
 * to JPEG on the way, but not always — and a browser that can't decode HEIC
 * gives no reason at all, so name the likely cause and the way out.
 */
function undecodableMessage(file: File): string {
  const heic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
  return heic
    ? "That photo is in Apple's HEIC format and this browser can't open it. " +
        'Either take the photo with the button above, or on iPhone set ' +
        'Settings → Camera → Formats to "Most Compatible" and try again.'
    : "That photo couldn't be opened. Try a JPEG or PNG."
}

function close(bitmap: ImageBitmap | HTMLImageElement) {
  if ('close' in bitmap) bitmap.close()
}
