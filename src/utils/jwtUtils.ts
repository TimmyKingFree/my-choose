import * as jose from 'jose'

// JWT密钥 - 在生产环境中应该从环境变量获取
const JWT_SECRET = new TextEncoder().encode(
  import.meta.env.VITE_JWT_SECRET || 'my-choose-jwt-secret-key-2024'
)
const JWT_EXPIRES_IN = '7d' // 7天过期

// JWT载荷接口
export interface JWTPayload {
  userId: string
  email: string
  name?: string
  iat?: number // 签发时间
  exp?: number // 过期时间
}

/**
 * 生成JWT令牌
 */
export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  try {
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)
    
    return jwt
  } catch (error) {
    console.error('生成JWT令牌失败:', error)
    throw new Error('令牌生成失败')
  }
}

/**
 * 验证JWT令牌
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      console.warn('JWT令牌已过期')
    } else if (error instanceof jose.errors.JWTInvalid) {
      console.warn('JWT令牌无效')
    } else {
      console.error('验证JWT令牌失败:', error)
    }
    return null
  }
}

/**
 * 解析JWT令牌（不验证签名）
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jose.decodeJwt(token) as JWTPayload
    return decoded
  } catch (error) {
    console.error('解析JWT令牌失败:', error)
    return null
  }
}

/**
 * 检查JWT令牌是否即将过期（1小时内）
 */
export function isTokenExpiringSoon(token: string): boolean {
  try {
    const decoded = decodeToken(token)
    if (!decoded || !decoded.exp) {
      return true
    }
    
    const currentTime = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = decoded.exp - currentTime
    
    // 如果1小时内过期，返回true
    return timeUntilExpiry < 3600
  } catch (error) {
    console.error('检查令牌过期时间失败:', error)
    return true
  }
}

/**
 * 刷新JWT令牌
 */
export async function refreshToken(oldToken: string): Promise<string | null> {
  try {
    const decoded = await verifyToken(oldToken)
    if (!decoded) {
      return null
    }
    
    // 生成新的令牌，移除旧的时间戳
    const { iat, exp, ...payload } = decoded
    return await generateToken(payload)
  } catch (error) {
    console.error('刷新JWT令牌失败:', error)
    return null
  }
}

/**
 * 从令牌中提取用户信息
 */
export async function getUserFromToken(token: string): Promise<{ userId: string; email: string; name?: string } | null> {
  try {
    const decoded = await verifyToken(token)
    if (!decoded) {
      return null
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name
    }
  } catch (error) {
    console.error('从令牌提取用户信息失败:', error)
    return null
  }
}

/**
 * 检查令牌是否有效
 */
export async function isTokenValid(token: string): Promise<boolean> {
  const result = await verifyToken(token)
  return result !== null
}

/**
 * 获取令牌剩余有效时间（秒）
 */
export function getTokenRemainingTime(token: string): number {
  try {
    const decoded = decodeToken(token)
    if (!decoded || !decoded.exp) {
      return 0
    }
    
    const currentTime = Math.floor(Date.now() / 1000)
    const remainingTime = decoded.exp - currentTime
    
    return Math.max(0, remainingTime)
  } catch (error) {
    console.error('获取令牌剩余时间失败:', error)
    return 0
  }
}