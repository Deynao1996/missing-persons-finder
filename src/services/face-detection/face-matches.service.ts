import * as canvas from 'canvas'
import * as faceapi from 'face-api.js'
import { FaceMatcherResult } from '../scraping/types'
import { BatchedImage } from '../image-processor/types'

export class FaceMatchesService {
  async findFaceMatches(
    inputDescriptor: Float32Array,
    images: BatchedImage[],
    minSimilarity: number,
  ): Promise<Array<FaceMatcherResult>> {
    const matches: Array<FaceMatcherResult> = []

    for (const { imageBuffer, meta, sourceImageUrl } of images) {
      try {
        const img = await canvas.loadImage(imageBuffer)

        const detections = await faceapi
          .detectAllFaces(img as any)
          .withFaceLandmarks()
          .withFaceDescriptors()

        for (const det of detections) {
          const similarity = 1 - faceapi.euclideanDistance(inputDescriptor, det.descriptor)

          if (similarity >= minSimilarity) {
            matches.push({
              similarity,
              position: det.detection.box,
              meta,
              sourceImageUrl,
            })
          }
        }
      } catch (error) {
        console.error(`Error processing buffer image from ${sourceImageUrl}:`, error)
      }
    }

    return matches
  }
}
