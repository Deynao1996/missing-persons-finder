import { Request, Response, NextFunction } from 'express'
import { bulkSearchAcrossWebsites } from '../utils/searchNameOnUnityStrength'
import { FULLNAME_FOR_SEARCH, SEARCHING_WEBSITES } from '../constants'

export const startSearching = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await bulkSearchAcrossWebsites({
      names: FULLNAME_FOR_SEARCH,
      websites: SEARCHING_WEBSITES,
      options: {
        maxConcurrent: 3,
        proxyRotate: true,
      },
    })
    res.json({ result })
  } catch (error) {
    next(error)
  }
}
