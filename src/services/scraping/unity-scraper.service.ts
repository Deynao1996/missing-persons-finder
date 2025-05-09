import puppeteer from 'puppeteer'
import { BulkAcrossWebsites, BulkSearchResult, FaceMatcherResult } from './types'
import { ProxyService } from '../network/proxy.service'
import { WebWorkerStrategy } from './strategies/web-worker.strategy'
import { FaceDescriptorService } from '../face-detection/face-descriptor.service'
import { SEARCHING_WEBSITES } from '../../constants'

export class UnityScraperService {
  private proxyService = new ProxyService()
  private workerStrategy = new WebWorkerStrategy()
  private faceDescriptorService = new FaceDescriptorService()

  async bulkTextSearchAcrossWebsites({
    names,
    websites,
    options = {},
  }: BulkAcrossWebsites): Promise<BulkSearchResult[]> {
    const results: BulkSearchResult[] = names.map((name) => ({
      name: `${name.firstName} ${name.lastName}`,
      results: [],
    }))

    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        ...(options.proxyRotate ? [this.proxyService.getCurrentProxy()] : []),
      ],
    })

    const workerPool = Array(options.maxConcurrent || 3).fill(null)

    await Promise.all(
      workerPool.map((_, workerId) =>
        this.workerStrategy.runWorker(workerId, {
          browser,
          names,
          websites,
          results,
          options,
        }),
      ),
    )

    await browser.close()
    return results
  }

  async performImageSearch(imagePath: string): Promise<FaceMatcherResult[]> {
    if (!imagePath) throw new Error('No image path provided')

    const inputDescriptor = await this.faceDescriptorService.getFaceDescriptor(imagePath)
    if (!inputDescriptor) throw new Error('No face detected in uploaded image')

    const allMatches: FaceMatcherResult[] = []

    for (const site of SEARCHING_WEBSITES) {
      const siteMatches = await this.workerStrategy.searchSite(site, inputDescriptor)
      allMatches.push(...siteMatches)
    }

    return allMatches
  }
}
