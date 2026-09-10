import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ensureCsrf } from '../api/client'
import type { AuthUser } from '../types'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/me')
      setUser(data.data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    await ensureCsrf()
    const { data } = await api.post('/login', { email, password })
    setUser(data.data)
  }, [])

  const logout = useCallback(async () => {
    await ensureCsrf()
    await api.post('/logout')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
