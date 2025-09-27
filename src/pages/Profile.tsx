import React, { useState } from 'react';
import { ArrowLeft, User, Settings, Heart, Award, LogOut, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const navigate = useNavigate();
  const { user: authUser, signOut } = useAuth();
  const [user, setUser] = useState({
    name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || '用户',
    email: authUser?.email || '',
    avatar: '',
    membershipType: 'premium', // 'free' | 'premium'
    joinDate: '2024-01-15',
    totalChoices: 156,
    healthScore: 85
  });

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user.name,
    email: user.email
  });

  const handleSaveProfile = () => {
    setUser({ ...user, ...editForm });
    setShowEditProfile(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-shadow border border-orange-100"
          >
            <ArrowLeft className="w-5 h-5 text-orange-600" />
          </motion.button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent ml-4">个人中心</h1>
        </motion.div>

        {/* User Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-6 border border-orange-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt="头像" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-bold text-gray-800">{user.name}</h2>
                <p className="text-sm text-gray-600">{user.email}</p>
                <div className="flex items-center mt-1">
                  {user.membershipType === 'premium' ? (
                    <span className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-orange-400 to-amber-400 text-white text-xs rounded-full">
                      <Award className="w-3 h-3 mr-1" />
                      会员用户
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                      普通用户
                    </span>
                  )}
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowEditProfile(true)}
              className="p-2 rounded-full bg-orange-100 hover:bg-orange-200 transition-colors"
            >
              <Edit3 className="w-4 h-4 text-orange-600" />
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-orange-100"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Settings className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{user.totalChoices}</p>
              <p className="text-sm text-gray-600">总决策次数</p>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-orange-100"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Heart className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{user.healthScore}</p>
              <p className="text-sm text-gray-600">健康评分</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Menu Items */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg mb-6 border border-orange-100"
        >
          <div className="p-4">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-4">功能设置</h3>
            
            <div className="space-y-1">
              <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 237, 213, 0.5)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-50 rounded-xl transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                    <Settings className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-gray-800">偏好设置</span>
                </div>
                <span className="text-orange-400">›</span>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 237, 213, 0.5)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-50 rounded-xl transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                    <Heart className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-gray-800">健康目标</span>
                </div>
                <span className="text-orange-400">›</span>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 237, 213, 0.5)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-50 rounded-xl transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span className="text-gray-800">会员服务</span>
                </div>
                <span className="text-orange-400">›</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg flex items-center justify-center hover:bg-red-50 transition-colors group border border-orange-100"
        >
          <LogOut className="w-5 h-5 text-red-600 mr-2 group-hover:text-red-700" />
          <span className="text-red-600 font-medium group-hover:text-red-700">退出登录</span>
        </motion.button>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {showEditProfile && (
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
              <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-4">编辑个人信息</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white/70"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white/70"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors"
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveProfile}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 transition-colors"
                >
                  保存
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