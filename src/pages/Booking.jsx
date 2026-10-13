import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Calendar, Clock, Car, Check } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

const STEPS = ['Услуги', 'Автомобиль', 'Дата и время', 'Контакты', 'Готово']

export default function Booking() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [services, setServices] = useState([])
  const [carClasses, setCarClasses] = useState([])
  const [selected, setSelected] = useState([])
  const [carClassId, setCarClassId] = useState('')
  const [carBrand, setCarBrand] = useState('')
  const [carModel, setCarModel] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState([])
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [notes, setNotes] = useState('')
  const [calc, setCalc] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    api.getServices().then(d => {
      setServices(d.services)
      setCarClasses(d.car_classes)
      const pre = searchParams.get('services')
      if (pre) setSelected(pre.split(',').filter(Boolean))
    }).catch(() => {})
  }, [searchParams])

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setPhone(user.phone || '')
    }
  }, [user])

  useEffect(() => {
    if (selected.length && carClassId) {
      api.calculate({ service_ids: selected, car_class_id: carClassId })
        .then(setCalc)
        .catch(() => setCalc(null))
    } else setCalc(null)
  }, [selected, carClassId])

  useEffect(() => {
    if (date && calc?.duration_min) {
      api.getSlots({ date, duration_min: calc.duration_min })
        .then(d => setSlots(d.slots || []))
        .catch(() => setSlots([]))
      setTime('')
    }
  }, [date, calc?.duration_min])

  const toggleService = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await api.createBooking({
        service_ids: selected,
        car_class_id: carClassId,
        car_brand: carBrand,
        car_model: carModel,
        client_name: name,
        client_phone: phone,
        date,
        time,
        notes,
        user_id: user?.id || null,
      })
      setResult(data)
      setStep(4)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + (new Date().getHours() >= 18 ? 1 : 0))
  const minDateStr = minDate.toISOString().slice(0, 10)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 60 }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)', padding: '14px 0',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 14 }}>
            <ChevronLeft size={18} /> Назад
          </Link>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>Онлайн-запись</div>
          <div style={{ width: 60 }} />
        </div>
      </header>

      <div className="container" style={{ maxWidth: 640, paddingTop: 24 }}>
        {/* Steps */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              flex: 1, minWidth: 70, textAlign: 'center', padding: '8px 4px', borderRadius: 8, fontSize: 12,
              background: i === step ? 'var(--accent)' : i < step ? 'rgba(167,255,54,0.15)' : 'var(--bg-card)',
              color: i === step ? '#0a0a0a' : 'var(--text-muted)',
              fontWeight: i === step ? 700 : 500,
            }}>{s}</div>
          ))}
        </div>

        {error && <div style={{ background: 'rgba(255,80,80,0.12)', color: '#ff6b6b', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {/* Step 0: Services */}
        {step === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16, color: '#fff' }}>Выберите услуги</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {services.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className="card"
                  style={{
                    padding: 16, textAlign: 'left', display: 'flex', gap: 14, alignItems: 'center',
                    borderColor: selected.includes(s.id) ? 'var(--accent)' : 'var(--border)',
                    background: selected.includes(s.id) ? 'rgba(167,255,54,0.1)' : '#141414',
                    color: '#fff',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, border: '2px solid',
                    borderColor: selected.includes(s.id) ? 'var(--accent)' : '#444',
                    background: selected.includes(s.id) ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {selected.includes(s.id) && <Check size={14} color="#0a0a0a" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="booking-service-name" style={{ fontWeight: 600, color: '#fff' }}>{s.name}</div>
                    <div className="booking-service-meta" style={{ fontSize: 13, color: '#a0a0a0' }}>
                      {s.duration_min} мин · от {(s.base_price || 0).toLocaleString()} ₸
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 24 }}
              disabled={!selected.length}
              onClick={() => setStep(1)}
            >Далее</button>
          </motion.div>
        )}

        {/* Step 1: Car */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Автомобиль</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Класс автомобиля</label>
              <select className="input" value={carClassId} onChange={e => setCarClassId(e.target.value)} required>
                <option value="">Выберите класс</option>
                {carClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (×{c.coefficient})</option>
                ))}
              </select>
              <input className="input" placeholder="Марка (BMW, Mercedes...)" value={carBrand} onChange={e => setCarBrand(e.target.value)} />
              <input className="input" placeholder="Модель" value={carModel} onChange={e => setCarModel(e.target.value)} />
            </div>
            {calc && (
              <div className="card" style={{ padding: 16, marginTop: 20 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Предварительная стоимость</div>
                {calc.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span>{it.name}</span>
                    <span>{it.price.toLocaleString()} ₸</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Итого</span>
                  <span style={{ color: 'var(--accent)' }}>{calc.total.toLocaleString()} ₸</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>~{calc.duration_min} мин · цена предварительная</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-outline" onClick={() => setStep(0)}>Назад</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!carClassId} onClick={() => setStep(2)}>Далее</button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Дата и время</h2>
            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Дата</label>
            <input
              className="input"
              type="date"
              min={minDateStr}
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            {date && (
              <>
                <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Свободное время</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginTop: 8 }}>
                  {slots.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Нет свободных слотов</div>}
                  {slots.map(s => (
                    <button
                      key={s.time}
                      type="button"
                      disabled={!s.available}
                      onClick={() => setTime(s.time)}
                      style={{
                        padding: '10px 8px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                        background: time === s.time ? 'var(--accent)' : s.available ? 'var(--bg-card)' : '#1a1a1a',
                        color: time === s.time ? '#0a0a0a' : s.available ? '#fff' : '#555',
                        border: time === s.time ? 'none' : '1px solid var(--border)',
                        opacity: s.available ? 1 : 0.5,
                        cursor: s.available ? 'pointer' : 'not-allowed',
                      }}
                    >{s.time}</button>
                  ))}
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>Назад</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!date || !time} onClick={() => setStep(3)}>Далее</button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Contacts */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Контактные данные</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input" placeholder="Ваше имя" value={name} onChange={e => setName(e.target.value)} required />
              <input className="input" placeholder="Телефон +7..." value={phone} onChange={e => setPhone(e.target.value)} required />
              <textarea className="input" placeholder="Пожелания (необязательно)" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
            </div>
            {calc && (
              <div className="card" style={{ padding: 16, marginTop: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Итого к записи</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{date} в {time} · ~{calc.duration_min} мин</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', marginTop: 8 }}>{calc.total.toLocaleString()} ₸</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-outline" onClick={() => setStep(2)}>Назад</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!name || !phone || loading} onClick={submit}>
                {loading ? 'Создание...' : 'Подтвердить запись'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Done */}
        {step === 4 && result && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: 'rgba(167,255,54,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <Check size={32} color="var(--accent)" />
            </div>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>Запись создана!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Номер заказа</p>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', letterSpacing: 1, marginBottom: 24 }}>
              {result.booking.order_number}
            </div>
            <div className="card" style={{ padding: 20, textAlign: 'left', marginBottom: 24 }}>
              <div style={{ marginBottom: 8 }}><strong>Дата:</strong> {result.booking.date} в {result.booking.time}</div>
              <div style={{ marginBottom: 8 }}><strong>Сумма:</strong> {result.booking.total.toLocaleString()} ₸</div>
              <div style={{ marginBottom: 8 }}><strong>Статус:</strong> Новая</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>Мы свяжемся с вами для подтверждения. Сохраните номер заказа.</div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/" className="btn btn-outline">На главную</Link>
              <Link to="/account" className="btn btn-primary">Личный кабинет</Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
