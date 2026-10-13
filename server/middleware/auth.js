import jwt from 'jsonwebtoken'
import { getDb } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'detail-pro-astana-dev-secret-change-in-production'

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' })
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET)
    const db = getDb()
    const user = db.users.find(u => u.id === payload.id && u.active)
    if (!user) return res.status(401).json({ error: 'Пользователь не найден или отключён' })
    req.user = { id: user.id, role: user.role, email: user.email, name: user.name, phone: user.phone }
    next()
  } catch {
    return res.status(401).json({ error: 'Недействительный или истёкший токен' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' })
    }
    next()
  }
}

export { JWT_SECRET }
