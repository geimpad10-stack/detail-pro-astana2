/**
 * Simple JSON file-based store for Detail Pro Astana.
 * Atomic writes via temp file + rename. Suitable for single-instance deployment.
 * Can be replaced with better-sqlite3 / Postgres later without changing route logic much.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

const DEFAULT_DB = {
  users: [],
  vehicles: [],
  services: [],
  car_classes: [],
  service_class_prices: [],
  employees: [],
  workspaces: [],
  schedules: [],
  bookings: [],
  order_items: [],
  materials: [],
  inventory_movements: [],
  material_recipes: [],
  reviews: [],
  settings: {
    business_name: 'Detail Pro Astana',
    work_start: '09:00',
    work_end: '20:00',
    slot_minutes: 60,
    work_days: [1, 2, 3, 4, 5, 6], // Mon-Sat
    timezone: 'Asia/Almaty',
    currency: 'KZT',
    booking_lead_hours: 2,
    cancel_hours: 24,
    twogis_url: '', // ссылка на карточку в 2ГИС, например https://2gis.kz/astana/firm/XXXXXXXX
  },
  meta: { version: 1, updated_at: null },
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readDb() {
  ensureDir()
  if (!fs.existsSync(DB_FILE)) {
    writeDb(DEFAULT_DB)
    return structuredClone(DEFAULT_DB)
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8')
  return JSON.parse(raw)
}

function writeDb(db) {
  ensureDir()
  db.meta = db.meta || {}
  db.meta.updated_at = new Date().toISOString()
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8')
  fs.renameSync(tmp, DB_FILE)
}

/** Run a mutation with exclusive-ish access (single process). */
export function withDb(mutator) {
  const db = readDb()
  const result = mutator(db)
  writeDb(db)
  return result
}

export function getDb() {
  return readDb()
}

export function generateId(prefix = '') {
  return prefix + randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()
}

export function generateOrderNumber() {
  const d = new Date()
  const y = d.getFullYear().toString().slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rnd = Math.floor(Math.random() * 9000) + 1000
  return `DP${y}${m}${day}-${rnd}`
}

