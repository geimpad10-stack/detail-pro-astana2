import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/account'

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register({ email, password, name, phone })
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ width: '100%', maxWidth: 420, padding: 32 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #A7FF36, #6bc41a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: '#0a0a0a',
          }}>DP</div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            {mode === 'login' ? 'Войдите в личный кабинет' : 'Создайте аккаунт клиента'}
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <>
              <input className="input" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} required />
              <input className="input" placeholder="Телефон +7..." value={phone} onChange={e => setPhone(e.target.value)} />
            </>
          )}
          <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />

          {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>Нет аккаунта? <button type="button" onClick={() => setMode('register')} style={{ color: 'var(--accent)' }}>Регистрация</button></>
          ) : (
            <>Уже есть аккаунт? <button type="button" onClick={() => setMode('login')} style={{ color: 'var(--accent)' }}>Войти</button></>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/" style={{ fontSize: 13, color: 'var(--text-muted)' }}>← На главную</Link>
        </div>
      </motion.div>
    </div>
  )
}
