export async function scan (scanQRCode: (data: Uint8ClampedArray) => Promise<unknown>) {
  const backCamera = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false
  })

  const video = document.createElement('video')
  video.srcObject = backCamera
  await video.play()

  const encoder = new TextEncoder()

  // try all until we get a valid QR code, then stop
  for (const barcode of await new BarcodeDetector({ formats: ['qr_code'] }).detect(video)) {
    try {
      // TODO: this likely doesn't work as converting binary barcode data to a string and back is lossy, but the underlying data MIGHT be a string?
      await scanQRCode(new Uint8ClampedArray(encoder.encode(barcode.rawValue)))
      for (const track of backCamera.getTracks()) track.stop()
      video.remove()
      return
    } catch (error) {}
  }
}
