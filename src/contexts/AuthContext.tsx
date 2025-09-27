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

      // Supabase模式：真实注册
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            username: name
          },
        },
      })
      
      if (error) {
        console.error('Supabase注册错误:', error)
        return { error }
      }
      
      // 如果注册成功，创建用户配置文件
      if (data.user) {
        try {
          // 创建用户配置文件
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              username: name,
              avatar_url: null
            })
          
          if (profileError) {
            console.error('创建用户配置文件失败:', profileError)
            // 不阻止注册流程，只记录错误
          }
          
          // 创建默认营养目标
          const { error: goalError } = await supabase
            .from('nutrition_goals')
            .insert({
              user_id: data.user.id,
              daily_calories: 2000,
              daily_protein: 150,
              daily_carbs: 250,
              daily_fat: 65,
              daily_fiber: 25,
              daily_sugar: 50,
              daily_sodium: 2300
            })
          
          if (goalError) {
            console.error('创建营养目标失败:', goalError)
            // 不阻止注册流程，只记录错误
          }
          
        } catch (profileError) {
          console.error('创建用户数据失败:', profileError)
        }
        
        // 如果有会话，保存登录状态
        if (data.session) {
          const authData: AuthData = {
            userId: data.user.id,
            email: data.user.email || email,
            name: name,
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天
          }
          await saveAuthData(authData)
          setupAutoRefresh()
          setIsAuthenticated(true)
        }
      }
      
      return { error: null }
    } catch (error: any) {
      console.error('注册失败:', error)
      return { error: { message: error.message || '注册过程中发生未知错误' } }
    }
  }

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      console.log('🔐 开始登录流程...')
      console.log('📧 邮箱:', email)
      console.log('🔧 Supabase状态:', supabase ? '已配置' : '未配置(本地模式)')
      
      if (supabase === null) {
        console.log('⚠️ 当前运行在本地模式，使用预设账户验证')
        console.log('💡 提示：要使用真实数据库，请配置Supabase环境变量')
        
        // 本地模式：验证预设账户
        const localUsers = [
          { email: 'admin@example.com', password: '123456', name: 'Admin User', id: 'admin-001' },
          { email: 'user@example.com', password: 'password', name: 'Regular User', id: 'user-001' },
          { email: 'test@test.com', password: 'test123', name: 'Test User', id: 'test-001' }
        ]
        
        console.log('🔍 在本地用户中查找匹配账户...')
        const foundUser = localUsers.find(u => u.email === email && u.password === password)
        
        if (!foundUser) {
          console.log('❌ 本地验证失败：邮箱或密码错误')
          console.log('📝 可用的测试账户:')
          localUsers.forEach(user => {
            console.log(`   - ${user.email} / ${user.password}`)
          })
          return { error: { message: '邮箱或密码错误\n\n可用测试账户：\n• admin@example.com / 123456\n• user@example.com / password\n• test@test.com / test123' } }
        }
        
        console.log('✅ 本地验证成功，用户:', foundUser.name)
        
        const mockUser = {
          id: foundUser.id,
          email: foundUser.email,
          user_metadata: { name: foundUser.name },
          created_at: new Date().toISOString(),
          app_metadata: {},
          aud: 'authenticated'
        } as unknown as User
        
        console.log('👤 设置用户状态...')
        setUser(mockUser)
        setIsAuthenticated(true)
        console.log('🎉 登录状态已更新')
        
        // 保存登录状态
        if (rememberMe) {
          console.log('💾 保存登录状态到本地存储...')
          const authData: AuthData = {
            userId: mockUser.id,
            email: mockUser.email,
            name: foundUser.name,
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天
          }
          await saveAuthData(authData)
          setupAutoRefresh()
          console.log('✅ 登录状态已保存')
        }
        
        console.log('🚀 本地模式登录完成')
        return { error: null }
      }

      // Supabase模式：真实登录验证
      console.log('🌐 使用Supabase进行真实登录验证...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('❌ Supabase登录错误:', error)
        console.error('错误代码:', error.status)
        console.error('错误消息:', error.message)
        
        // 返回更友好的错误信息
        let errorMessage = '登录失败'
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = '邮箱或密码错误'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '请先验证您的邮箱'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = '登录尝试次数过多，请稍后再试'
        } else {
          errorMessage = error.message
        }
        return { error: { message: errorMessage } }
      }
      
      console.log('✅ Supabase登录验证成功')
      
      if (data.user && data.session) {
        try {
          // 获取用户配置文件信息
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('username, avatar_url')
            .eq('id', data.user.id)
            .single()
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('获取用户配置文件失败:', profileError)
          }
          
          // 更新用户元数据
          const updatedUser = {
            ...data.user,
            user_metadata: {
              ...data.user.user_metadata,
              username: profile?.username || data.user.user_metadata?.name || '',
              avatar_url: profile?.avatar_url || null
            }
          }
          
          setUser(updatedUser)
          setSession(data.session)
          setIsAuthenticated(true)
          
          // 保存登录状态
          if (rememberMe) {
            const authData: AuthData = {
              userId: data.user.id,
              email: data.user.email || email,
              name: profile?.username || data.user.user_metadata?.name || '',
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
              expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天
            }
            await saveAuthData(authData)
            setupAutoRefresh()
          }
          
        } catch (profileError) {
          console.error('处理用户配置文件时出错:', profileError)
          // 即使配置文件获取失败，也继续登录流程
          setUser(data.user)
          setSession(data.session)
          setIsAuthenticated(true)
        }
      }
      
      return { error: null }
    } catch (error: any) {
      console.error('💥 登录过程中发生异常错误:', error)
      console.error('错误类型:', typeof error)
      console.error('错误堆栈:', error.stack)
      
      let errorMessage = '登录过程中发生未知错误'
      if (error.message) {
        errorMessage = error.message
      }
      
      console.error('🚨 最终错误信息:', errorMessage)
      return { error: { message: errorMessage } }
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