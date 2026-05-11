const dotenv = require('dotenv')
dotenv.config({ override: true })

/**
 * Validates required environment variables are present and returns
 * a frozen config object used across the backend.
 */
function loadConfig() {
  const required = ['AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_CHAT_DEPLOYMENT', 'AZURE_OPENAI_TTS_DEPLOYMENT']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  return Object.freeze({
    azureOpenAIApiKey:        process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIEndpoint:      process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIChatDeployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
    azureOpenAIChatVersion:   process.env.AZURE_OPENAI_CHAT_VERSION || '2025-01-01-preview',
    azureOpenAITtsDeployment: process.env.AZURE_OPENAI_TTS_DEPLOYMENT,
    azureOpenAITtsVersion:    process.env.AZURE_OPENAI_TTS_VERSION  || '2025-03-01-preview',
    elevenlabsApiKey:  process.env.ELEVENLABS_API_KEY,
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID,
    fishApiKey:        process.env.FISH_API_KEY,
    fishAudioVoiceId:  process.env.FISH_AUDIO_VOICE_ID,
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    clerkSecretKey:    process.env.CLERK_SECRET_KEY,
    port: parseInt(process.env.PORT || '3001', 10),
  })
}

module.exports = { loadConfig }
