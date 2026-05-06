import { NarrationVoice } from '@/types/voice'

export const VOICES: NarrationVoice[] = [
  { id: 'shimmer', displayName: 'Luna', description: 'Warm & gentle', provider: 'openai' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', displayName: 'Lily', description: 'Soft & warm', provider: 'elevenlabs' },
  { id: 'onyx', displayName: 'Bear', description: 'Deep & soothing', provider: 'openai' },
  { id: 'fable', displayName: 'Meadow', description: 'Soft & storytelling', provider: 'openai' },
]

export const DEFAULT_VOICE = VOICES[0]
