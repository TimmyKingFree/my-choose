import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 检查Supabase配置是否有效
const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return url.startsWith('http://') || url.startsWith('https://')
  } catch {
    return false
  }
}

// 如果配置无效，使用null，应用将在本地模式运行
export const supabase = (supabaseUrl && supabaseAnonKey && 
  isValidUrl(supabaseUrl) && 
  !supabaseUrl.includes('your_supabase_url_here') &&
  !supabaseAnonKey.includes('your_supabase_anon_key_here'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// 用户认证相关类型定义
export interface User {
  id: string
  email: string
  name: string
  membership_type: 'free' | 'premium'
  created_at: string
}

export interface FoodAnalysis {
  id: string
  user_id: string
  image_url: string
  analysis_result: {
    dishes: Array<{
      name: string
      confidence: number
      calories: number
      nutrition: {
        protein: number
        carbs: number
        fat: number
      }
    }>
    recommendation: string
    health_score: number
  }
  created_at: string
}

export interface FoodRecord {
  id: string
  user_id: string
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  food_name: string
  calories: number
  nutrition: object
  date: string
  created_at: string
}