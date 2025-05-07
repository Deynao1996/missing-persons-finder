import * as canvas from 'canvas'
import * as faceapi from 'face-api.js'

//TODO: Refactor createCanvas

export class FaceDescriptorService {
  async getFaceDescriptor(imagePath: string): Promise<Float32Array | null> {
    try {
      const img = await canvas.loadImage(imagePath)

      // 4. Detect faces with proper typing
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
