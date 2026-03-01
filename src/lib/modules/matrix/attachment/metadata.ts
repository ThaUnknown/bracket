import { MsgType } from 'matrix-js-sdk'
import mime from 'mime/lite'

import type { AudioInfo, FileInfo, ImageInfo, MediaEventContent, VideoInfo } from 'matrix-js-sdk/lib/types'

async function loadWithAbort (target: HTMLMediaElement | HTMLImageElement, eventname: string, ctrl: AbortController, file: File) {
  target.src = URL.createObjectURL(file)
  const isImage = target instanceof HTMLImageElement
  if (!isImage) {
    target.preload = 'metadata'
    target.muted = true
  }
  await Promise.all([
    // our platform might not support loading certain media types, so we should try to load it, but not fail if it doesn't work
    isImage ? target.decode() : target.play(),
    new Promise((resolve, reject) => {
      target.addEventListener(eventname, resolve, { once: true, signal: ctrl.signal })
      target.addEventListener('error', reject, { once: true, signal: ctrl.signal })
      ctrl.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    })
  ])
  URL.revokeObjectURL(target.src)
  if (!isImage) target.pause()
}

const isImageInfo = (type: string, info: FileInfo): info is ImageInfo => type.startsWith('image/')
const isAudioInfo = (type: string, info: FileInfo): info is AudioInfo => type.startsWith('audio/')
const isVideoInfo = (type: string, info: FileInfo): info is VideoInfo => type.startsWith('video/')

// create metadata while the file is uploading
export async function createMediaMetadata (file: File, content: Promise<MediaEventContent>, ctrl: AbortController): Promise<MediaEventContent> {
  const type = (file.type !== 'application/octet-stream' && file.type) || mime.getType(file.name) || 'application/octet-stream'

  const info: MediaEventContent['info'] = {
    mimetype: type,
    size: file.size
  }
  let msgtype: MediaEventContent['msgtype'] = MsgType.File
  try {
    if (isImageInfo(type, info)) {
      msgtype = MsgType.Image
      const img = new Image()
      await loadWithAbort(img, 'load', ctrl, file)

      info.w = img.naturalWidth
      info.h = img.naturalHeight
    } else if (isAudioInfo(type, info)) {
      msgtype = MsgType.Audio
      const audio = document.createElement('audio')
      await loadWithAbort(audio, 'loadedmetadata', ctrl, file)

      info.duration = audio.duration
    } else if (isVideoInfo(type, info)) {
      // TODO: video somehow needs to do thumbnails too...
      msgtype = MsgType.Video
      const video = document.createElement('video')
      await loadWithAbort(video, 'loadeddata', ctrl, file)

      // eh this is rendered size, not anamorphic size
      info.w = video.videoWidth
      info.h = video.videoHeight
      info.duration = video.duration
    }
  } catch (err) {
    // if smth fails to load, we can still send it, just without metadata
    console.warn('Failed to load metadata', err)
  }

  const awaited = await content
  awaited.info = info
  awaited.msgtype = msgtype

  return awaited
}
