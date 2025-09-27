import React, { useState, useEffect } from 'react';
import { Camera, BookOpen, User, Sparkles, TrendingUp, Heart, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const userName = user?.email?.split('@')[0] || '用户';
  const [todayRecommendation] = useState({
    dish: '宫保鸡丁',
    reason: '根据您的饮食偏好和营养需求推荐',
    calories: 320,
    healthScore: 85
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getMealTime = () => {
    const hour = currentTime.getHours();
    if (hour < 10) return '早餐';
    if (hour < 14) return '午餐';
    if (hour < 18) return '下午茶';
    return '晚餐';
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-md shadow-sm border-b border-orange-100"
      >
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">智能选择助手</h1>
              <p className="text-sm text-gray-600">
                {getGreeting()}，{userName}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/profile')}
              className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg"
            >
              <User className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Today's Recommendation Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Sparkles className="w-6 h-6 mr-2" />
              <span className="font-semibold">今日推荐</span>
            </div>
            <span className="text-sm opacity-90">{getMealTime()}时光</span>
          </div>
          
          <div className="mb-4">
            <h3 className="text-2xl font-bold mb-2">{todayRecommendation.dish}</h3>
            <p className="text-sm opacity-90 mb-3">{todayRecommendation.reason}</p>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <span className="font-medium">{todayRecommendation.calories}</span>
                <span className="ml-1 opacity-75">卡路里</span>
              </div>
              <div className="flex items-center">
                <Heart className="w-4 h-4 mr-1" />
                <span className="font-medium">{todayRecommendation.healthScore}</span>
                <span className="ml-1 opacity-75">健康分</span>
              </div>
            </div>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-white bg-opacity-20 backdrop-blur-sm rounded-xl py-3 font-medium hover:bg-opacity-30 transition-all"
          >
            查看详情
          </motion.button>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/photo-analysis')}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 group border border-orange-100"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
              <Camera className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">拍照识别</h3>
            <p className="text-sm text-gray-600">上传外卖截图获取推荐</p>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/food-record')}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 group border border-orange-100"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">饮食记录</h3>
            <p className="text-sm text-gray-600">记录和管理您的饮食</p>
          </motion.button>
        </motion.div>

        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-orange-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">今日概览</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-orange-600">2</span>
              </div>
              <p className="text-sm text-gray-600">已用餐</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-purple-600">800</span>
              </div>
              <p className="text-sm text-gray-600">卡路里</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-green-600">85</span>
              </div>
              <p className="text-sm text-gray-600">健康分</p>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-orange-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">最近活动</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between p-3 bg-orange-50/50 rounded-xl border border-orange-100"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <Camera className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">识别了外卖菜单</p>
                  <p className="text-xs text-gray-600">2小时前</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">记录了午餐</p>
                  <p className="text-xs text-gray-600">4小时前</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-between p-3 bg-yellow-50/50 rounded-xl border border-yellow-100"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  <Heart className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">获得健康建议</p>
                  <p className="text-xs text-gray-600">昨天</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom Spacing */}
        <div className="h-20"></div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="flex items-center justify-around">
            <button className="flex flex-col items-center py-2 px-4 text-blue-600">
              <div className="w-6 h-6 mb-1">
                <div className="w-full h-full bg-blue-600 rounded-full"></div>
              </div>
              <span className="text-xs font-medium">首页</span>
            </button>
            
            <button
              onClick={() => navigate('/photo-analysis')}
              className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600"
            >
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-xs">拍照</span>
            </button>
            
            <button
              onClick={() => navigate('/food-record')}
              className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600"
            >
              <BookOpen className="w-6 h-6 mb-1" />
              <span className="text-xs">记录</span>
            </button>
            
            <button
              onClick={() => navigate('/profile')}
              className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600"
            >
              <User className="w-6 h-6 mb-1" />
              <span className="text-xs">我的</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}