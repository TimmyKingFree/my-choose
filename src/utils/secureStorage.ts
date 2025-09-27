import CryptoJS from 'crypto-js'
import Cookies from 'js-cookie'
import { generateToken, verifyToken, refreshToken, getUserFromToken } from './jwtUtils'

// 加密密钥 - 在生产环境中应该从环境变量获取
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'my-choose-app-secret-key-2024'

// Cookie配置
const COOKIE_OPTIONS = {
  expires: 7, // 7天过期
  secure: window.location.protocol === 'https:', // 仅在HTTPS下启用
  sameSite: 'strict' as const, // 防止CSRF攻击
  path: '/' // 全站可用
}

// 用户认证信息接口
export interface AuthData {
  userId: string
  email: string
  name?: string
  accessToken?: string
  refreshToken?: string
  jwtToken?: string // JWT令牌
  expiresAt: number // 过期时间戳
}

/**
 * 加密数据
 */
function encrypt(data: string): string {
  try {
    return CryptoJS.AES.encrypt(data, SECRET_KEY).toString()
  } catch (error) {
    console.error('加密失败:', error)
    throw new Error('数据加密失败')
  }
}

/**
 * 解密数据
 */
function decrypt(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY)
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8)
    if (!decryptedData) {
      throw new Error('解密结果为空')
    }
    return decryptedData
  } catch (error) {
    console.error('解密失败:', error)
    throw new Error('数据解密失败')
  }
}

/**
 * 保存认证数据到Cookie
 */
export async function saveAuthData(authData: Omit<AuthData, 'jwtToken'>): Promise<void> {
  try {
    // 生成JWT令牌
    const jwtToken = await generateToken({
      userId: authData.userId,
      email: authData.email,
      name: authData.name
    })
    
    const dataWithJWT: AuthData = {
      ...authData,
      jwtToken
    }
    
    const encryptedData = encrypt(JSON.stringify(dataWithJWT))
    Cookies.set('auth_data', encryptedData, COOKIE_OPTIONS)
    
    console.log('认证数据已保存到Cookie')
  } catch (error) {
    console.error('保存认证数据失败:', error)
    throw new Error('保存认证数据失败')
  }
}

/**
 * 从Cookie获取认证数据
 */
export async function getAuthData(): Promise<AuthData | null> {
  try {
    const encryptedData = Cookies.get('auth_data')
    if (!encryptedData) {
      return null
    }
    
    const decryptedData = decrypt(encryptedData)
    const authData: AuthData = JSON.parse(decryptedData)
    
    // 验证JWT令牌
    if (!authData.jwtToken || !(await verifyToken(authData.jwtToken))) {
      console.warn('JWT令牌无效，清除认证数据')
      removeAuthData()
      return null
    }
    
    return authData
  } catch (error) {
    console.error('获取认证数据失败:', error)
    // 如果解密失败，清除可能损坏的数据
    removeAuthData()
    return null
  }
}

/**
 * 清除认证信息
 */
export function removeAuthData(): void {
  try {
    Cookies.remove('auth_data')
  } catch (error) {
    console.error('清除认证信息失败:', error)
  }
}

/**
 * 验证认证数据是否有效
 */
export async function isAuthDataValid(): Promise<boolean> {
  try {
    const authData = await getAuthData()
    if (!authData || !authData.jwtToken) {
      return false
    }
    
    // 验证JWT令牌
    const result = await verifyToken(authData.jwtToken)
    return result !== null
  } catch (error) {
    console.error('验证认证数据失败:', error)
    return false
  }
}

/**
 * 刷新认证数据（延长过期时间）
 */
export async function refreshAuthData(): Promise<boolean> {
  try {
    const authData = await getAuthData()
    if (!authData || !authData.jwtToken) {
      return false
    }
    
    // 刷新JWT令牌
    const newJwtToken = await refreshToken(authData.jwtToken)
    if (!newJwtToken) {
      console.warn('刷新JWT令牌失败')
      removeAuthData()
      return false
    }
    
    // 更新认证数据
    const updatedAuthData: AuthData = {
      ...authData,
      jwtToken: newJwtToken,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天后过期
    }
    
    const encryptedData = encrypt(JSON.stringify(updatedAuthData))
    Cookies.set('auth_data', encryptedData, COOKIE_OPTIONS)
    
    console.log('认证数据已刷新')
    return true
  } catch (error) {
    console.error('刷新认证数据失败:', error)
    return false
  }
}

/**
 * 安全清除所有相关存储
 */
export function clearAllAuthStorage(): void {
  try {
    // 清除Cookie
    removeAuthData()
    
    // 清除localStorage中可能的认证相关数据
    const keysToRemove = ['auth_token', 'user_data', 'session_data']
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
  } catch (error) {
    console.error('清除存储失败:', error)
  }
}