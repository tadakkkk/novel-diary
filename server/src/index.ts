import 'dotenv/config'
import express, { type Request } from 'express'
import cors from 'cors'
import aiRouter from './routes/ai.js'
import billingRouter from './routes/billing.js'
import authRouter from './routes/auth.js'
import iapRouter from './routes/iap.js'

const app  = express()
const PORT = process.env.PORT ?? 3001

// Paddle webhook: keep raw body for signature verification
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }), (req: Request & { rawBody?: string }, _res, next) => {
  req.rawBody = req.body?.toString?.() ?? ''
  next()
})

// CORS — allow GitHub Pages origin (tadakkkk.github.io) and localhost for dev
const allowedOrigins = [
  'https://tadakkkk.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : []),
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Capacitor, etc.)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: ${origin} not allowed`))
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
  exposedHeaders: ['x-calls-remaining'],
}))

app.use(express.json({ limit: '10mb' }))

app.use('/api/ai',      aiRouter)
app.use('/api/billing', billingRouter)
app.use('/api/auth',    authRouter)
app.use('/api/iap',     iapRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Global error handler — prevents unhandled errors from crashing Railway
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[global error]', err.message, err.stack)
  res.status(500).json({ error: err.message ?? 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`)
  console.log(`[env] ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '(set)' : 'MISSING'}`)
  console.log(`[env] SUPABASE_URL: ${process.env.SUPABASE_URL ?? 'MISSING'}`)
  console.log(`[env] PADDLE_API_KEY: ${process.env.PADDLE_API_KEY ? '(set)' : 'MISSING'}`)
})
