import React, { useState } from 'react';
import { Camera, Upload, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { analyzeFoodWithBaiduAI } from '../services/baiduAI';

export default function PhotoAnalysis() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
      setAnalysisResult(null);
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzeFoodWithBaiduAI(selectedFile);
      
      setAnalysisResult({
        foodName: result.foodName,
        confidence: result.confidence,
        calories: result.calories,
        nutrition: result.nutrition,
        ingredients: result.ingredients,
        healthScore: result.healthScore,
        suggestions: result.suggestions,
        alternatives: result.alternatives
      });
    } catch (err: any) {
      console.error('分析失败:', err);
      setError(err.message || '分析失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <motion.button
            onClick={() => navigate('/')}
            className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5 text-orange-600" />
          </motion.button>
          <h1 className="text-xl font-bold text-gray-800 ml-4">拍照识别</h1>
        </div>

        {/* Upload Area */}
        {!selectedImage && (
          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg mb-6 border border-orange-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <motion.div 
                className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Camera className="w-10 h-10 text-orange-600" />
              </motion.div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">上传菜品图片</h2>
              <p className="text-gray-600 mb-6">拍照或选择菜品图片进行AI识别分析</p>
              
              <motion.label 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 cursor-pointer shadow-lg"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Upload className="w-5 h-5 mr-2" />
                选择图片
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </motion.label>
            </div>
          </motion.div>
        )}

        {/* Image Preview */}
        {selectedImage && (
          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg mb-6 border border-orange-100"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.img
              src={selectedImage}
              alt="上传的图片"
              className="w-full h-64 object-cover rounded-xl mb-4 shadow-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            />
            
            {!analysisResult && (
              <motion.button
                onClick={analyzeImage}
                disabled={isAnalyzing}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {isAnalyzing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    AI分析中...
                  </div>
                ) : (
                  '开始AI分析'
                )}
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div 
            className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Analysis Result */}
        {analysisResult && (
          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-orange-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">AI识别结果</h3>
            
            {/* Main Result */}
            <motion.div 
              className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 mb-4"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-lg text-gray-800">{analysisResult.foodName}</h4>
                  <p className="text-sm text-orange-600">识别置信度: {analysisResult.confidence}%</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-600">{analysisResult.calories}</div>
                  <div className="text-sm text-gray-600">卡路里</div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                <div className="text-center bg-white/60 rounded-lg p-2">
                  <div className="font-medium text-gray-800">{analysisResult.nutrition.protein}g</div>
                  <div className="text-gray-600">蛋白质</div>
                </div>
                <div className="text-center bg-white/60 rounded-lg p-2">
                  <div className="font-medium text-gray-800">{analysisResult.nutrition.fat}g</div>
                  <div className="text-gray-600">脂肪</div>
                </div>
                <div className="text-center bg-white/60 rounded-lg p-2">
                  <div className="font-medium text-gray-800">{analysisResult.nutrition.carbs}g</div>
                  <div className="text-gray-600">碳水</div>
                </div>
                <div className="text-center bg-white/60 rounded-lg p-2">
                  <div className="font-medium text-gray-800">{analysisResult.nutrition.fiber}g</div>
                  <div className="text-gray-600">纤维</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-2">健康评分:</span>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    analysisResult.healthScore >= 80 ? 'bg-green-100 text-green-700' :
                    analysisResult.healthScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {analysisResult.healthScore}分
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Ingredients */}
            {analysisResult.ingredients && analysisResult.ingredients.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-gray-800 mb-2">主要食材</h5>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.ingredients.map((ingredient: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Suggestions */}
            {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-gray-800 mb-2">营养建议</h5>
                <div className="space-y-2">
                  {analysisResult.suggestions.map((suggestion: string, index: number) => (
                    <div key={index} className="flex items-start">
                      <span className="text-orange-500 mr-2">•</span>
                      <span className="text-sm text-gray-700">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Alternative Results */}
            {analysisResult.alternatives && analysisResult.alternatives.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-gray-800 mb-2">其他可能结果</h5>
                <div className="space-y-2">
                  {analysisResult.alternatives.map((alt: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{alt.name}</span>
                      <span className="text-xs text-gray-500">{alt.probability}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <motion.button
              onClick={() => {
                setSelectedImage(null);
                setSelectedFile(null);
                setAnalysisResult(null);
                setError(null);
              }}
              className="w-full py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              重新分析
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}