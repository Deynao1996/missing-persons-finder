export class ProxyService {
  private readonly proxies: string[] = [
    'socks5://kyiv1.proxy:1080',
    'socks5://lviv.proxy:1080',
    'socks5://backup.proxy:1080',
  ]

  private readonly ukrainianIpPrefixes: string[] = ['31.128', '37.73', '46.175']

  getCurrentProxy(): string {
    return this.proxies[Math.floor(Math.random() * this.proxies.length)]
  }

  generateUkrainianIP(): string {
    const prefix = this.ukrainianIpPrefixes[Math.floor(Math.random() * this.ukrainianIpPrefixes.length)]
    const suffix = Math.floor(Math.random() * 255)
    return `${prefix}.${suffix}`
  }
}
