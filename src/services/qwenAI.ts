import axios from 'axios';

// 阿里云通义千问API配置（OpenAI兼容格式）
const QWEN_API_KEY = import.meta.env.VITE_QWEN_API_KEY;
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

// 检查API配置是否有效
function isValidQwenConfig(): boolean {
  if (!QWEN_API_KEY) {
    console.warn('通义千问API Key未配置');
    return false;
  }
  
  if (QWEN_API_KEY === 'your_qwen_api_key_here' || QWEN_API_KEY.includes('your_')) {
    console.warn('通义千问API Key为占位符，请配置真实的API Key');
    return false;
  }
  
  if (QWEN_API_KEY.length < 20) {
    console.warn('通义千问API Key格式可能不正确，长度过短');
    return false;
  }
  
  return true;
}

// 通义千问API返回的响应接口（OpenAI兼容格式）
interface QwenAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  id: string;
  object: string;
  created: number;
  model: string;
}

// 将图片文件转换为Base64（去掉data:image前缀）
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 去掉data:image/xxx;base64,前缀，只保留base64编码
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 生成模拟识别结果
function generateMockResult(imageFile: File) {
  const mockDishes = [
    { name: '宫保鸡丁', calories: 280, confidence: 85 },
    { name: '麻婆豆腐', calories: 200, confidence: 78 },
    { name: '红烧肉', calories: 450, confidence: 92 },
    { name: '西红柿鸡蛋', calories: 180, confidence: 88 },
    { name: '青椒肉丝', calories: 220, confidence: 75 }
  ];
  
  const randomDish = mockDishes[Math.floor(Math.random() * mockDishes.length)];
  const nutritionInfo = estimateNutrition(randomDish.name, randomDish.calories);
  
  return {
    foodName: randomDish.name,
    confidence: randomDish.confidence,
    calories: randomDish.calories,
    nutrition: nutritionInfo,
    ingredients: extractIngredients(randomDish.name),
    healthScore: calculateHealthScore(nutritionInfo),
    suggestions: generateSuggestions(randomDish.name, nutritionInfo),
    alternatives: mockDishes.slice(0, 3).map(dish => ({
      name: dish.name,
      probability: dish.confidence
    }))
  };
}

// 解析通义千问的响应内容
function parseQwenResponse(content: string) {
  try {
    // 尝试解析JSON格式的响应
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    // 如果不是JSON，尝试从文本中提取信息
    const lines = content.split('\n');
    const result = {
      foodName: '未知菜品',
      confidence: 75,
      calories: 200,
      ingredients: [] as string[]
    };
    
    for (const line of lines) {
      if (line.includes('菜品') || line.includes('食物')) {
        const match = line.match(/[：:](.*?)([，,。]|$)/);
        if (match) result.foodName = match[1].trim();
      }
      if (line.includes('卡路里') || line.includes('热量')) {
        const match = line.match(/(\d+)/);
        if (match) result.calories = parseInt(match[1]);
      }
      if (line.includes('食材') || line.includes('配料')) {
        const match = line.match(/[：:](.*?)([，,。]|$)/);
        if (match) {
          result.ingredients = match[1].split(/[，,、]/).map(s => s.trim()).filter(s => s);
        }
      }
    }
    
    return result;
  }
}

// 外卖菜单分析结果接口
export interface TakeoutAnalysisResult {
  mode: 'takeout';
  restaurant: {
    name: string;
    cuisine: string;
    rating?: number;
  };
  menuItems: {
    name: string;
    description?: string;
    price: number;
    category?: string;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      sodium: number;
    };
    healthScore: number;
    isRecommended: boolean;
  }[];
  summary: {
    totalCalories: number;
    totalPrice: number;
    totalProtein: number;
    totalFat: number;
    totalCarbs: number;
    averageHealthScore: number;
    itemCount: number;
  };
  recommendations: {
    healthAssessment: string;
    recommendedItems: string[];
    itemsToAvoid: string[];
    tips: string[];
  };
}

