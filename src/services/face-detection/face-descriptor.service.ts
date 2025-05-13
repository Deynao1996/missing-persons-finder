import * as canvas from 'canvas'
import * as faceapi from 'face-api.js'

export class FaceDescriptorService {
  async getFaceDescriptor(input: Buffer | string): Promise<Float32Array | null> {
    try {
      const img = await canvas.loadImage(input)

      const detection = await faceapi
        .detectSingleFace(img as any)
        .withFaceLandmarks()
        .withFaceDescriptor()

      return detection?.descriptor || null
    } catch (error) {
      console.error('Face detection error:', error)
      return null
    }
  }
}
