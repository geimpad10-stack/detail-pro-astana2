import { Router } from 'express'
import { getDb, withDb, generateId, generateOrderNumber } from '../db.js'
import { authRequired, requireRole } from '../middleware/auth.js'

const router = Router()

const STATUS = {
  NEW: 'new',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
}

function parseTime(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA
}

/** Get available slots for a date + duration */
router.get('/slots', (req, res) => {
  const { date, duration_min = 60, service_ids } = req.query
  if (!date) return res.status(400).json({ error: 'Укажите date (YYYY-MM-DD)' })

  const db = getDb()
  const settings = db.settings
  const duration = Number(duration_min) || 60
  const day = new Date(date + 'T12:00:00')
  const weekday = day.getDay() === 0 ? 7 : day.getDay() // 1=Mon ... 7=Sun

  if (!settings.work_days.includes(weekday)) {
    return res.json({ date, slots: [], reason: 'Выходной день' })
  }

  const workStart = parseTime(settings.work_start)
  const workEnd = parseTime(settings.work_end)
  const step = settings.slot_minutes || 60

  // Existing bookings that day (not cancelled)
  const dayBookings = db.bookings.filter(
    b => b.date === date && b.status !== STATUS.CANCELLED
  )

  const slots = []
  for (let t = workStart; t + duration <= workEnd; t += step) {
    const slotStart = t
    const slotEnd = t + duration
    // Check conflict with any booking
    const conflict = dayBookings.some(b => {
      const bStart = parseTime(b.time)
      const bEnd = bStart + (b.duration_min || 60)
      return overlaps(slotStart, slotEnd, bStart, bEnd)
    })
    // Also need at least one free workspace + employee (simplified: if any booking uses all posts)
    const activePosts = db.workspaces.filter(w => w.active).length
    const simultaneous = dayBookings.filter(b => {
      const bStart = parseTime(b.time)
      const bEnd = bStart + (b.duration_min || 60)
      return overlaps(slotStart, slotEnd, bStart, bEnd)
    }).length

    const available = !conflict || simultaneous < activePosts
    slots.push({
      time: formatTime(slotStart),
      available: available && simultaneous < activePosts,
      remaining_posts: Math.max(0, activePosts - simultaneous),
    })
  }

  res.json({ date, duration_min: duration, slots })
})