/** Seed initial data if empty */
export async function seedIfEmpty() {
  const db = readDb()
  if (db.users.length > 0) return { seeded: false }

  const passwordHash = await bcrypt.hash('admin123', 10)
  const ownerId = generateId('USR')

  db.users.push({
    id: ownerId,
    email: 'admin@detailpro.kz',
    phone: '+77001234567',
    password_hash: passwordHash,
    name: 'Владелец',
    role: 'owner',
    created_at: new Date().toISOString(),
    active: true,
  })

  // Demo client
  const clientHash = await bcrypt.hash('client123', 10)
  const clientId = generateId('USR')
  db.users.push({
    id: clientId,
    email: 'client@example.com',
    phone: '+77009876543',
    password_hash: clientHash,
    name: 'Тестовый Клиент',
    role: 'client',
    created_at: new Date().toISOString(),
    active: true,
  })

  db.car_classes = [
    { id: 'CLS_COMPACT', name: 'Компактный', coefficient: 1.0 },
    { id: 'CLS_SEDAN', name: 'Седан', coefficient: 1.1 },
    { id: 'CLS_CROSSOVER', name: 'Кроссовер', coefficient: 1.25 },
    { id: 'CLS_SUV', name: 'Внедорожник', coefficient: 1.4 },
    { id: 'CLS_PREMIUM', name: 'Премиум / Спорт', coefficient: 1.6 },
  ]

  const services = [
    { id: 'SRV_POLISH', name: 'Полировка кузова', description: 'Устраняем мелкие царапины, возвращаем блеск и глубину цвета.', base_price: 25000, duration_min: 180, category: 'body', active: true, image: '/images/IMG_7542.jpg' },
    { id: 'SRV_CERAMIC', name: 'Керамическое покрытие', description: 'Защита лакокрасочного покрытия на длительный срок.', base_price: 60000, duration_min: 300, category: 'body', active: true, image: '/images/IMG_7543.jpg' },
    { id: 'SRV_CLEAN', name: 'Химчистка салона', description: 'Удаляем загрязнения, неприятные запахи и восстанавливаем свежесть.', base_price: 20000, duration_min: 240, category: 'interior', active: true, image: '/images/IMG_7544.jpg' },
    { id: 'SRV_ENGINE', name: 'Мойка подкапотного пространства', description: 'Чистота и порядок в самых важных местах двигателя.', base_price: 15000, duration_min: 60, category: 'engine', active: true, image: '/images/IMG_7546.jpg' },
    { id: 'SRV_WASH', name: 'Детейлинг-мойка', description: 'Глубокая мойка кузова с использованием профессиональной химии.', base_price: 8000, duration_min: 90, category: 'wash', active: true, image: '/images/IMG_7541.jpg' },
    { id: 'SRV_LEATHER', name: 'Уход за кожей', description: 'Очистка и защита кожаного салона.', base_price: 18000, duration_min: 120, category: 'interior', active: true, image: '/images/IMG_7545.jpg' },
    { id: 'SRV_WHEELS', name: 'Очистка и обработка дисков', description: 'Восстановление внешнего вида дисков.', base_price: 12000, duration_min: 90, category: 'wheels', active: true, image: '/images/IMG_7546.jpg' },
    { id: 'SRV_LIGHTS', name: 'Полировка фар', description: 'Возвращаем прозрачность и яркость света.', base_price: 10000, duration_min: 60, category: 'body', active: true, image: '/images/IMG_7547.jpg' },
  ]
  db.services = services

  // Class coefficients already in car_classes; base_price * coefficient
  db.service_class_prices = []

  db.employees = [
    {
      id: 'EMP_001',
      user_id: null,
      name: 'Айдар Нурланов',
      phone: '+77001112233',
      specialization: ['body', 'wash'],
      services: ['SRV_POLISH', 'SRV_CERAMIC', 'SRV_WASH', 'SRV_LIGHTS'],
      active: true,
      work_start: '09:00',
      work_end: '18:00',
      days_off: [],
    },
    {
      id: 'EMP_002',
      user_id: null,
      name: 'Ерлан Сатыбалдиев',
      phone: '+77004445566',
      specialization: ['interior'],
      services: ['SRV_CLEAN', 'SRV_LEATHER'],
      active: true,
      work_start: '10:00',
      work_end: '19:00',
      days_off: [],
    },
  ]

  db.workspaces = [
    { id: 'WS_01', name: 'Пост 1 (кузов)', type: 'body', active: true },
    { id: 'WS_02', name: 'Пост 2 (салон)', type: 'interior', active: true },
    { id: 'WS_03', name: 'Пост 3 (универсальный)', type: 'universal', active: true },
  ]

  db.materials = [
    { id: 'MAT_SHAMPOO', name: 'Автошампунь', category: 'wash', unit: 'л', stock: 25, min_stock: 5, cost: 2500, supplier: 'Koch Chemie' },
    { id: 'MAT_CLEANER', name: 'Очиститель салона', category: 'interior', unit: 'л', stock: 12, min_stock: 3, cost: 4200, supplier: 'Koch Chemie' },
    { id: 'MAT_LEATHER', name: 'Средство для кожи', category: 'interior', unit: 'л', stock: 8, min_stock: 2, cost: 5500, supplier: 'Colourlock' },
    { id: 'MAT_PASTE', name: 'Полировальная паста', category: 'body', unit: 'кг', stock: 6, min_stock: 1, cost: 12000, supplier: 'Rupes' },
    { id: 'MAT_CERAMIC', name: 'Керамический состав', category: 'body', unit: 'мл', stock: 500, min_stock: 100, cost: 45, supplier: 'Gtechniq' },
    { id: 'MAT_MICRO', name: 'Микрофибра', category: 'consumable', unit: 'шт', stock: 80, min_stock: 20, cost: 350, supplier: '' },
  ]

  db.material_recipes = [
    { service_id: 'SRV_WASH', material_id: 'MAT_SHAMPOO', qty: 0.3 },
    { service_id: 'SRV_WASH', material_id: 'MAT_MICRO', qty: 2 },
    { service_id: 'SRV_POLISH', material_id: 'MAT_PASTE', qty: 0.15 },
    { service_id: 'SRV_POLISH', material_id: 'MAT_MICRO', qty: 4 },
    { service_id: 'SRV_CERAMIC', material_id: 'MAT_CERAMIC', qty: 30 },
    { service_id: 'SRV_CLEAN', material_id: 'MAT_CLEANER', qty: 0.5 },
    { service_id: 'SRV_LEATHER', material_id: 'MAT_LEATHER', qty: 0.2 },
  ]

  // Demo reviews (not linked to bookings — for homepage seed)
  db.reviews = [
    {
      id: generateId('REV'),
      booking_id: null,
      user_id: null,
      name: 'Алексей Петров',
      car: 'BMW 5 Series',
      text: 'Отличный сервис! Сделали полировку на высшем уровне. Машина выглядит как новая. Рекомендую!',
      rating: 5,
      published: true,
      created_at: new Date().toISOString(),
    },
    {
      id: generateId('REV'),
      booking_id: null,
      user_id: null,
      name: 'Дамир Султанов',
      car: 'Mercedes-Benz E-Class',
      text: 'Профессиональный подход, большой опыт и знание. Теперь только к вам!',
      rating: 5,
      published: true,
      created_at: new Date().toISOString(),
    },
    {
      id: generateId('REV'),
      booking_id: null,
      user_id: null,
      name: 'Ержан Кайратов',
      car: 'Audi Q7',
      text: 'Очень доволен результатом. Качественная работа, вежливый персонал. Спасибо!',
      rating: 5,
      published: true,
      created_at: new Date().toISOString(),
    },
  ]

  writeDb(db)
  return { seeded: true, admin: 'admin@detailpro.kz / admin123', client: 'client@example.com / client123' }
}

export default { getDb, withDb, generateId, generateOrderNumber, seedIfEmpty }
