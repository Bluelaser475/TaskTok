import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, LogOut, User } from 'lucide-react';
import { UserStats } from '../types/task';
import { useAuth } from '../hooks/useAuth';

interface StatsBarProps {
  stats: UserStats;
  onTitleClick?: () => void;
  onLoginClick?: () => void;
}

export function StatsBar({ stats, onTitleClick, onLoginClick }: StatsBarProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleAuthClick = () => {
    if (onLoginClick) {
      onLoginClick();
    }
  };

  // Calculate progress percentage
  const progressPercentage = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;
  
  // SVG circle properties
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-40 bg-black/20 backdrop-blur-md border-b border-white/10"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="px-4 py-3 sm:px-6 sm:py-4">
        <div className="grid grid-cols-3 items-center">
          {/* Left: XP and Level */}
          <div className="flex items-center space-x-2 justify-self-start">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
            </div>
            <div className="text-left">
              <div className="text-white text-xs sm:text-sm font-medium leading-none font-general-sans">{stats.totalXP} XP</div>
              <div className="text-white/60 text-xs leading-none mt-0.5 font-general-sans">Level {stats.level}</div>
            </div>
          </div>

          {/* Center: Title - Perfectly Centered */}
          <motion.button
            className="text-xl sm:text-3xl font-bold text-white tracking-wide font-logo hover:text-white/80 transition-colors cursor-pointer justify-self-center"
            onClick={onTitleClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            TaskTok
          </motion.button>

          {/* Right: Circular Progress Ring and Auth */}
          <div className="flex items-center space-x-2 sm:space-x-4 justify-self-end">
            {/* Circular Progress Ring */}
            <div className="relative w-9 h-9 sm:w-11 sm:h-11">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 40 40"
              >
                {/* Background circle */}
                <circle
                  cx="20"
                  cy="20"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="3"
                  fill="transparent"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="20"
                  cy="20"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.9)"
                  strokeWidth="3"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </svg>
              {/* Completed tasks count in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm font-semibold font-general-sans">
                  {stats.completedTasks}
                </span>
              </div>
            </div>
            
            {/* Auth Button or Sign Out */}
            {user ? (
              <motion.button
                onClick={handleSignOut}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 text-white/80 hover:text-white hover:bg-white/20 font-supreme"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>
            ) : (
              <motion.button
                onClick={handleAuthClick}
                className="h-9 px-4 sm:h-11 sm:px-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-semibold shadow-lg flex items-center space-x-2 hover:from-purple-600 hover:to-pink-600 border border-white/20 font-supreme"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">Login</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}