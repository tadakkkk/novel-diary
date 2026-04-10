import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import aiRouter from './routes/ai.js'
import billingRouter from './routes/billing.js'

const app  = express()
const PORT = process.env.PORT ?? 3001

// Stripe webhook needs raw body BEFORE json parser
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }))

app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

app.use('/api/ai',      aiRouter)
app.use('/api/billing', billingRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`)
})
