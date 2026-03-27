const dotenv = require('dotenv')
dotenv.config()

/**
 * Validates required environment variables are present and returns
 * a frozen config object used across the backend.
 */
function loadConfig() {
  const required = ['OPENAI_API_KEY', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID']
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  return Object.freeze({
    openaiApiKey: process.env.OPENAI_API_KEY,
    elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID,
    port: parseInt(process.env.PORT || '3001', 10),
  })
}

module.exports = { loadConfig }
