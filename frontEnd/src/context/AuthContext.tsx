/* ======================================================
   TelcoGuard – Auth Context Provider
   React context for auth state management
   ====================================================== */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiLogin, apiGetMe, apiLogout, type LoginResponse } from '../services/api'
import {
  getAccessToken, setTokens, clearTokens,
  getStoredUser, setStoredUser, type StoredUser
} from '../services/auth'
import { wsService } from '../services/websocket'

interface AuthContextType {
  user: StoredUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(getStoredUser())
  const [isLoading, setIsLoading] = useState(true)

  /* Check if existing token is valid */
  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    apiGetMe()
      .then((me) => {
        const u: StoredUser = { id: me.id, name: me.name, email: me.email, role: me.role }
        setUser(u)
        setStoredUser(u)
      })
      .catch(() => {
        clearTokens()
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res: LoginResponse = await apiLogin(email, password)
    setTokens(res.access_token, res.refresh_token)
    const u: StoredUser = {
      id: (res.user as unknown as { id: number }).id,
      name: res.user.name,
      email: (res.user as unknown as { email: string }).email,
      role: (res.user as unknown as { role: string }).role,
    }
    setUser(u)
    setStoredUser(u)
  }, [])

  const logout = useCallback(() => {
    apiLogout().catch(() => {})
    wsService.disconnect()
    clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
