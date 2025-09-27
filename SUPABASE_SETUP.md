# Supabase 数据库配置指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com) 并注册/登录账户
2. 点击 "New Project" 创建新项目
3. 填写项目信息：
   - Name: my-choose-app (或您喜欢的名称)
   - Database Password: 设置一个强密码
   - Region: 选择离您最近的区域
4. 点击 "Create new project" 并等待项目初始化完成

## 2. 获取项目配置信息

项目创建完成后：

1. 进入项目仪表板
2. 点击左侧菜单的 "Settings" (设置)
3. 选择 "API" 选项卡
4. 复制以下信息：
   - **Project URL**: 类似 `https://xxxxx.supabase.co`
   - **anon public key**: 以 `eyJ` 开头的长字符串

## 3. 配置环境变量

将获取的信息填入项目根目录的 `.env` 文件：

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. 应用数据库迁移

配置完成后，运行以下命令应用数据库结构：

```bash
# 如果您有 Supabase CLI
supabase db push

# 或者手动在 Supabase 仪表板中执行
# 1. 进入项目仪表板
# 2. 点击 "SQL Editor"
# 3. 复制 supabase/migrations/001_initial_schema.sql 的内容
# 4. 粘贴并执行 SQL
```

## 5. 验证配置

1. 重启开发服务器：`npm run dev`
2. 尝试注册新用户
3. 检查 Supabase 仪表板的 "Authentication" -> "Users" 是否有新用户
4. 检查 "Table Editor" 是否创建了相应的表结构

## 6. 生产环境配置

在 Vercel 等部署平台上，需要在环境变量中设置：
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 故障排除

### 连接失败
- 检查 URL 和 API Key 是否正确
- 确保没有多余的空格或换行符
- 验证项目是否已完全初始化

### 权限错误
- 确保已应用数据库迁移
- 检查 RLS 策略是否正确配置
- 验证用户角色权限

### 注册/登录失败
- 检查 Supabase Auth 设置
- 确认邮箱验证设置（可在 Authentication -> Settings 中关闭邮箱验证用于测试）

## 功能特性

配置完成后，您的应用将支持：

✅ 真实的用户注册和登录
✅ 密码加密存储
✅ JWT Token 认证
✅ 用户数据持久化
✅ 食物分析记录存储
✅ 营养目标管理
✅ 行级安全策略 (RLS)
✅ 自动会话管理

配置完成后，请重新启动应用并测试注册/登录功能。