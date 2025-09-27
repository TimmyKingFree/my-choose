import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, ArrowLeft, AlertCircle, Utensils, ShoppingBag, Bookmark, RotateCcw, History, X, Play, Pause, BarChart3, Download, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeFoodWithQwenAI, analyzeTakeoutMenuWithQwenAI, TakeoutAnalysisResult } from '../services/qwenAI';

type AnalysisMode = 'food' | 'takeout';

interface BatchImageItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
}

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  analyzing: number;
  pending: number;
}

export default function PhotoAnalysis() {
  const navigate = useNavigate();
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('food');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any | TakeoutAnalysisResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);
  
  // Batch analysis states
  const [batchImages, setBatchImages] = useState<BatchImageItem[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({ total: 0, completed: 0, failed: 0, analyzing: 0, pending: 0 });
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchPaused, setBatchPaused] = useState(false);
  const [showBatchResults, setShowBatchResults] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [batchStartTime, setBatchStartTime] = useState<number | null>(null);
  
  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage on component mount
  React.useEffect(() => {
    const savedHistory = localStorage.getItem('photoAnalysisHistory');
    if (savedHistory) {
      try {
        setAnalysisHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to load analysis history:', error);
      }
    }
  }, []);

  // Save to history when analysis completes
  const saveToHistory = (result: any, mode: string, imageUrl: string) => {
    const historyItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      mode,
      result,
      imageUrl,
      title: mode === 'food' ? result.name || '未知菜品' : result.restaurant?.name || '外卖订单'
    };
    
    const updatedHistory = [historyItem, ...analysisHistory].slice(0, 20); // Keep only last 20 items
    setAnalysisHistory(updatedHistory);
    localStorage.setItem('photoAnalysisHistory', JSON.stringify(updatedHistory));
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      if (batchMode) {
        addBatchImages(files);
      } else {
        const file = files[0];
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        setError(null);
        setAnalysisResult(null);
      }
    }
  }, [batchMode]);

  // Add images to batch
  const addBatchImages = (files: File[]) => {
    const maxFiles = 10;
    const currentCount = batchImages.length;
    const availableSlots = maxFiles - currentCount;
    const filesToAdd = files.slice(0, availableSlots);
    
    const newBatchImages: BatchImageItem[] = filesToAdd.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
      result: null,
      error: null
    }));
    
    setBatchImages(prev => [...prev, ...newBatchImages]);
    updateBatchProgress([...batchImages, ...newBatchImages]);
  };

  // Remove image from batch
  const removeBatchImage = (id: string) => {
    setBatchImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      updateBatchProgress(updated);
      return updated;
    });
  };

  // Update batch progress statistics
  const updateBatchProgress = (images: BatchImageItem[]) => {
    const progress = {
      total: images.length,
      completed: images.filter(img => img.status === 'completed').length,
      failed: images.filter(img => img.status === 'failed').length,
      analyzing: images.filter(img => img.status === 'analyzing').length,
      pending: images.filter(img => img.status === 'pending').length
    };
    setBatchProgress(progress);
  };

  // Calculate estimated time remaining
  const calculateEstimatedTime = (startTime: number, completed: number, total: number) => {
    if (completed === 0) return 0;
    const elapsed = Date.now() - startTime;
    const avgTimePerImage = elapsed / completed;
    const remaining = total - completed;
    return Math.round((avgTimePerImage * remaining) / 1000); // in seconds
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      if (batchMode) {
        addBatchImages(Array.from(files));
        setAnalysisResult(null);
        setError(null);
      } else {
        const file = files[0];
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        setError(null);
        setAnalysisResult(null);
      }
    }
  };

  // Batch analysis functions
  const startBatchAnalysis = async () => {
    if (batchImages.length === 0 || isBatchAnalyzing) return;
    
    setIsBatchAnalyzing(true);
    setBatchPaused(false);
    setBatchStartTime(Date.now());
    setShowBatchResults(false);
    
    const pendingImages = batchImages.filter(img => img.status === 'pending' || img.status === 'failed');
    
    // Process images with controlled concurrency (max 2 concurrent)
    const concurrency = 2;
    const processingQueue = [...pendingImages];
    const activePromises: Promise<void>[] = [];
    
    const processImage = async (imageItem: BatchImageItem): Promise<void> => {
      if (batchPaused) return;
      
      // Update image status to analyzing
      setBatchImages(prev => prev.map(img => 
        img.id === imageItem.id 
          ? { ...img, status: 'analyzing', progress: 0, error: null }
          : img
      ));
      
      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          if (!batchPaused) {
            setBatchImages(prev => prev.map(img => 
              img.id === imageItem.id && img.status === 'analyzing'
                ? { ...img, progress: Math.min(img.progress + Math.random() * 15, 90) }
                : img
            ));
          }
        }, 500);
        
        let result;
        if (analysisMode === 'food') {
          result = await analyzeFoodWithQwenAI(imageItem.file);
        } else {
          result = await analyzeTakeoutMenuWithQwenAI(imageItem.file);
        }
        
        clearInterval(progressInterval);
        
        // Update image with result
        setBatchImages(prev => prev.map(img => 
          img.id === imageItem.id 
            ? { ...img, status: 'completed', progress: 100, result }
            : img
        ));
        
        // Save to history
        saveToHistory(result, analysisMode, imageItem.preview);
        
      } catch (error: any) {
        console.error(`Analysis failed for image ${imageItem.id}:`, error);
        
        let errorMessage = '分析失败';
        if (error instanceof Error) {
          if (error.message.includes('network') || error.message.includes('timeout')) {
            errorMessage = '网络连接失败';
          } else if (error.message.includes('API key') || error.message.includes('unauthorized')) {
            errorMessage = 'API配置错误';
          } else if (error.message.includes('rate limit')) {
            errorMessage = '请求过于频繁';
          } else {
            errorMessage = error.message;
          }
        }
        
        setBatchImages(prev => prev.map(img => 
          img.id === imageItem.id 
            ? { ...img, status: 'failed', progress: 0, error: errorMessage }
            : img
        ));
      }
    };
    
    // Process images with concurrency control
    while (processingQueue.length > 0 && !batchPaused) {
      while (activePromises.length < concurrency && processingQueue.length > 0) {
        const imageItem = processingQueue.shift()!;
        const promise = processImage(imageItem).finally(() => {
          const index = activePromises.indexOf(promise);
          if (index > -1) {
            activePromises.splice(index, 1);
          }
        });
        activePromises.push(promise);
      }
      
      if (activePromises.length > 0) {
        await Promise.race(activePromises);
      }
      
      // Update estimated time
      if (batchStartTime) {
        const currentProgress = batchImages.filter(img => img.status === 'completed').length;
        const estimatedTime = calculateEstimatedTime(batchStartTime, currentProgress, batchImages.length);
        setEstimatedTimeRemaining(estimatedTime);
      }
    }
    
    // Wait for all remaining promises to complete
    await Promise.all(activePromises);
    
    // Save batch results to history
    const completedResults = batchImages.filter(img => img.status === 'completed' && img.result);
    if (completedResults.length > 0) {
      const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'batch',
        mode: analysisMode,
        totalImages: completedResults.length,
        results: completedResults.map(img => ({
          fileName: img.file.name,
          result: img.result
        })),
        summary: analysisMode === 'food' ? {
          totalCalories: completedResults.reduce((sum, img) => sum + (img.result?.calories || 0), 0),
          avgHealthScore: completedResults.reduce((sum, img) => sum + (img.result?.healthScore || 0), 0) / completedResults.length
        } : {
          totalOrders: completedResults.length,
          totalDishes: completedResults.reduce((sum, img) => sum + (img.result?.menuItems?.length || 0), 0),
          totalPrice: completedResults.reduce((sum, img) => 
            sum + (img.result?.menuItems?.reduce((dishSum: number, dish: any) => dishSum + (dish.price || 0), 0) || 0), 0)
        }
      };
      
      const existingHistory = JSON.parse(localStorage.getItem('photoAnalysisHistory') || '[]');
      const updatedHistory = [historyItem, ...existingHistory].slice(0, 50); // Keep last 50 records
      localStorage.setItem('photoAnalysisHistory', JSON.stringify(updatedHistory));
    }
    
    setIsBatchAnalyzing(false);
    setShowBatchResults(true);
    setEstimatedTimeRemaining(0);
  };
  
  const pauseBatchAnalysis = () => {
    setBatchPaused(true);
  };
  
  const resumeBatchAnalysis = () => {
    setBatchPaused(false);
    startBatchAnalysis();
  };
  
  const cancelBatchAnalysis = () => {
    setIsBatchAnalyzing(false);
    setBatchPaused(false);
    setBatchStartTime(null);
    setEstimatedTimeRemaining(0);
    
    // Reset analyzing images to pending
    setBatchImages(prev => prev.map(img => 
      img.status === 'analyzing' 
        ? { ...img, status: 'pending', progress: 0, error: null }
        : img
    ));
  };
  
  const retryFailedImages = () => {
    setBatchImages(prev => prev.map(img => 
      img.status === 'failed' 
        ? { ...img, status: 'pending', progress: 0, error: null }
        : img
    ));
  };
  
  const clearAllBatchImages = () => {
    setBatchImages([]);
    setBatchProgress({ total: 0, completed: 0, failed: 0, analyzing: 0, pending: 0 });
    setShowBatchResults(false);
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setAnalysisProgress(0);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);
      
      let result;
      if (analysisMode === 'food') {
        result = await analyzeFoodWithQwenAI(selectedFile);
        setAnalysisResult({
          mode: 'food',
          foodName: result.foodName,
          confidence: result.confidence,
          calories: result.calories,
          nutrition: result.nutrition,
          ingredients: result.ingredients,
          healthScore: result.healthScore,
          suggestions: result.suggestions,
          alternatives: result.alternatives
        });
      } else {
        result = await analyzeTakeoutMenuWithQwenAI(selectedFile);
        setAnalysisResult({
          mode: 'takeout',
          ...result
        });
      }
      
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      
      // Small delay to show 100% progress
      setTimeout(() => {
        setAnalysisProgress(0);
      }, 300);
      
      // 保存到历史记录
      if (selectedImage) {
        saveToHistory(result, analysisMode, selectedImage);
      }
      
    } catch (err: any) {
      console.error('分析失败:', err);
      setAnalysisProgress(0);
      
      // Enhanced error handling
      let errorMessage = '分析失败，请重试';
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('timeout')) {
          errorMessage = '网络连接失败，请检查网络后重试';
        } else if (err.message.includes('API key') || err.message.includes('unauthorized')) {
          errorMessage = 'API配置错误，请联系管理员';
        } else if (err.message.includes('rate limit')) {
          errorMessage = '请求过于频繁，请稍后再试';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-orange-100"
        >
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                返回首页
              </motion.button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                AI智能识别
              </h1>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 relative"
              >
                <History className="w-5 h-5 mr-2" />
                历史记录
                {analysisHistory.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                    {analysisHistory.length}
                  </span>
                )}
              </motion.button>
            </div>
          </div>
          </motion.div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Mode Selector */}
          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-8 border border-orange-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
          <div className="flex space-x-2">
            <motion.button
              onClick={() => {
                setAnalysisMode('food');
                setSelectedImage(null);
                setSelectedFile(null);
                setAnalysisResult(null);
                setError(null);
                setBatchMode(false);
                setSelectedFiles([]);
                setBatchResults([]);
              }}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-300 ${
                analysisMode === 'food'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Utensils className="w-5 h-5 mr-2" />
              菜品识别
            </motion.button>
            <motion.button
              onClick={() => {
                setAnalysisMode('takeout');
                setSelectedImage(null);
                setSelectedFile(null);
                setAnalysisResult(null);
                setError(null);
                setBatchMode(false);
                setSelectedFiles([]);
                setBatchResults([]);
              }}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-300 ${
                analysisMode === 'takeout'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              外卖识别
            </motion.button>
          </div>
          
          {/* Batch Mode Toggle */}
          <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-700">批量识别模式</span>
              <p className="text-xs text-gray-500 mt-1">一次上传多张图片进行批量分析</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setBatchMode(!batchMode);
                setSelectedFile(null);
                setSelectedImage(null);
                setSelectedFiles([]);
                setAnalysisResult(null);
                setBatchResults([]);
                setError(null);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                batchMode ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  batchMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </motion.button>
          </div>
        </motion.div>

          {/* Upload Area */}
          {!selectedImage && batchImages.length === 0 && (
            <motion.div 
              ref={dropZoneRef}
              className={`bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg mb-8 border transition-all duration-300 ${
                isDragOver ? 'border-blue-500 bg-blue-50/50' : 'border-orange-100'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
            <div className="text-center">
              <motion.div 
                className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Camera className="w-10 h-10 text-orange-600" />
              </motion.div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                {batchMode 
                  ? `批量${analysisMode === 'food' ? '菜品' : '外卖'}识别`
                  : analysisMode === 'food' ? '拍照或上传菜品图片' : '拍照或上传外卖界面'
                }
              </h2>
              <p className="text-gray-600 mb-6">
                {batchMode
                  ? `一次选择或拖拽多张${analysisMode === 'food' ? '菜品' : '外卖'}图片进行批量分析（最多10张）`
                  : analysisMode === 'food' 
                    ? '支持识别各种菜品，分析营养成分和热量' 
                    : '支持识别外卖APP截图，提取菜单信息和价格'
                }
              </p>
              <p className="text-gray-500 text-xs mb-6">支持 JPG、PNG 格式，最大 10MB</p>
              
              <motion.label 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 cursor-pointer shadow-lg"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Upload className="w-5 h-5 mr-2" />
                {batchMode ? '选择多张图片' : '选择图片'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple={batchMode}
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </motion.label>
            </div>
            </motion.div>
          )}

          {/* Batch Analysis Interface */}
          {batchMode && batchImages.length > 0 && (
            <motion.div 
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-8 border border-orange-100"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Batch Control Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    已选择 {batchImages.length} 张图片
                  </span>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{batchProgress.completed}</span>
                    <Clock className="w-4 h-4 text-blue-500 ml-2" />
                    <span>{batchProgress.analyzing}</span>
                    <XCircle className="w-4 h-4 text-red-500 ml-2" />
                    <span>{batchProgress.failed}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {batchProgress.failed > 0 && (
                    <button
                      onClick={retryFailedImages}
                      className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                      disabled={isBatchAnalyzing}
                    >
                      重试失败项
                    </button>
                  )}
                  <button
                    onClick={clearAllBatchImages}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-1"
                    disabled={isBatchAnalyzing}
                  >
                    <Trash2 className="w-3 h-3" />
                    清空
                  </button>
                </div>
              </div>

              {/* Overall Progress Bar */}
              {isBatchAnalyzing && (
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">批量分析进度</span>
                    <span className="text-gray-600">
                      {batchProgress.completed}/{batchProgress.total} 完成
                      {estimatedTimeRemaining > 0 && (
                        <span className="ml-2">预计剩余: {Math.ceil(estimatedTimeRemaining / 1000)}秒</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Images Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                {batchImages.map((imageItem) => (
                  <div key={imageItem.id} className="relative group bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="aspect-square relative">
                      <img
                        src={imageItem.preview}
                        alt={`预览 ${imageItem.id}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Status Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {imageItem.status === 'pending' && (
                          <Clock className="w-6 h-6 text-white" />
                        )}
                        {imageItem.status === 'analyzing' && (
                          <div className="text-center text-white">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-1"></div>
                            <div className="text-xs">{Math.round(imageItem.progress)}%</div>
                          </div>
                        )}
                        {imageItem.status === 'completed' && (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        )}
                        {imageItem.status === 'failed' && (
                          <XCircle className="w-6 h-6 text-red-400" />
                        )}
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeBatchImage(imageItem.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        disabled={isBatchAnalyzing && imageItem.status === 'analyzing'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {/* Image Info */}
                    <div className="p-2">
                      <div className="text-xs text-gray-600 truncate" title={imageItem.file.name}>
                        {imageItem.file.name}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          imageItem.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                          imageItem.status === 'analyzing' ? 'bg-blue-100 text-blue-600' :
                          imageItem.status === 'completed' ? 'bg-green-100 text-green-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {imageItem.status === 'pending' ? '等待中' :
                           imageItem.status === 'analyzing' ? '分析中' :
                           imageItem.status === 'completed' ? '已完成' : '失败'}
                        </span>
                        {imageItem.status === 'analyzing' && (
                          <div className="w-12 bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${imageItem.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                      {imageItem.error && (
                        <div className="text-xs text-red-500 mt-1 truncate" title={imageItem.error}>
                          {imageItem.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Batch Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                {!isBatchAnalyzing ? (
                  <motion.button
                    onClick={startBatchAnalysis}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold flex items-center gap-2 shadow-lg"
                    disabled={batchImages.length === 0 || batchImages.every(img => img.status === 'completed')}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Play className="w-4 h-4" />
                    开始批量分析
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-4">
                    {!batchPaused ? (
                      <motion.button
                        onClick={pauseBatchAnalysis}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 font-semibold flex items-center gap-2 shadow-lg"
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Pause className="w-4 h-4" />
                        暂停
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={resumeBatchAnalysis}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold flex items-center gap-2 shadow-lg"
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Play className="w-4 h-4" />
                        继续
                      </motion.button>
                    )}
                    <motion.button
                      onClick={cancelBatchAnalysis}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold shadow-lg"
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      取消
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Image Preview */}
          {selectedImage && (
            <motion.div 
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-8 border border-orange-100"
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
                className={`w-full py-3 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg relative overflow-hidden ${
                  isAnalyzing
                    ? 'bg-gradient-to-r from-orange-400 to-amber-400'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'
                }`}
                whileHover={{ scale: isAnalyzing ? 1 : 1.02, y: isAnalyzing ? 0 : -1 }}
                whileTap={{ scale: isAnalyzing ? 1 : 0.98 }}
              >
                {/* Progress Bar Background */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-white/20">
                    <motion.div
                      className="h-full bg-white/30"
                      initial={{ width: '0%' }}
                      animate={{ width: `${analysisProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-center relative z-10">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center mb-1">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        {analysisMode === 'food' ? 'AI识别中...' : '外卖识别中...'}
                      </div>
                      <span className="text-xs opacity-90">{Math.round(analysisProgress)}%</span>
                    </div>
                  ) : (
                    analysisMode === 'food' ? '开始AI识别' : '识别外卖菜单'
                  )}
                </div>
              </motion.button>
            )}
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div 
              className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                <div>
                  <span className="text-red-700 block">{error}</span>
                  <span className="text-red-600 text-sm mt-1 block">请检查网络连接或稍后重试</span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={analyzeImage}
                disabled={!selectedFile || isAnalyzing}
                className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-md transition-colors duration-200 flex items-center"
              >
                重试
              </motion.button>
            </div>
            </motion.div>
          )}

          {/* Batch Analysis Results Summary */}
          {batchMode && batchImages.some(img => img.status === 'completed' && img.result) && (
            <motion.div 
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-8 border border-green-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                  批量分析汇总
                </h3>
                <button
                  onClick={() => {
                    const completedResults = batchImages
                      .filter(img => img.status === 'completed' && img.result)
                      .map(img => ({ fileName: img.file.name, result: img.result }));
                    
                    const reportData = {
                      timestamp: new Date().toISOString(),
                      mode: analysisMode,
                      totalImages: completedResults.length,
                      results: completedResults
                    };
                    
                    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `batch-analysis-report-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出报告
                </button>
              </div>
              
              {(() => {
                const completedImages = batchImages.filter(img => img.status === 'completed' && img.result);
                if (completedImages.length === 0) return null;
                
                if (analysisMode === 'food') {
                  const totalCalories = completedImages.reduce((sum, img) => sum + (img.result?.calories || 0), 0);
                  const avgProtein = completedImages.reduce((sum, img) => sum + (img.result?.nutrition?.protein || 0), 0) / completedImages.length;
                  const avgFat = completedImages.reduce((sum, img) => sum + (img.result?.nutrition?.fat || 0), 0) / completedImages.length;
                  const avgCarbs = completedImages.reduce((sum, img) => sum + (img.result?.nutrition?.carbs || 0), 0) / completedImages.length;
                  const avgFiber = completedImages.reduce((sum, img) => sum + (img.result?.nutrition?.fiber || 0), 0) / completedImages.length;
                  const avgHealthScore = completedImages.reduce((sum, img) => sum + (img.result?.healthScore || 0), 0) / completedImages.length;
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="bg-red-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">{Math.round(totalCalories)}</div>
                        <div className="text-sm text-red-500">总卡路里</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{avgProtein.toFixed(1)}g</div>
                        <div className="text-sm text-blue-500">平均蛋白质</div>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-600">{avgFat.toFixed(1)}g</div>
                        <div className="text-sm text-yellow-500">平均脂肪</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{avgCarbs.toFixed(1)}g</div>
                        <div className="text-sm text-green-500">平均碳水</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-600">{avgFiber.toFixed(1)}g</div>
                        <div className="text-sm text-purple-500">平均纤维</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-orange-600">{avgHealthScore.toFixed(1)}</div>
                        <div className="text-sm text-orange-500">平均健康分</div>
                      </div>
                    </div>
                  );
                } else {
                  const allDishes = completedImages.flatMap(img => img.result?.menuItems || []);
                  const totalPrice = allDishes.reduce((sum, dish) => sum + (dish.price || 0), 0);
                  const avgCalories = allDishes.reduce((sum, dish) => sum + (dish.nutrition?.calories || 0), 0) / (allDishes.length || 1);
                  const restaurants = [...new Set(completedImages.map(img => img.result?.restaurant?.name).filter(Boolean))];
                  
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">{completedImages.length}</div>
                          <div className="text-sm text-green-500">外卖订单</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-600">{allDishes.length}</div>
                          <div className="text-sm text-blue-500">总菜品数</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-600">¥{totalPrice.toFixed(2)}</div>
                          <div className="text-sm text-red-500">总价格</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-orange-600">{Math.round(avgCalories)}</div>
                          <div className="text-sm text-orange-500">平均卡路里</div>
                        </div>
                      </div>
                      
                      {restaurants.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-2">涉及餐厅:</h4>
                          <div className="flex flex-wrap gap-2">
                            {restaurants.map((restaurant, index) => (
                              <span key={index} className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border">
                                {restaurant}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              })()}
            </motion.div>
          )}

          {/* Individual Batch Results */}
          {batchMode && batchImages.some(img => img.status === 'completed' && img.result) && (
            <motion.div 
              className="space-y-4 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">详细分析结果</h3>
              {batchImages
                .filter(img => img.status === 'completed' && img.result)
                .map((imageItem, index) => (
                  <motion.div 
                    key={imageItem.id}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <img 
                        src={imageItem.preview} 
                        alt={imageItem.file.name}
                        className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-800">{imageItem.file.name}</h4>
                        <p className="text-sm text-gray-600">分析完成</p>
                      </div>
                    </div>
                    
                    {/* Render individual result based on mode */}
                    {imageItem.result && (
                      <div className="border-t pt-4">
                        {analysisMode === 'food' ? (
                          <div className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h5 className="font-bold text-lg text-gray-800">{imageItem.result.foodName}</h5>
                                <p className="text-sm text-orange-600">置信度: {imageItem.result.confidence}%</p>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-orange-600">{imageItem.result.calories}</div>
                                <div className="text-sm text-gray-600">卡路里</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-3 text-sm">
                              <div className="text-center bg-white/60 rounded-lg p-2">
                                <div className="font-medium text-gray-800">{imageItem.result.nutrition?.protein || 0}g</div>
                                <div className="text-gray-600">蛋白质</div>
                              </div>
                              <div className="text-center bg-white/60 rounded-lg p-2">
                                <div className="font-medium text-gray-800">{imageItem.result.nutrition?.fat || 0}g</div>
                                <div className="text-gray-600">脂肪</div>
                              </div>
                              <div className="text-center bg-white/60 rounded-lg p-2">
                                <div className="font-medium text-gray-800">{imageItem.result.nutrition?.carbs || 0}g</div>
                                <div className="text-gray-600">碳水</div>
                              </div>
                              <div className="text-center bg-white/60 rounded-lg p-2">
                                <div className="font-medium text-gray-800">{imageItem.result.nutrition?.fiber || 0}g</div>
                                <div className="text-gray-600">纤维</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {imageItem.result.restaurant && (
                              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <h5 className="font-semibold text-gray-800">{imageItem.result.restaurant.name}</h5>
                                <p className="text-sm text-gray-600">菜系: {imageItem.result.restaurant.cuisine}</p>
                              </div>
                            )}
                            {imageItem.result.menuItems && imageItem.result.menuItems.length > 0 && (
                              <div className="text-sm text-gray-600">
                                识别到 {imageItem.result.menuItems.length} 道菜品，总价 ¥{imageItem.result.totalSummary?.totalPrice || 0}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))
              }
            </motion.div>
          )}

          {/* Single Analysis Result */}
          {analysisResult && !batchMode && (
            <motion.div 
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-orange-100 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {analysisResult.mode === 'food' ? 'AI识别结果' : '外卖菜单识别结果'}
            </h3>
            
            {analysisResult.mode === 'food' ? (
              /* Food Analysis Result */
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
            ) : (
              /* Takeout Analysis Result */
              <div className="space-y-4">
                {/* Restaurant Info */}
                {analysisResult.restaurant && (
                  <motion.div 
                    className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h4 className="font-bold text-lg text-gray-800 mb-2">{analysisResult.restaurant.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>菜系: {analysisResult.restaurant.cuisine}</span>
                      {analysisResult.restaurant.rating && (
                        <span>评分: {analysisResult.restaurant.rating}分</span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Menu Items */}
                {analysisResult.menuItems && analysisResult.menuItems.length > 0 && (
                  <div className="mb-6">
                    <h5 className="font-medium text-gray-800 mb-4 flex items-center">
                      <Utensils className="w-5 h-5 mr-2 text-orange-500" />
                      识别到的菜品 ({analysisResult.menuItems.length}道)
                    </h5>
                    <div className="space-y-4">
                      {analysisResult.menuItems.map((item: any, index: number) => (
                        <motion.div 
                          key={index}
                          className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h6 className="font-semibold text-gray-800 text-lg">{item.name}</h6>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{item.description}</p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-xl font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">¥{item.price}</div>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <div className="text-sm text-gray-500 line-through mt-1">¥{item.originalPrice}</div>
                              )}
                            </div>
                          </div>
                          
                          {item.nutrition && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                              <div className="bg-blue-50 p-2 rounded-lg text-center">
                                <div className="text-xs text-blue-600 font-medium">热量</div>
                                <div className="text-sm font-bold text-blue-800">{item.nutrition.calories || 'N/A'} kcal</div>
                              </div>
                              <div className="bg-green-50 p-2 rounded-lg text-center">
                                <div className="text-xs text-green-600 font-medium">蛋白质</div>
                                <div className="text-sm font-bold text-green-800">{item.nutrition.protein || 'N/A'}g</div>
                              </div>
                              <div className="bg-yellow-50 p-2 rounded-lg text-center">
                                <div className="text-xs text-yellow-600 font-medium">脂肪</div>
                                <div className="text-sm font-bold text-yellow-800">{item.nutrition.fat || 'N/A'}g</div>
                              </div>
                              <div className="bg-purple-50 p-2 rounded-lg text-center">
                                <div className="text-xs text-purple-600 font-medium">碳水</div>
                                <div className="text-sm font-bold text-purple-800">{item.nutrition.carbs || 'N/A'}g</div>
                              </div>
                            </div>
                          )}
                          
                          {item.healthScore && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-700">健康评分</span>
                              <div className="flex items-center flex-1 mx-4">
                                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.healthScore}%` }}
                                    transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                                    className={`h-3 rounded-full ${
                                      item.healthScore >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                                      item.healthScore >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                                      'bg-gradient-to-r from-red-400 to-red-600'
                                    }`}
                                  ></motion.div>
                                </div>
                              </div>
                              <span className={`text-sm font-bold ${
                                item.healthScore >= 80 ? 'text-green-600' :
                                item.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>{item.healthScore}/100</span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total Summary */}
                {analysisResult.totalSummary && (
                  <div className="mb-6">
                    <h5 className="font-medium text-gray-800 mb-4 flex items-center">
                      <ShoppingBag className="w-5 h-5 mr-2 text-green-500" />
                      订单汇总
                    </h5>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="p-6 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 rounded-2xl border border-orange-200 shadow-lg"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Total Calories */}
                        <div className="text-center p-4 bg-white/70 rounded-xl backdrop-blur-sm">
                          <div className="text-3xl font-bold text-orange-600 mb-1">{analysisResult.totalSummary.totalCalories}</div>
                          <div className="text-sm text-gray-600 font-medium">总卡路里</div>
                          <div className="text-xs text-orange-500 mt-1">kcal</div>
                        </div>
                        
                        {/* Total Price */}
                        <div className="text-center p-4 bg-white/70 rounded-xl backdrop-blur-sm">
                          <div className="text-3xl font-bold text-green-600 mb-1">¥{analysisResult.totalSummary.totalPrice}</div>
                          <div className="text-sm text-gray-600 font-medium">总价格</div>
                          <div className="text-xs text-green-500 mt-1">RMB</div>
                        </div>
                        
                        {/* Average Health Score */}
                        <div className="text-center p-4 bg-white/70 rounded-xl backdrop-blur-sm col-span-2 md:col-span-1">
                          <div className={`text-3xl font-bold mb-1 ${
                            analysisResult.totalSummary.healthScore >= 80 ? 'text-green-600' :
                            analysisResult.totalSummary.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>{analysisResult.totalSummary.healthScore}</div>
                          <div className="text-sm text-gray-600 font-medium">平均健康评分</div>
                          <div className="text-xs text-gray-500 mt-1">/100</div>
                        </div>
                      </div>
                      
                      {/* Nutrition Breakdown */}
                      <div className="mt-6 pt-4 border-t border-white/50">
                        <h6 className="text-sm font-medium text-gray-700 mb-3 text-center">营养成分总计</h6>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-blue-100/50 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">{analysisResult.totalSummary.totalProtein}g</div>
                            <div className="text-xs text-blue-700 font-medium">蛋白质</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-100/50 rounded-lg">
                            <div className="text-lg font-bold text-yellow-600">{analysisResult.totalSummary.totalFat}g</div>
                            <div className="text-xs text-yellow-700 font-medium">脂肪</div>
                          </div>
                          <div className="text-center p-3 bg-purple-100/50 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">{analysisResult.totalSummary.totalCarbs}g</div>
                            <div className="text-xs text-purple-700 font-medium">碳水</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            )}
            
            {/* Food Mode: Ingredients, Suggestions, Alternatives */}
            {analysisResult.mode === 'food' && (
              <>
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
              </>
            )}

            {/* Takeout Mode: Dietary Recommendations */}
            {analysisResult.mode === 'takeout' && analysisResult.recommendations && (
              <div className="mb-4">
                <h5 className="font-medium text-gray-800 mb-3">饮食建议</h5>
                <div className="space-y-3">
                  {/* Health Assessment */}
                  {analysisResult.recommendations.healthAssessment && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h6 className="font-medium text-blue-800 mb-2">健康评估</h6>
                      <p className="text-sm text-blue-700">{analysisResult.recommendations.healthAssessment}</p>
                    </div>
                  )}
                  
                  {/* Recommended Items */}
                  {analysisResult.recommendations.recommendedItems && analysisResult.recommendations.recommendedItems.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <h6 className="font-medium text-green-800 mb-2">推荐菜品</h6>
                      <div className="space-y-1">
                        {analysisResult.recommendations.recommendedItems.map((item: string, index: number) => (
                          <div key={index} className="flex items-start">
                            <span className="text-green-600 mr-2">✓</span>
                            <span className="text-sm text-green-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Items to Avoid */}
                  {analysisResult.recommendations.itemsToAvoid && analysisResult.recommendations.itemsToAvoid.length > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <h6 className="font-medium text-red-800 mb-2">建议避免</h6>
                      <div className="space-y-1">
                        {analysisResult.recommendations.itemsToAvoid.map((item: string, index: number) => (
                          <div key={index} className="flex items-start">
                            <span className="text-red-600 mr-2">⚠</span>
                            <span className="text-sm text-red-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* General Tips */}
                  {analysisResult.recommendations.tips && analysisResult.recommendations.tips.length > 0 && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h6 className="font-medium text-yellow-800 mb-2">饮食小贴士</h6>
                      <div className="space-y-1">
                        {analysisResult.recommendations.tips.map((tip: string, index: number) => (
                          <div key={index} className="flex items-start">
                            <span className="text-yellow-600 mr-2">💡</span>
                            <span className="text-sm text-yellow-700">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Save to Diet Record Button */}
            <div className="flex justify-center mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  // TODO: Implement save to diet record functionality
                  alert(analysisResult.mode === 'takeout' ? '外卖菜单已保存到饮食记录' : '菜品信息已保存到饮食记录');
                }}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <div className="flex items-center">
                  <Bookmark className="w-5 h-5 mr-2" />
                  保存到饮食记录
                </div>
              </motion.button>
            </div>
            
            <motion.button
              onClick={() => {
                setSelectedImage(null);
                setSelectedFile(null);
                setAnalysisResult(null);
                setError(null);
              }}
              className="w-full py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg mt-4"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center">
                <RotateCcw className="w-5 h-5 mr-2" />
                重新分析
              </div>
            </motion.button>
            </motion.div>
          )}
          
          {/* History Section */}
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-orange-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <History className="w-5 h-5 mr-2 text-orange-600" />
                    分析历史
                  </h3>
                  {analysisHistory.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setAnalysisHistory([]);
                        localStorage.removeItem('photoAnalysisHistory');
                      }}
                      className="text-sm text-red-600 hover:text-red-700 transition-colors duration-200"
                    >
                      清空历史
                    </motion.button>
                  )}
                </div>
                
                {analysisHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>暂无分析历史</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {analysisHistory.map((item) => (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setAnalysisResult(item.result);
                          setAnalysisMode(item.mode);
                          setSelectedImage(item.imageUrl);
                          setShowHistory(false);
                        }}
                        className="flex items-center p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                      >
                        <img
                          src={item.imageUrl}
                          alt="历史图片"
                          className="w-12 h-12 object-cover rounded-lg mr-3"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800 text-sm">
                            {item.mode === 'food' ? '菜品识别' : '外卖识别'}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}