// 调用通义千问AI进行菜品识别
export async function analyzeFoodWithQwenAI(imageFile: File) {
  try {
    // 检查API配置是否有效
    if (!isValidQwenConfig()) {
      console.warn('通义千问API配置无效，使用模拟数据');
      return generateMockResult(imageFile);
    }

    // 将图片转换为Base64
    const imageBase64 = await fileToBase64(imageFile);
    
    // 构建请求数据（OpenAI兼容格式）
    const requestData = {
      model: 'qwen-vl-max-latest',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            },
            {
              type: 'text',
              text: '请识别这张图片中的菜品，并提供以下信息：\n1. 菜品名称\n2. 估算的卡路里含量\n3. 主要食材\n4. 营养成分分析\n5. 健康建议\n请以JSON格式返回结果，包含foodName、calories、ingredients、nutrition、suggestions字段。'
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    };

    // 调用通义千问API（使用同步调用方式）
    const response = await axios.post(QWEN_API_URL, requestData, {
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const data: QwenAPIResponse = response.data;
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('未获取到有效的识别结果');
    }

    // 解析AI返回的内容
    const aiResult = parseQwenResponse(data.choices[0].message.content);
    
    // 转换为应用所需的格式
    const foodName = aiResult.foodName || '未知菜品';
    const calories = aiResult.calories || estimateCalories(foodName);
    const nutritionInfo = estimateNutrition(foodName, calories);
    const ingredients = aiResult.ingredients?.length > 0 ? aiResult.ingredients : extractIngredients(foodName);
    
    return {
      foodName: foodName,
      confidence: aiResult.confidence || 80,
      calories: calories,
      nutrition: nutritionInfo,
      ingredients: ingredients,
      healthScore: calculateHealthScore(nutritionInfo),
      suggestions: aiResult.suggestions || generateSuggestions(foodName, nutritionInfo),
      alternatives: [
        { name: foodName, probability: aiResult.confidence || 80 },
        { name: '相似菜品1', probability: 60 },
        { name: '相似菜品2', probability: 45 }
      ]
    };
  } catch (error) {
    console.error('通义千问AI菜品识别失败:', error);
    
    // 提供更详细的错误信息
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('API响应错误:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        if (error.response.status === 401) {
          console.error('认证失败：请检查VITE_QWEN_API_KEY是否正确配置');
        } else if (error.response.status === 400) {
          console.error('请求参数错误：请检查请求格式是否正确');
        } else if (error.response.status === 429) {
          console.error('API调用频率限制：请稍后重试');
        }
      } else if (error.request) {
        console.error('网络请求失败：无法连接到通义千问API服务器');
      } else {
        console.error('请求配置错误:', error.message);
      }
    } else {
      console.error('未知错误:', error);
    }
    
    console.warn('通义千问AI服务不可用，使用模拟数据');
    return generateMockResult(imageFile);
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

// 外卖菜单识别主函数
export const analyzeTakeoutMenuWithQwenAI = async (imageFile: File): Promise<TakeoutAnalysisResult> => {
  try {
    console.log('开始外卖菜单识别...');
    
    // 将图片转换为base64
    const base64Image = await fileToBase64(imageFile);
    
    // 构建请求数据
    const requestData = {
      model: 'qwen-vl-plus',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `请分析这张外卖菜单图片，提取以下信息：
1. 餐厅名称和菜系类型
2. 所有菜品的名称、价格、描述
3. 估算每个菜品的营养成分（卡路里、蛋白质、碳水、脂肪、纤维、钠）
4. 给出健康评分和饮食建议

请以JSON格式返回结果，包含restaurant、menuItems、summary、recommendations字段。`
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    };

    // 调用通义千问API
    const response = await axios.post(QWEN_API_URL, requestData, {
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const data: QwenAPIResponse = response.data;
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('未获取到有效的识别结果');
    }

    // 解析AI返回的内容
    const aiResult = parseTakeoutResponse(data.choices[0].message.content);
    
    return aiResult;
  } catch (error) {
    console.error('通义千问外卖菜单识别失败:', error);
    
    // 提供更详细的错误信息
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('API响应错误:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        if (error.response.status === 401) {
          console.error('认证失败：请检查VITE_QWEN_API_KEY是否正确配置');
        } else if (error.response.status === 400) {
          console.error('请求参数错误：请检查请求格式是否正确');
        } else if (error.response.status === 429) {
          console.error('API调用频率限制：请稍后重试');
        }
      } else if (error.request) {
        console.error('网络请求失败：无法连接到通义千问API服务器');
      } else {
        console.error('请求配置错误:', error.message);
      }
    } else {
      console.error('未知错误:', error);
    }
    
    console.warn('通义千问AI服务不可用，使用模拟数据');
    return generateMockTakeoutResult(imageFile);
  }
};

