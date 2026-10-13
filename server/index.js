import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { seedIfEmpty, getDb } from './db.js'
import authRoutes from './routes/auth.js'
import servicesRoutes from './routes/services.js'
import bookingsRoutes from './routes/bookings.js'
import adminRoutes from './routes/admin.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))

// API
app.use('/api/auth', authRoutes)
app.use('/api/services', servicesRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'Detail Pro Astana API', time: new Date().toISOString() })
})

/** Public business settings (no secrets) */
app.get('/api/public-settings', (req, res) => {
  const s = getDb().settings || {}
  res.json({
    business_name: s.business_name || 'Detail Pro Astana',
    twogis_url: s.twogis_url || '',
  })
})

// Production: serve built frontend
const dist = path.join(__dirname, '..', 'dist')
app.use(express.static(dist))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(dist, 'index.html'), err => {
    if (err) next()
  })
})

async function start() {
  const seed = await seedIfEmpty()
  if (seed.seeded) {
    console.log('Database seeded.')
    console.log('  Admin:  admin@detailpro.kz / admin123')
    console.log('  Client: client@example.com / client123')
  }
  app.listen(PORT, () => {
    console.log(`Detail Pro Astana API → http://localhost:${PORT}`)
  })
}

start().catch(err => {
  console.error(err)
  process.exit(1)
})
