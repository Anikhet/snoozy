const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { loadConfig } = require('./config')
const { clerkMiddleware, requireAuth } = require('@clerk/express')
const storyRoutes = require('./routes/story')

const config = loadConfig()
const app = express()

const generationRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10,
  keyGenerator: (req) => req.auth?.()?.userId ?? req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: "You've reached your daily limit of 10 stories. Contact the Snoozy team to increase your limit.",
    })
  },
})

app.locals.config = config

app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(clerkMiddleware())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use(['/api/generate-story', '/api/generate-audio'], generationRateLimit)

app.use('/api', requireAuth({ signInUrl: undefined }), (req, res, next) => {
  if (!req.auth?.()?.userId) return res.status(401).json({ success: false, error: 'Unauthorized' })
  next()
}, storyRoutes)

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Snoozy backend running on http://0.0.0.0:${config.port}`)
})
