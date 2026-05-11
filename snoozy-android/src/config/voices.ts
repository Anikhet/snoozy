import { NarrationVoice } from '@/types/voice'

export const VOICE_PREVIEW_TEXT =
`[soft voice] Once there was a small fox named Milo who lived at the edge of a sleepy forest.

Every night, before the stars came out, Milo walked the same path — 
past the old oak, past the quiet stream, all the way to the top of 
the small hill where the sky felt close. [pause]

Tonight, the trees were still. The wind had gone to bed. [pause]

A tiny [low volume] *crinkle* came from the leaves ahead.

Milo stopped. [short pause] A small bird sat alone on a low branch, 
head tucked, too tired to fly home.

"Are you lost?" Milo asked.

The bird looked up. "A little," it said. "Are you?"

"Maybe," said Milo. "But I'm not scared."

[emphasis] "Good."

[gentle] That small word sat between them like a warm stone.

[pause]

[soft voice] The hill grew quiet. The first star came out.

Milo felt the cool air on his nose, the soft ground beneath his paws.

[low voice, slow] His eyes grew heavy. The forest breathed around him.

[whisper] The night wrapped them both in its soft dark arms.

[exhale] And everything was still.`
export const VOICES: NarrationVoice[] = [
  { id: '933563129e564b19a115bedd57b7406a', displayName: 'Aria',      description: 'Warm & gentle',    provider: 'fishaudio'  },
  { id: 'qBDvhofpxp92JgXJxDjB',           displayName: 'Lily',      description: 'Soft & warm',      provider: 'elevenlabs' },
  { id: 'tQ4MEZFJOzsahSEEZtHK',           displayName: 'Ivanna',    description: 'Soft & warm',      provider: 'elevenlabs' },
  { id: 'flHkNRp1BlvT73UL6gyz',           displayName: 'Jessica',   description: 'Soft & warm',      provider: 'elevenlabs' },
  { id: '6p0P6gezgvY1v6xbLzmU',           displayName: 'Anvi',      description: 'Soft & warm',      provider: 'elevenlabs' },
  { id: 'bf322df2096a46f18c579d0baa36f41d', displayName: 'Adrian',   description: 'Soft & warm',      provider: 'fishaudio'  },
  { id: '0cd6cf9684dd4cc9882fbc98957c9b1d', displayName: 'Elephant', description: 'Soft & warm',      provider: 'fishaudio'  },
  { id: 'cad919beaf7c4b02bfe5c7168a92e7cd', displayName: 'Peppa Pig', description: 'Soft & warm',     provider: 'fishaudio'  },
  { id: '9a9cf47702da476aa4629e2506d4a857', displayName: 'Hannah',   description: 'Soft & warm',      provider: 'fishaudio'  },
  { id: 'shimmer',                          displayName: 'Clara',    description: 'Clear & soothing', provider: 'azure'      },
  { id: 'onyx',                             displayName: 'Marcus',   description: 'Deep & calm',      provider: 'azure'      },
]

export const DEFAULT_VOICE = VOICES[0]
