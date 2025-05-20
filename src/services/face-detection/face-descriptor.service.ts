import * as canvas from 'canvas'
import * as faceapi from 'face-api.js'

export class FaceDescriptorService {
  async getFaceDescriptor(input: Buffer | string): Promise<Float32Array | null> {
    const descriptors = await this.getDescriptorsInternal(input, true)
    return descriptors.length > 0 ? descriptors[0] : null
  }

  async getMultipleFaceDescriptors(input: Buffer | string): Promise<Float32Array[]> {
    return this.getDescriptorsInternal(input, false)
  }

  private async getDescriptorsInternal(input: Buffer | string, single: boolean): Promise<Float32Array[]> {
    try {
      const img = await canvas.loadImage(input)

      if (img.width === 0 || img.height === 0) {
        console.warn('⚠️ Invalid image dimensions (0x0)')
        return []
      }

      const detectionFn = single
        ? faceapi
            .detectSingleFace(img as any)
            .withFaceLandmarks()
            .withFaceDescriptor()
        : faceapi
            .detectAllFaces(img as any)
            .withFaceLandmarks()
            .withFaceDescriptors()

      const results = await detectionFn

      if (!results || (Array.isArray(results) && results.length === 0)) {
        console.warn('⚠️ No faces detected.')
        return []
      }

      const detections = Array.isArray(results) ? results : [results]

      const validDetections = detections.filter((r) => r?.detection?.box?.width > 0 && r?.detection?.box?.height > 0)

      if (validDetections.length === 0) {
        console.warn('⚠️ All detected faces had invalid bounding boxes.')
        return []
      }

      return validDetections.map((r) => r.descriptor)
    } catch (error) {
      console.error('❌ Face detection failed:', error)
      return []
    }
  }
}
