import { Router } from 'express'
import { getDb, withDb, generateId } from '../db.js'
import { authRequired, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const activeOnly = req.query.all !== '1'
  let services = db.services
  if (activeOnly) services = services.filter(s => s.active)
  res.json({
    services,
    car_classes: db.car_classes,
  })
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const service = db.services.find(s => s.id === req.params.id)
  if (!service) return res.status(404).json({ error: 'Услуга не найдена' })
  res.json({ service, car_classes: db.car_classes })
})

/** Calculate price */
router.post('/calculate', (req, res) => {
  const { service_ids = [], car_class_id, extras = [] } = req.body
  const db = getDb()
  const carClass = db.car_classes.find(c => c.id === car_class_id) || { coefficient: 1 }
  const items = []
  let total = 0
  let duration = 0

  for (const sid of service_ids) {
    const s = db.services.find(x => x.id === sid && x.active)
    if (!s) continue
    const price = Math.round(s.base_price * carClass.coefficient)
    items.push({ service_id: s.id, name: s.name, price, duration_min: s.duration_min })
    total += price
    duration += s.duration_min
  }
  for (const ex of extras) {
    const p = Number(ex.price) || 0
    items.push({ name: ex.name || 'Доп. работа', price: p, duration_min: ex.duration_min || 0 })
    total += p
    duration += Number(ex.duration_min) || 0
  }

  res.json({
    items,
    total,
    duration_min: duration,
    car_class: carClass,
    preliminary: true,
    note: 'Итоговая стоимость может быть скорректирована после осмотра автомобиля',
  })
})

// Admin CRUD
router.post('/', authRequired, requireRole('owner', 'admin'), (req, res) => {
  const { name, description, base_price, duration_min, category, image, active = true } = req.body
  if (!name || base_price == null) return res.status(400).json({ error: 'Укажите название и цену' })
  const service = {
    id: generateId('SRV'),
    name,
    description: description || '',
    base_price: Number(base_price),
    duration_min: Number(duration_min) || 60,
    category: category || 'other',
    image: image || null,
    active: !!active,
  }
  withDb(db => db.services.push(service))
  res.status(201).json({ service })
})

router.patch('/:id', authRequired, requireRole('owner', 'admin'), (req, res) => {
  let updated = null
  withDb(db => {
    const s = db.services.find(x => x.id === req.params.id)
    if (!s) return
    const fields = ['name', 'description', 'base_price', 'duration_min', 'category', 'image', 'active']
    for (const f of fields) {
      if (req.body[f] !== undefined) s[f] = req.body[f]
    }
    if (req.body.base_price != null) s.base_price = Number(req.body.base_price)
    if (req.body.duration_min != null) s.duration_min = Number(req.body.duration_min)
    updated = { ...s }
  })
  if (!updated) return res.status(404).json({ error: 'Услуга не найдена' })
  res.json({ service: updated })
})

export default router