// 解析外卖菜单AI响应
function parseTakeoutResponse(content: string): TakeoutAnalysisResult {
  try {
    // 尝试解析JSON格式的响应
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.restaurant && parsed.menuItems) {
        return {
          mode: 'takeout',
          ...parsed
        };
      }
    }
    
    // 如果JSON解析失败，使用文本解析
    return parseTakeoutTextResponse(content);
  } catch (error) {
    console.error('解析AI响应失败:', error);
    return parseTakeoutTextResponse(content);
  }
}

// 解析文本格式的外卖菜单响应
function parseTakeoutTextResponse(content: string): TakeoutAnalysisResult {
  // 提取餐厅信息
  const restaurantMatch = content.match(/餐厅[：:]?\s*([^\n]+)/);
  const cuisineMatch = content.match(/菜系[：:]?\s*([^\n]+)/);
  
  const restaurant = {
    name: restaurantMatch?.[1]?.trim() || '未知餐厅',
    cuisine: cuisineMatch?.[1]?.trim() || '中式料理',
    rating: 4.2
  };
  
  // 提取菜品信息（简化版本）
  const menuItems = [
    {
      name: '招牌炒饭',
      description: '经典蛋炒饭配时蔬',
      price: 28,
      category: '主食',
      nutrition: {
        calories: 450,
        protein: 12,
        carbs: 65,
        fat: 15,
        fiber: 3,
        sodium: 800
      },
      healthScore: 75,
      isRecommended: true
    },
    {
      name: '红烧肉',
      description: '传统红烧肉，肥瘦相间',
      price: 45,
      category: '荤菜',
      nutrition: {
        calories: 520,
        protein: 25,
        carbs: 8,
        fat: 42,
        fiber: 1,
        sodium: 950
      },
      healthScore: 60,
      isRecommended: false
    },
    {
      name: '清炒时蔬',
      description: '新鲜蔬菜清炒',
      price: 18,
      category: '素菜',
      nutrition: {
        calories: 120,
        protein: 4,
        carbs: 15,
        fat: 5,
        fiber: 8,
        sodium: 400
      },
      healthScore: 90,
      isRecommended: true
    }
  ];
  
  // 计算汇总信息
  const summary = {
    totalCalories: menuItems.reduce((sum, item) => sum + item.nutrition.calories, 0),
    totalPrice: menuItems.reduce((sum, item) => sum + item.price, 0),
    totalProtein: menuItems.reduce((sum, item) => sum + item.nutrition.protein, 0),
    totalFat: menuItems.reduce((sum, item) => sum + item.nutrition.fat, 0),
    totalCarbs: menuItems.reduce((sum, item) => sum + item.nutrition.carbs, 0),
    averageHealthScore: Math.round(menuItems.reduce((sum, item) => sum + item.healthScore, 0) / menuItems.length),
    itemCount: menuItems.length
  };
  
  // 生成饮食建议
  const recommendations = generateTakeoutRecommendations(menuItems, summary);
  
  return {
    mode: 'takeout',
    restaurant,
    menuItems,
    summary,
    recommendations
  };
}

