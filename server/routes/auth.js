import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getDb, withDb, generateId } from '../db.js'
import { signToken, authRequired } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, name } = req.body
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Укажите email, пароль и имя' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' })
    }
    const db = getDb()
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' })
    }
    if (phone && db.users.some(u => u.phone === phone)) {
      return res.status(409).json({ error: 'Пользователь с таким телефоном уже существует' })
    }
    const password_hash = await bcrypt.hash(password, 10)
    const user = {
      id: generateId('USR'),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      password_hash,
      name: name.trim(),
      role: 'client',
      created_at: new Date().toISOString(),
      active: true,
    }
    withDb(d => { d.users.push(user) })
    const token = signToken(user)
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка регистрации' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Укажите email и пароль' })
    const db = getDb()
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active)
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' })
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: 'Неверный email или пароль' })
    const token = signToken(user)
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Ошибка входа' })
  }
})

router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user })
})

router.patch('/me', authRequired, (req, res) => {
  const { name, phone } = req.body
  withDb(db => {
    const user = db.users.find(u => u.id === req.user.id)
    if (!user) return
    if (name) user.name = name.trim()
    if (phone !== undefined) user.phone = phone
  })
  const db = getDb()
  const user = db.users.find(u => u.id === req.user.id)
  res.json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
  })
})

export default router
