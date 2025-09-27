import axios from 'axios';

// 百度AI菜品识别API配置
const BAIDU_API_KEY = import.meta.env.VITE_BAIDU_API_KEY;
const BAIDU_SECRET_KEY = import.meta.env.VITE_BAIDU_SECRET_KEY;
const BAIDU_TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';
const BAIDU_DISH_DETECT_URL = 'https://aip.baidubce.com/rest/2.0/image-classify/v2/dish';

// 百度AI返回的菜品信息接口
interface BaiduDishResult {
  name: string;
  probability: number;
  calorie?: number;
  has_calorie?: number;
}

interface BaiduAPIResponse {
  result_num: number;
  result: BaiduDishResult[];
}

// 获取百度AI访问令牌
let accessToken: string | null = null;
let tokenExpireTime: number = 0;

async function getAccessToken(): Promise<string> {
  // 如果token还未过期，直接返回
  if (accessToken && Date.now() < tokenExpireTime) {
    return accessToken;
  }

  try {
    const response = await axios.post(BAIDU_TOKEN_URL, null, {
      params: {
        grant_type: 'client_credentials',
        client_id: BAIDU_API_KEY,
        client_secret: BAIDU_SECRET_KEY,
      },
    });

    accessToken = response.data.access_token;
    // token有效期为30天，这里设置为29天后过期
    tokenExpireTime = Date.now() + 29 * 24 * 60 * 60 * 1000;
    
    return accessToken;
  } catch (error) {
    console.error('获取百度AI访问令牌失败:', error);
    throw new Error('无法获取百度AI访问令牌');
  }
}

// 将图片文件转换为Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除data:image/xxx;base64,前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 调用百度AI菜品识别API
export async function analyzeFoodWithBaiduAI(imageFile: File) {
  try {
    // 检查API配置
    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
      throw new Error('请配置百度AI的API Key和Secret Key');
    }

    // 获取访问令牌
    const token = await getAccessToken();
    
    // 将图片转换为Base64
    const imageBase64 = await fileToBase64(imageFile);
    
    // 调用百度AI菜品识别API
    const response = await axios.post(
      `${BAIDU_DISH_DETECT_URL}?access_token=${token}`,
      `image=${encodeURIComponent(imageBase64)}&top_num=5`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const data: BaiduAPIResponse = response.data;
    
    if (!data.result || data.result.length === 0) {
      throw new Error('未识别到菜品信息');
    }

    // 转换为应用所需的格式
    const mainDish = data.result[0];
    const confidence = Math.round(mainDish.probability * 100);
    
    // 估算营养信息（基于识别结果和常见菜品数据）
    const estimatedCalories = mainDish.calorie || estimateCalories(mainDish.name);
    const nutritionInfo = estimateNutrition(mainDish.name, estimatedCalories);
    
    return {
      foodName: mainDish.name,
      confidence: confidence,
      calories: estimatedCalories,
      nutrition: nutritionInfo,
      ingredients: extractIngredients(mainDish.name),
      healthScore: calculateHealthScore(nutritionInfo),
      suggestions: generateSuggestions(mainDish.name, nutritionInfo),
      alternatives: data.result.slice(1, 4).map(dish => ({
        name: dish.name,
        probability: Math.round(dish.probability * 100)
      }))
    };
  } catch (error) {
    console.error('百度AI菜品识别失败:', error);
    throw error;
  }
}

// 估算卡路里（基于菜品名称）
function estimateCalories(dishName: string): number {
  const calorieMap: { [key: string]: number } = {
    '米饭': 130,
    '面条': 280,
    '炒饭': 350,
    '红烧肉': 450,
    '宫保鸡丁': 280,
    '麻婆豆腐': 200,
    '青椒肉丝': 220,
    '西红柿鸡蛋': 180,
    '蒸蛋': 120,
    '白菜': 50,
    '菠菜': 60,
    '土豆丝': 150,
  };
  
  // 查找匹配的菜品
  for (const [key, calories] of Object.entries(calorieMap)) {
    if (dishName.includes(key)) {
      return calories;
    }
  }
  
  // 默认估算
  if (dishName.includes('肉') || dishName.includes('鸡') || dishName.includes('鱼')) {
    return 300;
  } else if (dishName.includes('蔬菜') || dishName.includes('菜')) {
    return 80;
  } else if (dishName.includes('汤')) {
    return 60;
  }
  
  return 200; // 默认值
}