/** Create booking (guest or authenticated) */
router.post('/', (req, res) => {
  try {
    const {
      service_ids = [],
      car_class_id,
      car_brand,
      car_model,
      client_name,
      client_phone,
      client_email,
      date,
      time,
      notes,
      extras = [],
      user_id, // optional if logged in
    } = req.body

    if (!service_ids.length || !date || !time || !client_name || !client_phone) {
      return res.status(400).json({ error: 'Заполните услуги, дату, время, имя и телефон' })
    }

    const db = getDb()
    const settings = db.settings
    const carClass = db.car_classes.find(c => c.id === car_class_id) || { id: null, coefficient: 1, name: 'Стандарт' }

    // Calculate snapshot
    const items = []
    let total = 0
    let duration = 0
    for (const sid of service_ids) {
      const s = db.services.find(x => x.id === sid && x.active)
      if (!s) continue
      const price = Math.round(s.base_price * carClass.coefficient)
      items.push({
        service_id: s.id,
        name: s.name,
        price,
        duration_min: s.duration_min,
        base_price: s.base_price,
        coefficient: carClass.coefficient,
      })
      total += price
      duration += s.duration_min
    }
    for (const ex of extras) {
      const p = Number(ex.price) || 0
      items.push({ name: ex.name || 'Доп. работа', price: p, duration_min: ex.duration_min || 0 })
      total += p
      duration += Number(ex.duration_min) || 0
    }
    if (!items.length) return res.status(400).json({ error: 'Не выбраны валидные услуги' })

    // Server-side slot check (critical)
    const dayBookings = db.bookings.filter(b => b.date === date && b.status !== STATUS.CANCELLED)
    const slotStart = parseTime(time)
    const slotEnd = slotStart + duration
    const workStart = parseTime(settings.work_start)
    const workEnd = parseTime(settings.work_end)
    if (slotStart < workStart || slotEnd > workEnd) {
      return res.status(400).json({ error: 'Время вне рабочих часов' })
    }

    const conflicts = dayBookings.filter(b => {
      const bStart = parseTime(b.time)
      const bEnd = bStart + (b.duration_min || 60)
      return overlaps(slotStart, slotEnd, bStart, bEnd)
    })
    const activePosts = db.workspaces.filter(w => w.active).length
    if (conflicts.length >= activePosts) {
      return res.status(409).json({ error: 'Выбранный слот уже занят. Выберите другое время.' })
    }

    const booking = {
      id: generateId('BKG'),
      order_number: generateOrderNumber(),
      user_id: user_id || null,
      client_name: client_name.trim(),
      client_phone: client_phone.trim(),
      client_email: client_email || null,
      car_brand: car_brand || null,
      car_model: car_model || null,
      car_class_id: carClass.id,
      car_class_name: carClass.name,
      date,
      time,
      duration_min: duration,
      items, // price snapshot
      total,
      notes: notes || null,
      status: STATUS.NEW,
      employee_id: null,
      workspace_id: null,
      internal_notes: null,
      status_history: [{ status: STATUS.NEW, at: new Date().toISOString(), by: 'system' }],
      payment_status: 'unpaid',
      payment_amount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    withDb(d => {
      // re-check inside write lock
      const again = d.bookings.filter(b => b.date === date && b.status !== STATUS.CANCELLED)
      const conf2 = again.filter(b => {
        const bStart = parseTime(b.time)
        const bEnd = bStart + (b.duration_min || 60)
        return overlaps(slotStart, slotEnd, bStart, bEnd)
      })
      if (conf2.length >= activePosts) {
        throw new Error('SLOT_TAKEN')
      }
      d.bookings.push(booking)
    })

    res.status(201).json({
      booking: {
        id: booking.id,
        order_number: booking.order_number,
        date: booking.date,
        time: booking.time,
        total: booking.total,
        duration_min: booking.duration_min,
        status: booking.status,
        items: booking.items,
        client_name: booking.client_name,
      },
      message: 'Запись создана. Мы свяжемся с вами для подтверждения.',
    })
  } catch (e) {
    if (e.message === 'SLOT_TAKEN') {
      return res.status(409).json({ error: 'Выбранный слот уже занят. Выберите другое время.' })
    }
    console.error(e)
    res.status(500).json({ error: 'Ошибка создания записи' })
  }
})

/** Get booking by order number (public, limited info) */
router.get('/by-number/:orderNumber', (req, res) => {
  const db = getDb()
  const b = db.bookings.find(x => x.order_number === req.params.orderNumber)
  if (!b) return res.status(404).json({ error: 'Заказ не найден' })
  res.json({
    order_number: b.order_number,
    date: b.date,
    time: b.time,
    status: b.status,
    total: b.total,
    items: b.items,
    client_name: b.client_name,
    car_brand: b.car_brand,
    car_model: b.car_model,
  })
})

/** Public reviews for homepage */
router.get('/reviews', (req, res) => {
  const db = getDb()
  const list = (db.reviews || [])
    .filter(r => r.published !== false)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 20)
    .map(r => ({
      id: r.id,
      name: r.name,
      car: r.car,
      text: r.text,
      rating: r.rating,
      created_at: r.created_at,
    }))
  res.json({ reviews: list })
})

/** Client: my bookings */
router.get('/my', authRequired, (req, res) => {
  const db = getDb()
  const list = db.bookings
    .filter(b => b.user_id === req.user.id || b.client_phone === req.user.phone)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  res.json({ bookings: list })
})

/** Cancel own booking */
router.post('/:id/cancel', authRequired, (req, res) => {
  const db = getDb()
  const b = db.bookings.find(x => x.id === req.params.id)
  if (!b) return res.status(404).json({ error: 'Заказ не найден' })
  const isOwner = b.user_id === req.user.id || b.client_phone === req.user.phone
  const isStaff = ['owner', 'admin', 'staff'].includes(req.user.role)
  if (!isOwner && !isStaff) return res.status(403).json({ error: 'Нет доступа' })
  if ([STATUS.DELIVERED, STATUS.CANCELLED].includes(b.status)) {
    return res.status(400).json({ error: 'Заказ нельзя отменить' })
  }

  withDb(d => {
    const booking = d.bookings.find(x => x.id === req.params.id)
    booking.status = STATUS.CANCELLED
    booking.updated_at = new Date().toISOString()
    booking.status_history.push({
      status: STATUS.CANCELLED,
      at: new Date().toISOString(),
      by: req.user.id,
      reason: req.body.reason || null,
    })
  })
  res.json({ ok: true, status: STATUS.CANCELLED })
})

