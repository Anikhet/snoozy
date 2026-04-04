const dotenv = require('dotenv')
dotenv.config({ override: true })

/**
 * Validates required environment variables are present and returns
 * a frozen config object used across the backend.
 */
function loadConfig() {
  const ttsProvider = (process.env.TTS_PROVIDER || 'openai').toLowerCase()

  const required = ['OPENAI_API_KEY']
  if (ttsProvider === 'elevenlabs') {
    required.push('ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID')
  } else if (ttsProvider === 'azure') {
    required.push('AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_ENDPOINT')
  }

  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  return Object.freeze({
    ttsProvider,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiTtsVoice: process.env.OPENAI_TTS_VOICE || 'shimmer',
    elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID,
    azureOpenaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenaiApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenaiApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-12-15',
    azureOpenaiTtsDeployment: process.env.AZURE_OPENAI_TTS_DEPLOYMENT || 'gpt-4o-mini-tts',
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
    port: parseInt(process.env.PORT || '3001', 10),
  })
}

module.exports = { loadConfig }
