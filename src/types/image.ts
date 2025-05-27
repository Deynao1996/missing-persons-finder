export interface ExtractedImage {
  src: string
  width: number
  height: number
  alt: string
}

export interface ExtractedImage {
  src: string
  width: number
  height: number
  alt: string
}

interface BatchedImageMeta {
  msgId: number
  faceIndex: number
  msgDate: Date
  sourceImageUrl: string
}

export interface BatchedImage {
  imageBuffer: Buffer
  meta: BatchedImageMeta
  descriptor: number[]
}
