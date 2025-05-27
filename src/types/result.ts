export interface TextMatchResult {
  text: string
  date?: string
  link: string
}

export interface FaceMatcherResult {
  similarity: number
  meta: string
  sourceImageUrl: string
  textMessage?: string
}

export interface NameMatchResult {
  matches: string[]
  excerpt?: string
}

export interface ChannelTextMatchResults {
  [channel: string]: TextMatchResult[]
}

export interface ChannelFaceMatchResults {
  [channel: string]: FaceMatcherResult[]
}

export type EnrichedFaceMatcherResult = Record<string, FaceMatcherResult[]>
