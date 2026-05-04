export const WORLDS = [
  { id: 'kingdom', emoji: '🏰', name: 'Magical Kingdom', subtitle: 'Castles & gentle quests' },
  { id: 'forest',  emoji: '🌲', name: 'Enchanted Forest', subtitle: 'Animals & cozy cottages' },
  { id: 'space',   emoji: '🚀', name: 'Outer Space',      subtitle: 'Planets & singing stars' },
  { id: 'ocean',   emoji: '🐠', name: 'Ocean Deep',       subtitle: 'Warm seas & sea creatures' },
  { id: 'clouds',  emoji: '☁️', name: 'Cloud Kingdom',    subtitle: 'Sky islands & soft winds' },
  { id: 'jungle',  emoji: '🦁', name: 'Magical Safari',   subtitle: 'Golden plains & gentle giants' },
] as const

export const VIBES = [
  { id: 'cozy',    emoji: '🌙', name: 'Sleepy & Cozy' },
  { id: 'brave',   emoji: '💪', name: 'Be Brave' },
  { id: 'kind',    emoji: '🤝', name: 'Be Kind' },
  { id: 'wonder',  emoji: '🌟', name: 'Full of Wonder' },
  { id: 'friends', emoji: '🐾', name: 'Make a Friend' },
] as const

export type WorldId = (typeof WORLDS)[number]['id']
export type VibeId = (typeof VIBES)[number]['id']
