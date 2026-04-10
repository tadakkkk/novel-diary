import 'dotenv/config'
import express, { type Request } from 'express'
import cors from 'cors'
import aiRouter from './routes/ai.js'
import billingRouter from './routes/billing.js'
import authRouter from './routes/auth.js'

const app  = express()
const PORT = process.env.PORT ?? 3001

// Paddle webhook: keep raw body for signature verification
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }), (req: Request & { rawBody?: string }, _res, next) => {
  req.rawBody = req.body?.toString?.() ?? ''
  next()
})

// CORS — allow GitHub Pages origin (tadakkkk.github.io) and localhost for dev
const allowedOrigins = [
  process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: ${origin} not allowed`))
  },
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))

app.use('/api/ai',      aiRouter)
app.use('/api/billing', billingRouter)
app.use('/api/auth',    authRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`)
})
