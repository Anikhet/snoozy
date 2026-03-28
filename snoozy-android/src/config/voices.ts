import { NarrationVoice } from '@/types/voice'

export const VOICES: NarrationVoice[] = [
  { id: 'shimmer', displayName: 'Luna', description: 'Warm & gentle' },
  { id: 'nova', displayName: 'Sage', description: 'Calm & clear' },
  { id: 'onyx', displayName: 'Bear', description: 'Deep & soothing' },
  { id: 'fable', displayName: 'Meadow', description: 'Soft & storytelling' },
]

export const DEFAULT_VOICE = VOICES[0]
