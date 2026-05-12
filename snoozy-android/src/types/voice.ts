export interface NarrationVoice {
  id: string
  displayName: string
  description: string
  provider: 'elevenlabs' | 'fishaudio' | 'azure'
  disabled?: boolean
}

export interface VoiceProfile {
  id: string
  name: string
  modelId: string
  createdAt: string
}
