import * as canvas from 'canvas'
import * as faceapi from 'face-api.js'
import { FaceMatcherResult } from './types'

export class FaceMatchesService {
  async findFaceMatches(
    inputDescriptor: Float32Array,
    images: {
      filepath: string
      route: string
      sourceImageUrl: string
    }[],
    minSimilarity: number,
  ): Promise<Array<FaceMatcherResult>> {
    const matches: Array<FaceMatcherResult> = []

    for (const { filepath, route, sourceImageUrl } of images) {
      try {
        const img = await canvas.loadImage(filepath)
        const detections = await faceapi
          .detectAllFaces(img as any) // `img` is a canvas.Image, which is acceptable
          .withFaceLandmarks()
          .withFaceDescriptors()

        for (const det of detections) {
          const similarity = 1 - faceapi.euclideanDistance(inputDescriptor, det.descriptor)

          if (similarity >= minSimilarity) {
            matches.push({
              similarity,
              position: det.detection.box,
              route,
              sourceImageUrl,
            })
          }
        }
      } catch (error) {
        console.error(`Error processing ${filepath}:`, error)
      }
    }

    return matches
  }
}
