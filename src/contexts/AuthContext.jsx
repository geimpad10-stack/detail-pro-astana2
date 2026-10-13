import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, setToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const token = localStorage.getItem('dp_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { user } = await api.me()
      setUser(user)
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const login = async (email, password) => {
    const data = await api.login({ email, password })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const data = await api.register(payload)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const isAdmin = user && ['owner', 'admin'].includes(user.role)
  const isStaff = user && ['owner', 'admin', 'staff'].includes(user.role)

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isStaff, reload: load }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
