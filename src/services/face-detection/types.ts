export interface FaceMatcherResult {
  similarity: number
  position: { x: number; y: number; width: number; height: number }
  route: string
  sourceImageUrl: string
}
