export interface FaceMatcherResult {
  similarity: number
  position: { x: number; y: number; width: number; height: number }
  meta: string
  sourceImageUrl: string
}
