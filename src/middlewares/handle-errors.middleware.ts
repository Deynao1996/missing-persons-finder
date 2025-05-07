import { Request, Response, NextFunction } from 'express'

export const handleErrors = () => {
  return (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const errorStatus: number = err.status || 500
    const errorMessage: string = err.message || 'Something went wrong!'

    return res.status(errorStatus).json({
      success: false,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      errorMessage,
      errorStatus,
    })
  }
}
