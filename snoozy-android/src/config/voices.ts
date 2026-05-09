import { NarrationVoice } from '@/types/voice'

export const VOICES: NarrationVoice[] = [
  { id: '933563129e564b19a115bedd57b7406a', displayName: 'Aria',    description: 'Warm & gentle',    provider: 'fishaudio' },
  { id: 'qBDvhofpxp92JgXJxDjB',           displayName: 'Lily',    description: 'Soft & warm',      provider: 'elevenlabs' },
  { id: 'tQ4MEZFJOzsahSEEZtHK',           displayName: 'Ivanna',  description: 'Soft & warm',      provider: 'elevenlabs' },
  { id: 'flHkNRp1BlvT73UL6gyz',           displayName: 'Jessica', description: 'Soft & warm',      provider: 'elevenlabs' },
  { id: '6p0P6gezgvY1v6xbLzmU',           displayName: 'Anvi',    description: 'Soft & warm',      provider: 'elevenlabs' },
]

export const DEFAULT_VOICE = VOICES[0]