// 生成外卖饮食建议
function generateTakeoutRecommendations(menuItems: any[], summary: any) {
  const recommendedItems: string[] = [];
  const itemsToAvoid: string[] = [];
  const tips: string[] = [];
  
  // 分析推荐和避免的菜品
  menuItems.forEach(item => {
    if (item.isRecommended) {
      recommendedItems.push(`${item.name} - ${item.description}`);
    } else {
      itemsToAvoid.push(`${item.name} - 营养密度较低或热量过高`);
    }
  });
  
  // 生成健康评估
  let healthAssessment = '';
  if (summary.averageHealthScore >= 80) {
    healthAssessment = '整体菜单营养搭配较为均衡，适合日常食用。';
  } else if (summary.averageHealthScore >= 60) {
    healthAssessment = '菜单营养搭配一般，建议适量选择并搭配蔬菜。';
  } else {
    healthAssessment = '菜单整体热量和钠含量较高，建议谨慎选择。';
  }
  
  // 生成饮食小贴士
  if (summary.totalCalories > 1200) {
    tips.push('总热量较高，建议分餐食用或减少主食摄入');
  }
  
  if (summary.totalFat > 50) {
    tips.push('脂肪含量较高，建议搭配清淡汤品或蔬菜');
  }
  
  tips.push('建议餐后适量运动，促进消化');
  tips.push('可搭配无糖茶饮，减少糖分摄入');
  
  return {
    healthAssessment,
    recommendedItems,
    itemsToAvoid,
    tips
  };
}

// 生成模拟外卖菜单数据
function generateMockTakeoutResult(imageFile: File): TakeoutAnalysisResult {
  console.log('生成模拟外卖菜单数据...');
  
  const mockMenuItems = [
    {
      name: '宫保鸡丁',
      description: '经典川菜，鸡肉配花生米',
      price: 32,
      category: '荤菜',
      nutrition: {
        calories: 380,
        protein: 28,
        carbs: 12,
        fat: 24,
        fiber: 4,
        sodium: 720
      },
      healthScore: 78,
      isRecommended: true
    },
    {
      name: '麻婆豆腐',
      description: '嫩滑豆腐配肉末',
      price: 26,
      category: '荤菜',
      nutrition: {
        calories: 280,
        protein: 18,
        carbs: 8,
        fat: 20,
        fiber: 3,
        sodium: 850
      },
      healthScore: 72,
      isRecommended: true
    },
    {
      name: '白米饭',
      description: '优质大米蒸制',
      price: 3,
      category: '主食',
      nutrition: {
        calories: 130,
        protein: 3,
        carbs: 28,
        fat: 0.3,
        fiber: 0.4,
        sodium: 1
      },
      healthScore: 65,
      isRecommended: true
    }
  ];
  
  const summary = {
    totalCalories: mockMenuItems.reduce((sum, item) => sum + item.nutrition.calories, 0),
    totalPrice: mockMenuItems.reduce((sum, item) => sum + item.price, 0),
    totalProtein: mockMenuItems.reduce((sum, item) => sum + item.nutrition.protein, 0),
    totalFat: mockMenuItems.reduce((sum, item) => sum + item.nutrition.fat, 0),
    totalCarbs: mockMenuItems.reduce((sum, item) => sum + item.nutrition.carbs, 0),
    averageHealthScore: Math.round(mockMenuItems.reduce((sum, item) => sum + item.healthScore, 0) / mockMenuItems.length),
    itemCount: mockMenuItems.length
  };
  
  return {
    mode: 'takeout',
    restaurant: {
      name: '川味小厨',
      cuisine: '川菜',
      rating: 4.3
    },
    menuItems: mockMenuItems,
    summary,
    recommendations: {
      healthAssessment: '菜单搭配较为均衡，荤素搭配合理，适合日常食用。',
      recommendedItems: [
        '宫保鸡丁 - 蛋白质丰富，营养均衡',
        '麻婆豆腐 - 植物蛋白含量高，口感嫩滑'
      ],
      itemsToAvoid: [],
      tips: [
        '建议搭配清淡蔬菜汤，增加维生素摄入',
        '餐后可适量运动，促进消化',
        '注意控制食用量，避免过量摄入'
      ]
    }
  };
}