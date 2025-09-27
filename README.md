# 智能选择助手 (Smart Choice Assistant)

一个基于 React + TypeScript + Vite 构建的智能午餐推荐应用，集成了阿里云通义千问 AI 服务，提供智能菜品识别和个性化推荐功能。

## 主要功能

- 🍽️ **智能午餐推荐**: 基于用户偏好和历史记录提供个性化推荐
- 📸 **AI 菜品识别**: 使用阿里云通义千问 AI 识别拍照菜品并分析营养成分
- 📊 **饮食记录**: 记录和追踪个人饮食习惯
- 🔐 **用户认证**: 基于 Supabase 的安全用户认证系统
- 📱 **响应式设计**: 支持移动端和桌面端访问

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **样式**: Tailwind CSS + Lucide React Icons
- **状态管理**: Zustand
- **后端服务**: Supabase (数据库 + 认证)
- **AI 服务**: 阿里云通义千问 API
- **部署**: Vercel

## 环境配置

### 1. 克隆项目
```bash
git clone <repository-url>
cd my-choose
```

### 2. 安装依赖
```bash
npm install
```

### 3. 环境变量配置

创建 `.env` 文件并配置以下环境变量：

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (Optional)
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Qwen AI Configuration (Primary)
VITE_QWEN_API_KEY=your_qwen_api_key_here

# Baidu AI Configuration (Alternative)
VITE_BAIDU_API_KEY=your_baidu_api_key
VITE_BAIDU_SECRET_KEY=your_baidu_secret_key
```

### 4. 阿里云通义千问 API 配置

1. 访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 创建应用并获取 API Key
3. 将 API Key 配置到 `VITE_QWEN_API_KEY` 环境变量中

### 5. Supabase 配置

1. 创建 [Supabase](https://supabase.com/) 项目
2. 获取项目 URL 和 anon key
3. 配置到对应的环境变量中

## 开发

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 部署

项目已配置 Vercel 部署，推送到 GitHub 后可自动部署。

## 功能说明

### AI 菜品识别
- 支持拍照识别菜品
- 自动分析营养成分和卡路里
- 提供健康建议和评分
- 智能提取食材信息

### 智能推荐
- 基于用户偏好推荐午餐
- 考虑营养均衡和健康因素
- 支持个性化定制

### 用户系统
- 安全的用户注册和登录
- 个人饮食记录管理
- 历史数据追踪
