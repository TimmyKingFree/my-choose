import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { 
  saveAuthData, 
  getAuthData, 
  removeAuthData, 
  isAuthDataValid,
  refreshAuthData,
  clearAllAuthStorage,
  type AuthData 
} from '../utils/secureStorage'
import { isTokenExpiringSoon, getUserFromToken } from '../utils/jwtUtils'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 首先尝试从Cookie恢复登录状态
        const authData = await getAuthData()
        if (authData && (await isAuthDataValid())) {
          console.log('从Cookie恢复登录状态')
          
          // 从JWT令牌中提取用户信息
          if (authData.jwtToken) {
            const userInfo = await getUserFromToken(authData.jwtToken)
            if (userInfo) {
              const mockUser = {
                id: userInfo.userId,
                email: userInfo.email,
                user_metadata: { name: userInfo.name || '' },
                app_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
              
              setUser(mockUser)
              setSession({
                user: mockUser,
                access_token: authData.jwtToken,
                refresh_token: '',
                expires_in: 3600,
                token_type: 'bearer'
              } as Session)
              setIsAuthenticated(true)
              
              // 刷新过期时间
              await refreshAuthData()
              
              // 设置自动刷新
              setupAutoRefresh()
              setLoading(false)
              return
            }
          }
        }

        // 如果Supabase未配置，直接设置为本地模式
        if (supabase === null) {
          setLoading(false)
          return
        }

        // 获取初始会话
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        setIsAuthenticated(!!session?.user)
        setLoading(false)

        // 监听认证状态变化
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session)
          setUser(session?.user ?? null)
          setIsAuthenticated(!!session?.user)
          setLoading(false)
        })

        return () => subscription.unsubscribe()
      } catch (error) {
        console.error('初始化认证失败:', error)
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    try {
      if (supabase === null) {
        // 本地模式：模拟成功注册
        const mockUser = {
          id: 'local-user-' + Date.now(),
          email,
          user_metadata: { name },
          created_at: new Date().toISOString(),
          app_metadata: {},
          aud: 'authenticated'
        } as unknown as User
        
        setUser(mockUser)
        setIsAuthenticated(true)
        
        // 注册成功后自动保存登录状态
        const authData: AuthData = {
          userId: mockUser.id,
          email: mockUser.email,
          name: name,
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天
        }
        await saveAuthData(authData)
        setupAutoRefresh()
        
        return { error: null }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })
      
      // 如果注册成功，保存登录状态
      if (!error && data.user) {
        const authData: AuthData = {
          userId: data.user.id,
          email: data.user.email || email,
          name: name,
          accessToken: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天
        }
        await saveAuthData(authData)
        setupAutoRefresh()
        setIsAuthenticated(true)
      }
      
      return { error }
    } catch (error) {
      console.error('注册失败:', error)
      return { error }
    }
  }

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      if (supabase === null) {
        // 本地模式：验证预设的用户账户
        const validUsers = [
          { email: 'admin@example.com', password: '123456', name: '管理员' },
          { email: 'user@example.com', password: 'password', name: '用户' },
          { email: 'test@test.com', password: 'test123', name: '测试用户' }
        ]
        
        const validUser = validUsers.find(u => u.email === email && u.password === password)
        
        if (!validUser) {
          return { 
            error: { 
              message: '邮箱或密码错误，请检查后重试',
              code: 'invalid_credentials'
            } 
          }
        }
        
        // 验证成功，创建用户会话
        const mockUser = {
          id: 'local-user-' + validUser.email.replace('@', '-').replace('.', '-'),
          email: validUser.email,
          user_metadata: { name: validUser.name },
          created_at: new Date().toISOString(),
          app_metadata: {},
          aud: 'authenticated'
        } as unknown as User
        
        setUser(mockUser)
        setIsAuthenticated(true)
        
        // 如果选择记住登录状态，保存到Cookie
        if (rememberMe) {
          const authData: AuthData = {
            userId: mockUser.id,
            email: mockUser.email,
            name: validUser.name,
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天
          }
          await saveAuthData(authData)
          setupAutoRefresh()
        }
        
        return { error: null }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      // 如果登录成功且选择记住登录状态
      if (!error && data.user && rememberMe) {
        const authData: AuthData = {
          userId: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name,
          accessToken: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天
        }
        await saveAuthData(authData)
        setupAutoRefresh()
      }
      
      if (!error) {
        setIsAuthenticated(true)
      }
      
      return { error }
    } catch (error) {
      console.error('登录失败:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      // 清除自动刷新定时器
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        setRefreshTimer(null)
      }
      
      // 清除Cookie中的认证信息
      removeAuthData()
      
      setUser(null)
      setSession(null)
      setIsAuthenticated(false)
      
      if (supabase === null) {
        console.log('本地模式：用户已登出')
        return
      }
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('登出失败:', error)
      } else {
        console.log('用户已登出')
      }
    } catch (error) {
      console.error('登出过程中发生错误:', error)
    }
  }

  const setupAutoRefresh = () => {
    // 清除现有定时器
    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }
    
    // 设置6小时后自动刷新
    const timer = setTimeout(async () => {
      await refreshAuth()
    }, 6 * 60 * 60 * 1000) // 6小时
    
    setRefreshTimer(timer)
  }
  
  const refreshAuth = async (): Promise<boolean> => {
    try {
      if (supabase === null) {
        // 本地模式：刷新Cookie中的认证数据
        const success = await refreshAuthData()
        if (success) {
          const authData = await getAuthData()
          if (authData) {
            setupAutoRefresh()
          }
        }
        return success
      }
      
      // Supabase模式：刷新会话
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('刷新会话失败:', error)
        return false
      }
      
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          user_metadata: { name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '' },
          created_at: session.user.created_at,
          app_metadata: session.user.app_metadata,
          aud: session.user.aud
        } as unknown as User)
        setSession(session)
        setIsAuthenticated(true)
        
        // 保存到Cookie并设置自动刷新
        const authData = {
          userId: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
        }
        await saveAuthData(authData)
        setupAutoRefresh()
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('刷新认证状态失败:', error)
      return false
    }
  }

  const value = {
    user,
    session,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}