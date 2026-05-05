export const WORLDS = [
  { id: 'kingdom', emoji: '🏰', name: 'Magical Kingdom', subtitle: 'Castles & gentle quests' },
  { id: 'forest',  emoji: '🌲', name: 'Enchanted Forest', subtitle: 'Animals & cozy cottages' },
  { id: 'space',   emoji: '🚀', name: 'Outer Space',      subtitle: 'Planets & singing stars' },
  { id: 'ocean',   emoji: '🐠', name: 'Ocean Deep',       subtitle: 'Warm seas & sea creatures' },
  { id: 'clouds',  emoji: '☁️', name: 'Cloud Kingdom',    subtitle: 'Sky islands & soft winds' },
  { id: 'jungle',  emoji: '🦁', name: 'Magical Safari',   subtitle: 'Golden plains & gentle giants' },
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
