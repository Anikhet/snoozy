import { Template } from '@/types/template'

/**
 * Snoozy story templates. Each tile uses an editorial serif glyph and a
 * two-stop gradient (light + dark variants) instead of a single flat color.
 */
export const TEMPLATES: Template[] = [
  {
    id: 'dreamland',
    name: 'Dreamland',
    description: 'A journey through soft, drifting dreams.',
    icon: 'moon',
    glyph: '\u263E',
    gradient: {
      light: ['#E8E5FF', '#B8ABE8'],
      dark: ['#2E2B4A', '#3B3458'],
    },
    cardColorLight: '#E8E5FF',
    cardColorDark: '#2E2B4A',
    fields: [{ id: 'favoriteColor', label: 'Favourite colour', type: 'color' }],
  },
  {
    id: 'animal-friends',
    name: 'Animal Friends',
    description: 'Whispering forests and warm fur.',
    icon: 'paw',
    glyph: '\u2740',
    gradient: {
      light: ['#FBE1CC', '#F4C7A0'],
      dark: ['#3A2E28', '#4E3D32'],
    },
    cardColorLight: '#FBE1CC',
    cardColorDark: '#3A2E28',
    fields: [{ id: 'favoriteAnimal', label: 'Favourite animal', type: 'animal' }],
  },
  {
    id: 'under-the-stars',
    name: 'Under the Stars',
    description: 'A peaceful night in the cosmos.',
    icon: 'sparkles',
    glyph: '\u2726',
    gradient: {
      light: ['#DCD5F1', '#B8ABE8'],
      dark: ['#2A254A', '#3B3458'],
    },
    cardColorLight: '#DCD5F1',
    cardColorDark: '#2A254A',
    fields: [{ id: 'favoriteThing', label: 'Favourite thing', type: 'text' }],
  },
  {
    id: 'underwater-journey',
    name: 'Underwater',
    description: 'Drifting through a gentle sea.',
    icon: 'water',
    glyph: '\u223C',
    gradient: {
      light: ['#D4E4F0', '#B9D0E5'],
      dark: ['#1E2E3A', '#2E3E4A'],
    },
    cardColorLight: '#D4E4F0',
    cardColorDark: '#1E2E3A',
    fields: [{ id: 'favoriteColor', label: 'Favourite colour', type: 'color' }],
  },
  {
    id: 'space-explorer',
    name: 'Space Explorer',
    description: 'A slow trip through the cosmos.',
    icon: 'planet',
    glyph: '\u272A',
    gradient: {
      light: ['#DCD5F1', '#B8ABE8'],
      dark: ['#2A254A', '#3F3A5C'],
    },
    cardColorLight: '#DCD5F1',
    cardColorDark: '#2A254A',
    fields: [{ id: 'favoriteThing', label: 'Favourite thing', type: 'text' }],
  },
  {
    id: 'fairy-garden',
    name: 'Fairy Garden',
    description: 'A tiny world, very close by.',
    icon: 'leaf',
    glyph: '\u273F',
    gradient: {
      light: ['#F6DCE1', '#E9B5C1'],
      dark: ['#3A1E2E', '#4C2E3C'],
    },
    cardColorLight: '#F6DCE1',
    cardColorDark: '#3A1E2E',
    fields: [{ id: 'favoriteColor', label: 'Favourite colour', type: 'color' }],
  },
  {
    id: 'snowy-mountain',
    name: 'Snowy Mountain',
    description: 'Warm hands, slow snow falling.',
    icon: 'snow',
    glyph: '\u2744',
    gradient: {
      light: ['#E4ECEE', '#B8C8CC'],
      dark: ['#1E2E34', '#30404A'],
    },
    cardColorLight: '#E4ECEE',
    cardColorDark: '#1E2E34',
    fields: [{ id: 'favoriteAnimal', label: 'Favourite animal', type: 'animal' }],
  },
  {
    id: 'rainy-day-cozy',
    name: 'Rainy Day',
    description: 'Curl up and listen to the rain.',
    icon: 'rainy',
    glyph: '\u2042',
    gradient: {
      light: ['#D4DEE8', '#A8BBCE'],
      dark: ['#202838', '#30394A'],
    },
    cardColorLight: '#D4DEE8',
    cardColorDark: '#202838',
    fields: [{ id: 'favoriteThing', label: 'Favourite thing', type: 'text' }],
  },
]
