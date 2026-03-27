/**
 * Story template definitions. Each template has:
 * - id: unique identifier
 * - name: display name
 * - description: short tagline for the picker
 * - icon: SF Symbol name (used by iOS)
 * - fields: additional form fields beyond name + age
 * - systemPrompt: OpenAI system prompt with {placeholders} for interpolation
 *
 * Prompts are tuned for 600-800 word stories (3-5 min read-aloud),
 * calming tone, age-appropriate language, ending with sleep.
 */

const templates = [
  {
    id: 'dreamland',
    name: 'Dreamland Adventure',
    description: 'A magical journey through dreams',
    icon: 'moon.stars.fill',
    fields: [{ key: 'favoriteColor', label: 'Favorite Color', type: 'color' }],
    systemPrompt: `You are a gentle bedtime storyteller. Write a calming bedtime story for a child named {name} who is {age} years old. Their favorite color is {favoriteColor}.

The story should be about {name} drifting off to sleep and entering a magical dreamland where everything shimmers in shades of {favoriteColor}. They float on soft {favoriteColor} clouds, meet friendly dream creatures, and explore a gentle, peaceful world.

Rules:
- Write exactly 600-800 words
- Use simple, soothing language appropriate for a {age}-year-old
- The tone should be calm, gentle, and sleepy
- Include sensory details (soft sounds, warm feelings, gentle lights)
- The story must end with {name} feeling safe, warm, and drifting into peaceful sleep
- Do not include anything scary, loud, or overstimulating
- Start the story directly, no title needed`,
  },
  {
    id: 'animal-friends',
    name: 'Animal Friends',
    description: 'Befriend animals in a whispering forest',
    icon: 'hare.fill',
    fields: [{ key: 'favoriteAnimal', label: 'Favorite Animal', type: 'animal' }],
    systemPrompt: `You are a gentle bedtime storyteller. Write a calming bedtime story for a child named {name} who is {age} years old. Their favorite animal is a {favoriteAnimal}.

The story should be about {name} discovering a quiet, moonlit forest where animals whisper and play softly. They meet a friendly {favoriteAnimal} who becomes their companion. Together they walk through the gentle forest, helping sleepy animals find cozy places to rest.

Rules:
- Write exactly 600-800 words
- Use simple, soothing language appropriate for a {age}-year-old
- The tone should be calm, gentle, and sleepy
- Include soft animal sounds and cozy descriptions
- The story must end with {name} and their {favoriteAnimal} friend curling up together and falling asleep
- Do not include anything scary, loud, or overstimulating
- Start the story directly, no title needed`,
  },
  {
    id: 'under-the-stars',
    name: 'Under the Stars',
    description: 'Explore the peaceful night sky',
    icon: 'sparkles',
    fields: [{ key: 'favoriteThing', label: 'Favorite Thing', type: 'text' }],
    systemPrompt: `You are a gentle bedtime storyteller. Write a calming bedtime story for a child named {name} who is {age} years old. Their favorite thing is {favoriteThing}.

The story should be about {name} lying on a soft blanket in a meadow, gazing up at the stars. The stars begin to twinkle in patterns that remind them of {favoriteThing}. A gentle star floats down and takes {name} on a slow, peaceful ride through the night sky, showing them constellations and quiet wonders.

Rules:
- Write exactly 600-800 words
- Use simple, soothing language appropriate for a {age}-year-old
- The tone should be calm, gentle, and sleepy
- Include descriptions of soft starlight, gentle breezes, and quiet night sounds
- The story must end with {name} floating gently back to their blanket and falling asleep under the stars
- Do not include anything scary, loud, or overstimulating
- Start the story directly, no title needed`,
  },
]

/**
 * Looks up a template by ID and interpolates child details into the system prompt.
 * Returns { template, prompt } or null if template not found.
 */
function buildPrompt(templateId, childDetails) {
  const template = templates.find((t) => t.id === templateId)
  if (!template) return null

  let prompt = template.systemPrompt
  prompt = prompt.replace(/{name}/g, childDetails.name)
  prompt = prompt.replace(/{age}/g, String(childDetails.age))

  for (const field of template.fields) {
    const value = childDetails[field.key]
    if (value) {
      prompt = prompt.replace(new RegExp(`{${field.key}}`, 'g'), value)
    }
  }

  return { template, prompt }
}

module.exports = { templates, buildPrompt }
