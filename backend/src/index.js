const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { loadConfig } = require('./config')
const { clerkMiddleware, requireAuth } = require('@clerk/express')
const storyRoutes = require('./routes/story')

const config = loadConfig()
const app = express()

app.locals.config = config

app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(clerkMiddleware())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', requireAuth(), storyRoutes)

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Snoozy backend running on http://0.0.0.0:${config.port}`)
})
