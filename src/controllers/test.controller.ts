import { Request, Response, NextFunction } from 'express'
import { FaceDescriptorService } from '../services/face-detection/face-descriptor.service'
import * as faceapi from 'face-api.js'

const descriptorService = new FaceDescriptorService()

export const startSearching = async (req: Request, res: Response, next: NextFunction) => {
  const { imagePath1, imagePath2 } = req.body

  if (!imagePath1 || !imagePath2) {
    return res.status(400).json({ error: 'Image path is required' })
  }

  try {
    const descriptor1 = await descriptorService.getFaceDescriptor(imagePath1)
    const descriptor2 = await descriptorService.getFaceDescriptor(imagePath2)

    if (!descriptor1 || !descriptor2) {
      return res.status(400).json({ error: 'No face detected in uploaded image' })
    }

    const similarity = 1 - faceapi.euclideanDistance(descriptor1, descriptor2)

    res.json({ similarity })
  } catch (error) {
    next(error)
  }
}
