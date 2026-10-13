import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, LogOut, Calendar, Car, Star } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

const STATUS_LABELS = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  in_progress: 'В работе',
  ready: 'Готова',
  delivered: 'Выдана',
  cancelled: 'Отменена',
}

const STATUS_COLORS = {
  new: '#5b9dff',
  confirmed: '#A7FF36',
  in_progress: '#ffb84d',
  ready: '#4ade80',
  delivered: '#94a3b8',
  cancelled: '#ff6b6b',
}

export default function Account() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewFor, setReviewFor] = useState(null)
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [hoverStar, setHoverStar] = useState(0)
  const [saving, setSaving] = useState(false)
  const [reviewMsg, setReviewMsg] = useState('')
  const [reviewDone, setReviewDone] = useState(false)
  const [twogisUrl, setTwogisUrl] = useState('')

  useEffect(() => {
    if (!user) return
    api.myBookings()
      .then(d => setBookings(d.bookings || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
    api.publicSettings()
      .then(d => setTwogisUrl(d.twogis_url || ''))
      .catch(() => {})
  }, [user])

  if (authLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>
  if (!user) return <Navigate to="/login" state={{ from: '/account' }} replace />

  const cancel = async (id) => {
    if (!confirm('Отменить запись?')) return
    try {
      await api.cancelBooking(id)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
    } catch (e) {
      alert(e.message)
    }
  }

  const openReview = (b) => {
    setReviewFor(b.id)
    setRating(5)
    setText('')
    setHoverStar(0)
    setReviewMsg('')
    setReviewDone(false)
  }

  const submitReview = async () => {
    if (!reviewFor) return
    setSaving(true)
    setReviewMsg('')
    try {
      await api.submitReview(reviewFor, { rating, text })
      setBookings(prev => prev.map(b => b.id === reviewFor ? { ...b, review_id: 'ok' } : b))
      setReviewMsg('Спасибо за отзыв!')
      setReviewDone(true)
    } catch (e) {
      setReviewMsg(e.message || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 60 }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)', padding: '14px 0',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 14 }}>
            <ChevronLeft size={18} /> На главную
          </Link>
          <div style={{ fontWeight: 600 }}>Личный кабинет</div>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 13 }}>
            <LogOut size={16} /> Выйти
          </button>
        </div>
      </header>

      <div className="container" style={{ maxWidth: 720, paddingTop: 28 }}>
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{user.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{user.email}</div>
          {user.phone && <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{user.phone}</div>}
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/booking" className="btn btn-primary" style={{ padding: '10px 18px', fontSize: 13 }}>Новая запись</Link>
            {isAdmin && <Link to="/admin" className="btn btn-outline" style={{ padding: '10px 18px', fontSize: 13 }}>Админ-панель</Link>}
          </div>
        </div>

        <h2 style={{ fontSize: 18, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} color="var(--accent)" /> Мои заказы
        </h2>

        {loading && <div style={{ color: 'var(--text-muted)' }}>Загрузка заказов...</div>}
        {error && <div style={{ color: '#ff6b6b' }}>{error}</div>}
        {!loading && bookings.length === 0 && (
          <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            Пока нет заказов. <Link to="/booking" style={{ color: 'var(--accent)' }}>Записаться</Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map(b => (
            <motion.div key={b.id} className="card" style={{ padding: 18 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{b.order_number}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {b.date} в {b.time} · {b.duration_min} мин
                  </div>
                  {(b.car_brand || b.car_model) && (
                    <div style={{ fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Car size={14} /> {b.car_brand} {b.car_model}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                  background: (STATUS_COLORS[b.status] || '#666') + '22',
                  color: STATUS_COLORS[b.status] || '#aaa',
                }}>
                  {STATUS_LABELS[b.status] || b.status}
                </span>
              </div>
              <div style={{ marginTop: 10, fontSize: 13 }}>
                {(b.items || []).map((it, i) => (
                  <div key={i} style={{ color: 'var(--text-muted)' }}>{it.name} — {it.price?.toLocaleString()} ₸</div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{(b.total || 0).toLocaleString()} ₸</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {['new', 'confirmed'].includes(b.status) && (
                    <button onClick={() => cancel(b.id)} style={{ fontSize: 13, color: '#ff6b6b' }}>Отменить</button>
                  )}
                  {['ready', 'delivered'].includes(b.status) && !b.review_id && (
                    <button
                      onClick={() => openReview(b)}
                      style={{ fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Star size={14} /> Оставить отзыв
                    </button>
                  )}
                  {b.review_id && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={12} fill="var(--accent)" color="var(--accent)" /> Отзыв оставлен
                    </span>
                  )}
                </div>
              </div>

              {reviewFor === b.id && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  {reviewDone ? (
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)', marginBottom: 10 }}>
                        Спасибо за отзыв!
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                        Если удобно — оставьте такой же отзыв в 2ГИС. Это помогает другим клиентам выбрать сервис.
                      </p>
                      {twogisUrl ? (
                        <a
                          href={twogisUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 13, textDecoration: 'none' }}
                        >
                          Оставить отзыв в 2ГИС
                        </a>
                      ) : (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Ссылка на 2ГИС появится после настройки в админке.
                        </p>
                      )}
                      <button
                        className="btn"
                        onClick={() => { setReviewFor(null); setReviewDone(false) }}
                        style={{ display: 'block', marginTop: 12, padding: '8px 0', fontSize: 13, color: 'var(--text-muted)' }}
                      >
                        Закрыть
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Как вам визит?</div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            type="button"
                            onMouseEnter={() => setHoverStar(n)}
                            onMouseLeave={() => setHoverStar(0)}
                            onClick={() => setRating(n)}
                            style={{ background: 'none', padding: 2 }}
                          >
                            <Star
                              size={28}
                              fill={(hoverStar || rating) >= n ? 'var(--accent)' : 'transparent'}
                              color={(hoverStar || rating) >= n ? 'var(--accent)' : 'var(--text-muted)'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="input"
                        placeholder="Расскажите, что понравилось..."
                        value={text}
                        onChange={e => setText(e.target.value)}
                        rows={3}
                        style={{ resize: 'vertical', marginBottom: 10 }}
                      />
                      {reviewMsg && (
                        <div style={{
                          fontSize: 13, marginBottom: 8,
                          color: reviewMsg.includes('Спасибо') ? 'var(--accent)' : '#ff6b6b',
                        }}>
                          {reviewMsg}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-primary" onClick={submitReview} disabled={saving} style={{ padding: '10px 18px', fontSize: 13 }}>
                          {saving ? 'Отправка...' : 'Отправить отзыв'}
                        </button>
                        <button className="btn" onClick={() => setReviewFor(null)} style={{ padding: '10px 18px', fontSize: 13 }}>
                          Отмена
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
