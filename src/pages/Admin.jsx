import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Package, Users, Wrench, Settings,
  LogOut, TrendingUp, AlertTriangle, Plus, Pencil, X, UserCircle
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

const STATUS_LABELS = {
  new: 'Новая', confirmed: 'Подтверждена', in_progress: 'В работе',
  ready: 'Готова', delivered: 'Выдана', cancelled: 'Отменена',
}

const NAV = [
  { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
  { id: 'bookings', label: 'Заказы', icon: Calendar },
  { id: 'services', label: 'Услуги', icon: Wrench },
  { id: 'employees', label: 'Сотрудники', icon: Users },
  { id: 'materials', label: 'Склад', icon: Package },
  { id: 'clients', label: 'Клиенты', icon: UserCircle },
  { id: 'analytics', label: 'Аналитика', icon: TrendingUp },
  { id: 'settings', label: 'Настройки', icon: Settings },
]

const emptyService = { name: '', description: '', base_price: '', duration_min: 60, category: 'body', active: true }
const emptyEmployee = { name: '', phone: '', work_start: '09:00', work_end: '18:00', active: true, specialization: [] }
const emptyMaterial = { name: '', category: 'other', unit: 'шт', stock: 0, min_stock: 0, cost: 0, supplier: '' }

export default function Admin() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [dash, setDash] = useState(null)
  const [bookings, setBookings] = useState([])
  const [services, setServices] = useState([])
  const [employees, setEmployees] = useState([])
  const [materials, setMaterials] = useState([])
  const [movements, setMovements] = useState([])
  const [clients, setClients] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [settings, setSettings] = useState(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // forms
  const [serviceForm, setServiceForm] = useState(null) // null | 'new' | service obj
  const [empForm, setEmpForm] = useState(null)
  const [matForm, setMatForm] = useState(null)
  const [movForm, setMovForm] = useState(null) // { material_id, type, qty, reason }

  const flash = (text, isErr = false) => {
    if (isErr) { setErr(text); setMsg('') } else { setMsg(text); setErr('') }
    setTimeout(() => { setMsg(''); setErr('') }, 2500)
  }

  const loadTab = (t = tab) => {
    if (!isAdmin) return
    if (t === 'dashboard') api.dashboard().then(setDash).catch(() => {})
    if (t === 'bookings') api.adminBookings().then(d => setBookings(d.bookings || [])).catch(() => {})
    if (t === 'services') api.getServices(true).then(d => setServices(d.services || [])).catch(() => {})
    if (t === 'employees') api.employees().then(d => setEmployees(d.employees || [])).catch(() => {})
    if (t === 'materials') api.materials().then(d => { setMaterials(d.materials || []); setMovements(d.movements || []) }).catch(() => {})
    if (t === 'clients') api.clients().then(d => setClients(d.clients || [])).catch(() => {})
    if (t === 'analytics') api.analytics().then(setAnalytics).catch(() => {})
    if (t === 'settings') api.settings().then(d => setSettings(d.settings)).catch(() => {})
  }

  useEffect(() => { loadTab() }, [tab, isAdmin])

  if (authLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка...</div>
  if (!user) return <Navigate to="/login" state={{ from: '/admin' }} replace />
  if (!isAdmin) return <Navigate to="/account" replace />

  const updateStatus = async (id, status) => {
    try {
      await api.updateBooking(id, { status })
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
      flash('Статус обновлён')
    } catch (e) {
      flash(e.message, true)
    }
  }

  const saveSettings = async () => {
    try {
      await api.updateSettings(settings)
      flash('Настройки сохранены')
    } catch (e) {
      flash(e.message, true)
    }
  }

  // —— Services CRUD ——
  const saveService = async () => {
    const f = serviceForm
    if (!f.name || f.base_price === '' || f.base_price == null) {
      flash('Укажите название и цену', true)
      return
    }
    try {
      const body = {
        name: f.name,
        description: f.description || '',
        base_price: Number(f.base_price),
        duration_min: Number(f.duration_min) || 60,
        category: f.category || 'body',
        active: f.active !== false,
      }
      if (f.id) {
        await api.updateService(f.id, body)
        flash('Услуга обновлена')
      } else {
        await api.createService(body)
        flash('Услуга добавлена')
      }
      setServiceForm(null)
      loadTab('services')
    } catch (e) {
      flash(e.message, true)
    }
  }

  // —— Employees CRUD ——
  const saveEmployee = async () => {
    const f = empForm
    if (!f.name) {
      flash('Укажите имя', true)
      return
    }
    try {
      const body = {
        name: f.name,
        phone: f.phone || null,
        work_start: f.work_start || '09:00',
        work_end: f.work_end || '18:00',
        active: f.active !== false,
        specialization: f.specialization || [],
      }
      if (f.id) {
        await api.updateEmployee(f.id, body)
        flash('Сотрудник обновлён')
      } else {
        await api.createEmployee(body)
        flash('Сотрудник добавлен')
      }
      setEmpForm(null)
      loadTab('employees')
    } catch (e) {
      flash(e.message, true)
    }
  }

  // —— Materials ——
  const saveMaterial = async () => {
    const f = matForm
    if (!f.name) {
      flash('Укажите название', true)
      return
    }
    try {
      await api.createMaterial({
        name: f.name,
        category: f.category || 'other',
        unit: f.unit || 'шт',
        stock: Number(f.stock) || 0,
        min_stock: Number(f.min_stock) || 0,
        cost: Number(f.cost) || 0,
        supplier: f.supplier || '',
      })
      flash('Материал добавлен')
      setMatForm(null)
      loadTab('materials')
    } catch (e) {
      flash(e.message, true)
    }
  }

  const saveMovement = async () => {
    const f = movForm
    if (!f?.material_id || !f.qty) {
      flash('Укажите количество', true)
      return
    }
    try {
      await api.materialMovement(f.material_id, {
        type: f.type || 'income',
        qty: Number(f.qty),
        reason: f.reason || '',
      })
      flash('Движение записано')
      setMovForm(null)
      loadTab('materials')
    } catch (e) {
      flash(e.message, true)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#fff',
    fontSize: 14, marginBottom: 10,
  }
  const labelStyle = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: '#080808', padding: '20px 12px', display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }} className="admin-sidebar">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, padding: '0 8px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #A7FF36, #6bc41a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 11, color: '#0a0a0a',
          }}>DP</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>DETAIL PRO</div>
            <div style={{ fontSize: 10, color: 'var(--accent)' }}>ADMIN</div>
          </div>
        </Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => { setTab(n.id); setServiceForm(null); setEmpForm(null); setMatForm(null); setMovForm(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, fontSize: 14, textAlign: 'left',
                background: tab === n.id ? 'rgba(167,255,54,0.12)' : 'transparent',
                color: tab === n.id ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: tab === n.id ? 600 : 400,
              }}
            >
              <n.icon size={18} /> {n.label}
            </button>
          ))}
        </nav>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
          <LogOut size={16} /> Выйти
        </button>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: '24px 28px', overflow: 'auto' }}>
        {msg && <div style={{ background: 'rgba(167,255,54,0.15)', color: 'var(--accent)', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{msg}</div>}
        {err && <div style={{ background: 'rgba(255,80,80,0.15)', color: '#ff6b6b', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{err}</div>}

        {/* DASHBOARD */}
        {tab === 'dashboard' && dash && (
          <div>
            <h1 style={{ fontSize: 24, marginBottom: 24 }}>Панель управления</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
              {[
                { label: 'Сегодня', value: dash.today_count },
                { label: 'В работе', value: dash.in_progress },
                { label: 'Завершено', value: dash.completed },
                { label: 'Отменено', value: dash.cancelled },
                { label: 'Выручка', value: (dash.revenue || 0).toLocaleString() + ' ₸' },
              ].map((c, i) => (
                <div key={i} className="card" style={{ padding: 18 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{c.value}</div>
                </div>
              ))}
            </div>
            {dash.low_stock?.length > 0 && (
              <div className="card" style={{ padding: 16, marginBottom: 20, borderColor: 'rgba(255,180,50,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#ffb84d' }}>
                  <AlertTriangle size={18} /> Низкий остаток материалов
                </div>
                {dash.low_stock.map(m => (
                  <div key={m.id} style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.name}: {m.stock} {m.unit} (мин. {m.min_stock})</div>
                ))}
              </div>
            )}
            {dash.popular_services?.length > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Популярные услуги</div>
                {dash.popular_services.map(s => (
                  <div key={s.service_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span>{s.name}</span><span style={{ color: 'var(--text-muted)' }}>{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS */}
        {tab === 'bookings' && (
          <div>
            <h1 style={{ fontSize: 24, marginBottom: 20 }}>Заказы</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bookings.map(b => (
                <div key={b.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong>{b.order_number}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 10, fontSize: 13 }}>{b.date} {b.time}</span>
                    </div>
                    <select
                      value={b.status}
                      onChange={e => updateStatus(b.id, e.target.value)}
                      style={{ background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', fontSize: 13 }}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6, color: 'var(--text-muted)' }}>
                    {b.client_name} · {b.client_phone} · {(b.total || 0).toLocaleString()} ₸
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {(b.items || []).map(i => i.name).join(', ')}
                  </div>
                </div>
              ))}
              {bookings.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Нет заказов</div>}
            </div>
          </div>
        )}

        {/* SERVICES */}
        {tab === 'services' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h1 style={{ fontSize: 24, margin: 0 }}>Услуги и тарифы</h1>
              {!serviceForm && (
                <button className="btn btn-primary" onClick={() => setServiceForm({ ...emptyService })} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={16} /> Добавить
                </button>
              )}
            </div>

            {serviceForm && (
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <strong>{serviceForm.id ? 'Редактировать услугу' : 'Новая услуга'}</strong>
                  <button onClick={() => setServiceForm(null)} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
                </div>
                <label style={labelStyle}>Название *</label>
                <input style={inputStyle} value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
                <label style={labelStyle}>Описание</label>
                <input style={inputStyle} value={serviceForm.description || ''} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Цена (₸) *</label>
                    <input style={inputStyle} type="number" value={serviceForm.base_price} onChange={e => setServiceForm({ ...serviceForm, base_price: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Длительность (мин)</label>
                    <input style={inputStyle} type="number" value={serviceForm.duration_min} onChange={e => setServiceForm({ ...serviceForm, duration_min: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Категория</label>
                    <select style={inputStyle} value={serviceForm.category || 'body'} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}>
                      <option value="body">Кузов</option>
                      <option value="interior">Салон</option>
                      <option value="wash">Мойка</option>
                      <option value="engine">Двигатель</option>
                      <option value="wheels">Диски</option>
                      <option value="other">Другое</option>
                    </select>
                  </div>
                </div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={serviceForm.active !== false} onChange={e => setServiceForm({ ...serviceForm, active: e.target.checked })} />
                  Активна
                </label>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={saveService}>Сохранить</button>
                  <button className="btn" onClick={() => setServiceForm(null)}>Отмена</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {services.map(s => (
                <div key={s.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {s.duration_min} мин · {s.base_price?.toLocaleString()} ₸ · {s.category} · {s.active ? 'активна' : 'выкл'}
                    </div>
                  </div>
                  <button
                    onClick={() => setServiceForm({ ...s })}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontSize: 13 }}
                  >
                    <Pencil size={14} /> Изменить
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMPLOYEES */}
        {tab === 'employees' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h1 style={{ fontSize: 24, margin: 0 }}>Сотрудники</h1>
              {!empForm && (
                <button className="btn btn-primary" onClick={() => setEmpForm({ ...emptyEmployee })} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={16} /> Добавить
                </button>
              )}
            </div>

            {empForm && (
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <strong>{empForm.id ? 'Редактировать' : 'Новый сотрудник'}</strong>
                  <button onClick={() => setEmpForm(null)} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
                </div>
                <label style={labelStyle}>Имя *</label>
                <input style={inputStyle} value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} />
                <label style={labelStyle}>Телефон</label>
                <input style={inputStyle} value={empForm.phone || ''} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Начало смены</label>
                    <input style={inputStyle} type="time" value={empForm.work_start || '09:00'} onChange={e => setEmpForm({ ...empForm, work_start: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Конец смены</label>
                    <input style={inputStyle} type="time" value={empForm.work_end || '18:00'} onChange={e => setEmpForm({ ...empForm, work_end: e.target.value })} />
                  </div>
                </div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={empForm.active !== false} onChange={e => setEmpForm({ ...empForm, active: e.target.checked })} />
                  Активен
                </label>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={saveEmployee}>Сохранить</button>
                  <button className="btn" onClick={() => setEmpForm(null)}>Отмена</button>
                </div>
              </div>
            )}

            {employees.map(e => (
              <div key={e.id} className="card" style={{ padding: 16, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {e.phone || '—'} · {e.work_start}–{e.work_end} · {e.active ? 'активен' : 'отключён'}
                  </div>
                </div>
                <button
                  onClick={() => setEmpForm({ ...e })}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontSize: 13 }}
                >
                  <Pencil size={14} /> Изменить
                </button>
              </div>
            ))}
          </div>
        )}

        {/* MATERIALS */}
        {tab === 'materials' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <h1 style={{ fontSize: 24, margin: 0 }}>Склад</h1>
              <div style={{ display: 'flex', gap: 8 }}>
                {!matForm && !movForm && (
                  <>
                    <button className="btn" onClick={() => setMovForm({ material_id: materials[0]?.id || '', type: 'income', qty: '', reason: '' })} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Движение
                    </button>
                    <button className="btn btn-primary" onClick={() => setMatForm({ ...emptyMaterial })} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={16} /> Материал
                    </button>
                  </>
                )}
              </div>
            </div>

            {matForm && (
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <strong>Новый материал</strong>
                  <button onClick={() => setMatForm(null)} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
                </div>
                <label style={labelStyle}>Название *</label>
                <input style={inputStyle} value={matForm.name} onChange={e => setMatForm({ ...matForm, name: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Ед. изм.</label>
                    <input style={inputStyle} value={matForm.unit} onChange={e => setMatForm({ ...matForm, unit: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Остаток</label>
                    <input style={inputStyle} type="number" value={matForm.stock} onChange={e => setMatForm({ ...matForm, stock: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Мин. остаток</label>
                    <input style={inputStyle} type="number" value={matForm.min_stock} onChange={e => setMatForm({ ...matForm, min_stock: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Себестоимость</label>
                    <input style={inputStyle} type="number" value={matForm.cost} onChange={e => setMatForm({ ...matForm, cost: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Поставщик</label>
                    <input style={inputStyle} value={matForm.supplier || ''} onChange={e => setMatForm({ ...matForm, supplier: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={saveMaterial}>Сохранить</button>
                  <button className="btn" onClick={() => setMatForm(null)}>Отмена</button>
                </div>
              </div>
            )}

            {movForm && (
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <strong>Движение склада</strong>
                  <button onClick={() => setMovForm(null)} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
                </div>
                <label style={labelStyle}>Материал</label>
                <select style={inputStyle} value={movForm.material_id} onChange={e => setMovForm({ ...movForm, material_id: e.target.value })}>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>)}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Тип</label>
                    <select style={inputStyle} value={movForm.type} onChange={e => setMovForm({ ...movForm, type: e.target.value })}>
                      <option value="income">Приход</option>
                      <option value="write_off">Списание</option>
                      <option value="adjustment">Корректировка (установить остаток)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Количество</label>
                    <input style={inputStyle} type="number" value={movForm.qty} onChange={e => setMovForm({ ...movForm, qty: e.target.value })} />
                  </div>
                </div>
                <label style={labelStyle}>Причина / комментарий</label>
                <input style={inputStyle} value={movForm.reason || ''} onChange={e => setMovForm({ ...movForm, reason: e.target.value })} />
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={saveMovement}>Записать</button>
                  <button className="btn" onClick={() => setMovForm(null)}>Отмена</button>
                </div>
              </div>
            )}

            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: 10 }}>Материал</th>
                    <th style={{ padding: 10 }}>Остаток</th>
                    <th style={{ padding: 10 }}>Мин.</th>
                    <th style={{ padding: 10 }}>Ед.</th>
                    <th style={{ padding: 10 }}>Поставщик</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 10 }}>{m.name}</td>
                      <td style={{ padding: 10, color: m.stock <= m.min_stock ? '#ffb84d' : undefined }}>{m.stock}</td>
                      <td style={{ padding: 10 }}>{m.min_stock}</td>
                      <td style={{ padding: 10 }}>{m.unit}</td>
                      <td style={{ padding: 10, color: 'var(--text-muted)' }}>{m.supplier || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {movements.length > 0 && (
              <div>
                <h2 style={{ fontSize: 16, marginBottom: 12 }}>Последние движения</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {movements.slice(0, 15).map(mv => {
                    const mat = materials.find(m => m.id === mv.material_id)
                    const typeLabel = { income: 'Приход', write_off: 'Списание', adjustment: 'Корректировка' }[mv.type] || mv.type
                    return (
                      <div key={mv.id} style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>{new Date(mv.at).toLocaleString('ru-RU')}</span>
                        <span style={{ color: '#fff' }}>{mat?.name || mv.material_id}</span>
                        <span>{typeLabel}: {mv.qty}</span>
                        {mv.reason && <span>· {mv.reason}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CLIENTS */}
        {tab === 'clients' && (
          <div>
            <h1 style={{ fontSize: 24, marginBottom: 20 }}>Клиенты</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clients.map((c, i) => (
                <div key={c.id || c.phone || i} className="card" style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600 }}>{c.name || 'Без имени'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    {c.phone || '—'} · {c.email || '—'}
                    {c.from_booking && <span style={{ marginLeft: 8, color: '#ffb84d' }}>без аккаунта</span>}
                  </div>
                </div>
              ))}
              {clients.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Пока нет клиентов</div>}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {tab === 'analytics' && analytics && (
          <div>
            <h1 style={{ fontSize: 24, marginBottom: 20 }}>Аналитика</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Заказов</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{analytics.orders_count}</div>
              </div>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Выручка</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{(analytics.revenue || 0).toLocaleString()} ₸</div>
              </div>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Средний чек</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{(analytics.average_check || 0).toLocaleString()} ₸</div>
              </div>
            </div>
            {analytics.by_service?.length > 0 && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>По услугам</div>
                {analytics.by_service.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span>{s.name}</span>
                    <span>{s.count} · {s.revenue.toLocaleString()} ₸</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && settings && (
          <div>
            <h1 style={{ fontSize: 24, marginBottom: 20 }}>Настройки бизнеса</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Название</label>
              <input className="input" value={settings.business_name || ''} onChange={e => setSettings({ ...settings, business_name: e.target.value })} />
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Начало работы</label>
              <input className="input" value={settings.work_start || ''} onChange={e => setSettings({ ...settings, work_start: e.target.value })} />
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Конец работы</label>
              <input className="input" value={settings.work_end || ''} onChange={e => setSettings({ ...settings, work_end: e.target.value })} />
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Шаг слота (мин)</label>
              <input className="input" type="number" value={settings.slot_minutes || 60} onChange={e => setSettings({ ...settings, slot_minutes: Number(e.target.value) })} />
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Запись заранее (часов)</label>
              <input className="input" type="number" value={settings.booking_lead_hours ?? 2} onChange={e => setSettings({ ...settings, booking_lead_hours: Number(e.target.value) })} />
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Отмена за (часов)</label>
              <input className="input" type="number" value={settings.cancel_hours ?? 24} onChange={e => setSettings({ ...settings, cancel_hours: Number(e.target.value) })} />
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ссылка на карточку 2ГИС</label>
              <input
                className="input"
                placeholder="https://2gis.kz/astana/firm/XXXXXXXX"
                value={settings.twogis_url || ''}
                onChange={e => setSettings({ ...settings, twogis_url: e.target.value })}
              />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                После отзыва на сайте клиенту покажется кнопка «Оставить отзыв в 2ГИС»
              </p>
              <button className="btn btn-primary" onClick={saveSettings} style={{ marginTop: 8 }}>Сохранить</button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar { display: none; }
        }
      `}</style>
    </div>
  )
}
