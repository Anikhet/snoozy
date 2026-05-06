export interface NarrationVoice {
  id: string
  displayName: string
  description: string
  provider: 'elevenlabs' | 'openai'
}