/** Client: leave review after visit (ready / delivered) */
router.post('/:id/review', authRequired, (req, res) => {
  const { rating, text } = req.body
  const r = Number(rating)
  if (!r || r < 1 || r > 5) {
    return res.status(400).json({ error: 'Укажите оценку от 1 до 5' })
  }
  const comment = (text || '').trim()
  if (comment.length < 5) {
    return res.status(400).json({ error: 'Напишите отзыв (минимум 5 символов)' })
  }
  if (comment.length > 1000) {
    return res.status(400).json({ error: 'Отзыв слишком длинный' })
  }

  const db = getDb()
  const b = db.bookings.find(x => x.id === req.params.id)
  if (!b) return res.status(404).json({ error: 'Заказ не найден' })

  const isOwner = b.user_id === req.user.id || (req.user.phone && b.client_phone === req.user.phone)
  if (!isOwner) return res.status(403).json({ error: 'Нет доступа к этому заказу' })

  if (![STATUS.READY, STATUS.DELIVERED].includes(b.status)) {
    return res.status(400).json({ error: 'Отзыв можно оставить после завершения визита' })
  }
  if (b.review_id) {
    return res.status(400).json({ error: 'Отзыв уже оставлен' })
  }

  const car = [b.car_brand, b.car_model].filter(Boolean).join(' ') || null
  const review = {
    id: generateId('REV'),
    booking_id: b.id,
    user_id: req.user.id,
    name: req.user.name || b.client_name || 'Клиент',
    car,
    text: comment,
    rating: r,
    published: true,
    created_at: new Date().toISOString(),
  }

  withDb(d => {
    if (!d.reviews) d.reviews = []
    d.reviews.push(review)
    const booking = d.bookings.find(x => x.id === req.params.id)
    if (booking) {
      booking.review_id = review.id
      booking.updated_at = new Date().toISOString()
    }
  })

  res.status(201).json({ review })
})

/** Admin list */
router.get('/', authRequired, requireRole('owner', 'admin', 'staff'), (req, res) => {
  const db = getDb()
  let list = [...db.bookings]
  const { status, date, from, to, q } = req.query
  if (status) list = list.filter(b => b.status === status)
  if (date) list = list.filter(b => b.date === date)
  if (from) list = list.filter(b => b.date >= from)
  if (to) list = list.filter(b => b.date <= to)
  if (q) {
    const qq = q.toLowerCase()
    list = list.filter(
      b =>
        b.order_number.toLowerCase().includes(qq) ||
        (b.client_name || '').toLowerCase().includes(qq) ||
        (b.client_phone || '').includes(qq) ||
        (b.car_brand || '').toLowerCase().includes(qq)
    )
  }
  list.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  res.json({ bookings: list, total: list.length })
})

/** Admin get one */
router.get('/:id', authRequired, requireRole('owner', 'admin', 'staff'), (req, res) => {
  const db = getDb()
  const b = db.bookings.find(x => x.id === req.params.id)
  if (!b) return res.status(404).json({ error: 'Заказ не найден' })
  res.json({ booking: b })
})

/** Admin update status / assign */
router.patch('/:id', authRequired, requireRole('owner', 'admin', 'staff'), (req, res) => {
  const allowed = ['status', 'employee_id', 'workspace_id', 'internal_notes', 'date', 'time', 'total', 'payment_status', 'payment_amount']
  let updated = null
  withDb(db => {
    const b = db.bookings.find(x => x.id === req.params.id)
    if (!b) return
    for (const f of allowed) {
      if (req.body[f] !== undefined) b[f] = req.body[f]
    }
    if (req.body.status && req.body.status !== b.status) {
      // already set above
      b.status_history.push({
        status: req.body.status,
        at: new Date().toISOString(),
        by: req.user.id,
        note: req.body.status_note || null,
      })
    }
    // Auto material write-off on delivered
    if (req.body.status === STATUS.DELIVERED && b.status === STATUS.DELIVERED) {
      // only once - check if already written off
      if (!b.materials_written_off) {
        for (const item of b.items) {
          if (!item.service_id) continue
          const recipes = db.material_recipes.filter(r => r.service_id === item.service_id)
          for (const r of recipes) {
            const mat = db.materials.find(m => m.id === r.material_id)
            if (mat) {
              const qty = r.qty
              if (mat.stock >= qty) {
                mat.stock = Math.round((mat.stock - qty) * 1000) / 1000
                db.inventory_movements.push({
                  id: generateId('MOV'),
                  material_id: mat.id,
                  type: 'write_off',
                  qty,
                  reason: `Заказ ${b.order_number}`,
                  booking_id: b.id,
                  at: new Date().toISOString(),
                  by: req.user.id,
                })
              }
            }
          }
        }
        b.materials_written_off = true
      }
    }
    b.updated_at = new Date().toISOString()
    updated = { ...b }
  })
  if (!updated) return res.status(404).json({ error: 'Заказ не найден' })
  res.json({ booking: updated })
})

export default router
