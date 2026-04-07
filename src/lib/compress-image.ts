interface CompressedImage {
  mediaType: 'image/jpeg'
  base64Data: string
  dataUrl: string
}

export function compressImage(
  file: File,
  maxPx: number,
  quality: number
): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let w = img.width
        let h = img.height
        if (w > maxPx || h > maxPx) {
          if (w >= h) { h = Math.round((h * maxPx) / w); w = maxPx }
          else        { w = Math.round((w * maxPx) / h); h = maxPx }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        const dataUrl    = canvas.toDataURL('image/jpeg', quality)
        const base64Data = dataUrl.split(',')[1]
        resolve({ mediaType: 'image/jpeg', base64Data, dataUrl })
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}
