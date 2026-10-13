import { Router } from 'express'
import { getDb, withDb, generateId } from '../db.js'
import { authRequired, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(authRequired, requireRole('owner', 'admin'))

router.get('/dashboard', (req, res) => {
  const db = getDb()
  const today = new Date().toISOString().slice(0, 10)
  const bookings = db.bookings

  const todayList = bookings.filter(b => b.date === today && b.status !== 'cancelled')
  const inProgress = bookings.filter(b => b.status === 'in_progress')
  const completed = bookings.filter(b => ['ready', 'delivered'].includes(b.status))
  const cancelled = bookings.filter(b => b.status === 'cancelled')

  // Revenue (delivered + ready with payment)
  const paid = bookings.filter(b => ['ready', 'delivered'].includes(b.status) && b.payment_status === 'paid')
  const revenue = paid.reduce((s, b) => s + (b.payment_amount || b.total || 0), 0)

  // Popular services
  const serviceCount = {}
  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    for (const item of b.items || []) {
      if (item.service_id) {
        serviceCount[item.service_id] = (serviceCount[item.service_id] || 0) + 1
      }
    }
  }
  const popular = Object.entries(serviceCount)
    .map(([id, count]) => {
      const s = db.services.find(x => x.id === id)
      return { service_id: id, name: s?.name || id, count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Low stock
  const lowStock = db.materials.filter(m => m.stock <= m.min_stock)

  res.json({
    today_count: todayList.length,
    in_progress: inProgress.length,
    completed: completed.length,
    cancelled: cancelled.length,
    revenue,
    popular_services: popular,
    low_stock: lowStock,
    employees_active: db.employees.filter(e => e.active).length,
  })
})

// Employees
router.get('/employees', (req, res) => {
  res.json({ employees: getDb().employees })
})

router.post('/employees', (req, res) => {
  const { name, phone, specialization, services, work_start, work_end, active = true } = req.body
  if (!name) return res.status(400).json({ error: 'Укажите имя' })
  const emp = {
    id: generateId('EMP'),
    user_id: null,
    name,
    phone: phone || null,
    specialization: specialization || [],
    services: services || [],
    active: !!active,
    work_start: work_start || '09:00',
    work_end: work_end || '18:00',
    days_off: [],
  }
  withDb(db => db.employees.push(emp))
  res.status(201).json({ employee: emp })
})

router.patch('/employees/:id', (req, res) => {
  let updated = null
  withDb(db => {
    const e = db.employees.find(x => x.id === req.params.id)
    if (!e) return
    Object.assign(e, req.body)
    updated = { ...e }
  })
  if (!updated) return res.status(404).json({ error: 'Сотрудник не найден' })
  res.json({ employee: updated })
})

// Materials
router.get('/materials', (req, res) => {
  res.json({ materials: getDb().materials, movements: getDb().inventory_movements.slice(-50).reverse() })
})

router.post('/materials', (req, res) => {
  const { name, category, unit, stock = 0, min_stock = 0, cost = 0, supplier } = req.body
  if (!name) return res.status(400).json({ error: 'Укажите название' })
  const mat = {
    id: generateId('MAT'),
    name,
    category: category || 'other',
    unit: unit || 'шт',
    stock: Number(stock),
    min_stock: Number(min_stock),
    cost: Number(cost),
    supplier: supplier || '',
  }
  withDb(db => db.materials.push(mat))
  res.status(201).json({ material: mat })
})

router.post('/materials/:id/movement', (req, res) => {
  const { type, qty, reason } = req.body // type: income | write_off | adjustment
  if (!['income', 'write_off', 'adjustment'].includes(type) || !qty) {
    return res.status(400).json({ error: 'Укажите type и qty' })
  }
  let result = null
  withDb(db => {
    const mat = db.materials.find(m => m.id === req.params.id)
    if (!mat) return
    const q = Number(qty)
    if (type === 'income') mat.stock += q
    else if (type === 'write_off') {
      if (mat.stock < q) throw new Error('INSUFFICIENT')
      mat.stock -= q
    } else if (type === 'adjustment') mat.stock = q
    mat.stock = Math.round(mat.stock * 1000) / 1000
    const mov = {
      id: generateId('MOV'),
      material_id: mat.id,
      type,
      qty: type === 'adjustment' ? q : Math.abs(q),
      reason: reason || null,
      at: new Date().toISOString(),
      by: req.user.id,
    }
    db.inventory_movements.push(mov)
    result = { material: { ...mat }, movement: mov }
  })
  if (!result) return res.status(404).json({ error: 'Материал не найден' })
  res.json(result)
})

// Settings
router.get('/settings', (req, res) => {
  res.json({ settings: getDb().settings })
})

router.patch('/settings', (req, res) => {
  withDb(db => {
    Object.assign(db.settings, req.body)
  })
  res.json({ settings: getDb().settings })
})

// Analytics
router.get('/analytics', (req, res) => {
  const { from, to } = req.query
  const db = getDb()
  let list = db.bookings.filter(b => b.status !== 'cancelled')
  if (from) list = list.filter(b => b.date >= from)
  if (to) list = list.filter(b => b.date <= to)

  const revenue = list
    .filter(b => ['ready', 'delivered'].includes(b.status))
    .reduce((s, b) => s + (b.payment_amount || b.total || 0), 0)
  const count = list.length
  const avg = count ? Math.round(revenue / count) : 0

  const byService = {}
  for (const b of list) {
    for (const item of b.items || []) {
      const key = item.service_id || item.name
      if (!byService[key]) byService[key] = { name: item.name, count: 0, revenue: 0 }
      byService[key].count++
      byService[key].revenue += item.price || 0
    }
  }

  res.json({
    period: { from, to },
    orders_count: count,
    revenue,
    average_check: avg,
    by_service: Object.values(byService).sort((a, b) => b.revenue - a.revenue),
    cancelled: db.bookings.filter(b => b.status === 'cancelled' && (!from || b.date >= from) && (!to || b.date <= to)).length,
  })
})

// Clients list
router.get('/clients', (req, res) => {
  const db = getDb()
  const clients = db.users.filter(u => u.role === 'client').map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    created_at: u.created_at,
  }))
  // also from bookings without account
  const phones = new Set(clients.map(c => c.phone))
  for (const b of db.bookings) {
    if (b.client_phone && !phones.has(b.client_phone)) {
      clients.push({
        id: null,
        name: b.client_name,
        email: b.client_email,
        phone: b.client_phone,
        from_booking: true,
      })
      phones.add(b.client_phone)
    }
  }
  res.json({ clients })
})

export default router