// 估算营养信息
function estimateNutrition(dishName: string, calories: number) {
  const baseNutrition = {
    protein: Math.round(calories * 0.15 / 4), // 蛋白质约占15%热量
    carbs: Math.round(calories * 0.55 / 4),   // 碳水化合物约占55%热量
    fat: Math.round(calories * 0.30 / 9),     // 脂肪约占30%热量
    fiber: Math.round(calories * 0.02),       // 纤维素
    sodium: Math.round(calories * 2),         // 钠含量估算
  };
  
  // 根据菜品类型调整营养比例
  if (dishName.includes('肉') || dishName.includes('鸡') || dishName.includes('鱼')) {
    baseNutrition.protein *= 1.5;
    baseNutrition.fat *= 1.2;
  } else if (dishName.includes('蔬菜') || dishName.includes('菜')) {
    baseNutrition.fiber *= 3;
    baseNutrition.carbs *= 0.7;
    baseNutrition.fat *= 0.3;
  }
  
  return baseNutrition;
}

// 提取食材信息
function extractIngredients(dishName: string): string[] {
  const commonIngredients: { [key: string]: string[] } = {
    '宫保鸡丁': ['鸡肉', '花生', '青椒', '红椒', '葱', '蒜'],
    '麻婆豆腐': ['豆腐', '肉末', '豆瓣酱', '葱', '蒜', '花椒'],
    '红烧肉': ['五花肉', '生抽', '老抽', '冰糖', '料酒', '葱', '姜'],
    '西红柿鸡蛋': ['西红柿', '鸡蛋', '葱', '盐', '糖'],
    '青椒肉丝': ['青椒', '肉丝', '葱', '蒜', '生抽', '料酒'],
  };
  
  for (const [dish, ingredients] of Object.entries(commonIngredients)) {
    if (dishName.includes(dish)) {
      return ingredients;
    }
  }
  
  // 基于菜品名称推测食材
  const ingredients: string[] = [];
  if (dishName.includes('鸡')) ingredients.push('鸡肉');
  if (dishName.includes('猪') || dishName.includes('肉')) ingredients.push('猪肉');
  if (dishName.includes('鱼')) ingredients.push('鱼肉');
  if (dishName.includes('虾')) ingredients.push('虾');
  if (dishName.includes('蛋')) ingredients.push('鸡蛋');
  if (dishName.includes('豆腐')) ingredients.push('豆腐');
  if (dishName.includes('青椒')) ingredients.push('青椒');
  if (dishName.includes('西红柿')) ingredients.push('西红柿');
  if (dishName.includes('土豆')) ingredients.push('土豆');
  
  return ingredients.length > 0 ? ingredients : ['未知食材'];
}

// 计算健康评分
function calculateHealthScore(nutrition: any): number {
  let score = 70; // 基础分数
  
  // 根据营养成分调整分数
  if (nutrition.fiber > 5) score += 10;
  if (nutrition.protein > 20) score += 10;
  if (nutrition.fat < 10) score += 10;
  if (nutrition.sodium < 500) score += 10;
  
  return Math.min(100, Math.max(0, score));
}

// 生成建议
function generateSuggestions(dishName: string, nutrition: any): string[] {
  const suggestions: string[] = [];
  
  if (nutrition.sodium > 800) {
    suggestions.push('钠含量较高，建议搭配清淡蔬菜');
  }
  
  if (nutrition.fat > 20) {
    suggestions.push('脂肪含量较高，建议适量食用');
  }
  
  if (nutrition.fiber < 3) {
    suggestions.push('纤维含量较低，建议增加蔬菜摄入');
  }
  
  if (nutrition.protein < 15) {
    suggestions.push('蛋白质含量较低，可搭配蛋类或豆制品');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('营养搭配均衡，可以适量享用');
  }
  
  return suggestions;
}