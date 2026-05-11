export interface NarrationVoice {
  id: string
  displayName: string
  description: string
  provider: 'elevenlabs' | 'fishaudio' | 'azure'
}

export interface VoiceProfile {
  id: string
  name: string
  modelId: string
  createdAt: string
}
