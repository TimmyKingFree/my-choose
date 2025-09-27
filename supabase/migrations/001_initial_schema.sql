-- 创建用户配置表（扩展Supabase Auth用户信息）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建食物分析表
CREATE TABLE IF NOT EXISTS food_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  analysis_result JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建饮食记录表
CREATE TABLE IF NOT EXISTS food_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_name TEXT NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) NOT NULL,
  calories INTEGER,
  protein DECIMAL(5,2),
  carbs DECIMAL(5,2),
  fat DECIMAL(5,2),
  fiber DECIMAL(5,2),
  sugar DECIMAL(5,2),
  sodium DECIMAL(5,2),
  image_url TEXT,
  notes TEXT,
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建营养目标表
CREATE TABLE IF NOT EXISTS nutrition_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  daily_calories INTEGER DEFAULT 2000,
  daily_protein DECIMAL(5,2) DEFAULT 150.00,
  daily_carbs DECIMAL(5,2) DEFAULT 250.00,
  daily_fat DECIMAL(5,2) DEFAULT 65.00,
  daily_fiber DECIMAL(5,2) DEFAULT 25.00,
  daily_sugar DECIMAL(5,2) DEFAULT 50.00,
  daily_sodium DECIMAL(5,2) DEFAULT 2300.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用行级安全策略 (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;

-- 用户配置表的RLS策略
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 食物分析表的RLS策略
CREATE POLICY "Users can view own food analyses" ON food_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food analyses" ON food_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food analyses" ON food_analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food analyses" ON food_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- 饮食记录表的RLS策略
CREATE POLICY "Users can view own food records" ON food_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food records" ON food_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food records" ON food_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food records" ON food_records
  FOR DELETE USING (auth.uid() = user_id);

-- 营养目标表的RLS策略
CREATE POLICY "Users can view own nutrition goals" ON nutrition_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nutrition goals" ON nutrition_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nutrition goals" ON nutrition_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nutrition goals" ON nutrition_goals
  FOR DELETE USING (auth.uid() = user_id);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_food_analyses_user_id ON food_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_food_analyses_created_at ON food_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_records_user_id ON food_records(user_id);
CREATE INDEX IF NOT EXISTS idx_food_records_consumed_at ON food_records(consumed_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_records_meal_type ON food_records(meal_type);

-- 创建触发器函数来自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相关表创建触发器
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_goals_updated_at
  BEFORE UPDATE ON nutrition_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 授予权限给认证用户
GRANT ALL PRIVILEGES ON user_profiles TO authenticated;
GRANT ALL PRIVILEGES ON food_analyses TO authenticated;
GRANT ALL PRIVILEGES ON food_records TO authenticated;
GRANT ALL PRIVILEGES ON nutrition_goals TO authenticated;

-- 授予基本权限给匿名用户（用于注册等操作）
GRANT SELECT ON user_profiles TO anon;
GRANT INSERT ON user_profiles TO anon;