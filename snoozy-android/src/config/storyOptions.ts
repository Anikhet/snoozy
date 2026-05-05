export const WORLDS = [
  { id: 'kingdom', emoji: '🏰', name: 'Magical Kingdom',  subtitle: 'Castles, spells, and magical creatures.' },
  { id: 'space',   emoji: '🚀', name: 'Outer Space',       subtitle: 'Planets, stars, and cosmic adventures.' },
  { id: 'forest',  emoji: '🌲', name: 'Enchanted Forest',  subtitle: 'Hidden paths, talking animals, and wonders.' },
  { id: 'ocean',   emoji: '🐠', name: 'Ocean Deep',        subtitle: 'Warm seas, treasure, and sea creatures.' },
  { id: 'clouds',  emoji: '☁️', name: 'Cloud Kingdom',    subtitle: 'Floating islands and sky-high adventures.' },
  { id: 'jungle',  emoji: '🦁', name: 'Magical Safari',    subtitle: 'Golden plains and gentle giant friends.' },
] as const

export const VIBES = [
  { id: 'happy',    emoji: '🌟', name: 'Happy',    description: 'Feel joy, smiles, and light in your heart.',    emojiBg: '#FFF8E0' },
  { id: 'calm',     emoji: '☁️', name: 'Calm',     description: 'Feel peaceful, relaxed, and ready for sleep.',  emojiBg: '#EAF0FF' },
  { id: 'loved',    emoji: '💖', name: 'Loved',    description: 'Feel safe, cared for, and surrounded by love.', emojiBg: '#FFE8F0' },
  { id: 'brave',    emoji: '🌙', name: 'Brave',    description: 'Feel courageous and ready to try new things.',  emojiBg: '#F0E8FF' },
  { id: 'inspired', emoji: '🌈', name: 'Inspired', description: 'Feel curious, creative, and full of wonder.',   emojiBg: '#E8FFF4' },
] as const

export type WorldId = (typeof WORLDS)[number]['id']
export type VibeId = (typeof VIBES)[number]['id']
