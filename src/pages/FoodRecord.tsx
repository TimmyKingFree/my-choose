import React, { useState } from 'react';
import { ArrowLeft, Plus, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface FoodRecord {
  id: string;
  meal: 'breakfast' | 'lunch' | 'dinner';
  food: string;
  calories: number;
  time: string;
  date: string;
}

export default function FoodRecord() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    meal: 'lunch' as const,
    food: '',
    calories: 0
  });

  // 模拟数据
  const [records, setRecords] = useState<FoodRecord[]>([
    {
      id: '1',
      meal: 'breakfast',
      food: '燕麦粥 + 鸡蛋',
      calories: 280,
      time: '08:30',
      date: new Date().toISOString().split('T')[0]
    },
    {
      id: '2',
      meal: 'lunch',
      food: '宫保鸡丁 + 米饭',
      calories: 520,
      time: '12:15',
      date: new Date().toISOString().split('T')[0]
    }
  ]);

  const getMealName = (meal: string) => {
    const names = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
    return names[meal as keyof typeof names];
  };

  const getTotalCalories = () => {
    return records
      .filter(record => record.date === selectedDate)
      .reduce((total, record) => total + record.calories, 0);
  };

  const addRecord = () => {
    if (!newRecord.food || !newRecord.calories) return;
    
    const record: FoodRecord = {
      id: Date.now().toString(),
      ...newRecord,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      date: selectedDate
    };
    
    setRecords([...records, record]);
    setNewRecord({ meal: 'lunch', food: '', calories: 0 });
    setShowAddForm(false);
  };

  const filteredRecords = records.filter(record => record.date === selectedDate);
  const recordsByMeal = {
    breakfast: filteredRecords.filter(r => r.meal === 'breakfast'),
    lunch: filteredRecords.filter(r => r.meal === 'lunch'),
    dinner: filteredRecords.filter(r => r.meal === 'dinner')
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow border border-orange-100"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </motion.button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent ml-4">饮食记录</h1>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddForm(true)}
            className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Date Selector */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg mb-6 border border-orange-100"
        >
          <div className="flex items-center mb-3">
            <Calendar className="w-5 h-5 text-orange-600 mr-2" />
            <span className="font-semibold text-gray-800">选择日期</span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/50"
          />
        </motion.div>

        {/* Daily Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-6 border border-orange-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">今日摄入</h3>
              <p className="text-3xl font-bold text-orange-600">{getTotalCalories()}</p>
              <p className="text-sm text-gray-600">卡路里</p>
            </div>
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="mt-4 bg-orange-50/50 rounded-xl p-3 border border-orange-100">
            <div className="flex justify-between text-sm">
              <span>建议摄入: 1800-2000 卡路里</span>
              <span className={getTotalCalories() > 2000 ? 'text-red-600' : 'text-orange-600'}>
                {getTotalCalories() > 2000 ? '超标' : '正常'}
              </span>
            </div>
          </div>
        </motion.div>
        {/* Meal Records */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => (
            <motion.div 
              key={mealType} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + (['breakfast', 'lunch', 'dinner'].indexOf(mealType) * 0.1) }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-orange-100"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {getMealName(mealType)}
              </h3>
              
              {recordsByMeal[mealType].length > 0 ? (
                <div className="space-y-3">
                  {recordsByMeal[mealType].map((record) => (
                    <motion.div 
                      key={record.id} 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-between items-center p-3 bg-orange-50/30 rounded-xl border border-orange-100"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{record.food}</p>
                        <p className="text-sm text-gray-600">{record.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">{record.calories}</p>
                        <p className="text-xs text-gray-600">卡路里</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>暂无{getMealName(mealType)}记录</p>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Add Record Modal */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 w-full max-w-sm border border-orange-100"
              >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">添加饮食记录</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">餐次</label>
                  <select
                    value={newRecord.meal}
                    onChange={(e) => setNewRecord({...newRecord, meal: e.target.value as any})}
                    className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white/70"
                  >
                    <option value="breakfast">早餐</option>
                    <option value="lunch">午餐</option>
                    <option value="dinner">晚餐</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">食物</label>
                  <input
                    type="text"
                    value={newRecord.food}
                    onChange={(e) => setNewRecord({...newRecord, food: e.target.value})}
                    placeholder="请输入食物名称"
                    className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white/70"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">卡路里</label>
                  <input
                    type="number"
                    value={newRecord.calories || ''}
                    onChange={(e) => setNewRecord({...newRecord, calories: parseInt(e.target.value) || 0})}
                    placeholder="请输入卡路里"
                    className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white/70"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors"
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addRecord}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 transition-colors"
                >
                  添加
                </motion.button>
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}