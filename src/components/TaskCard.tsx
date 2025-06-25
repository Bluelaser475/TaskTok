import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Target, Zap, Plus, Check, X, ChevronDown, Lock } from 'lucide-react';
import { Task } from '../types/task';
import { shouldDisplayDueDate } from '../utils/dateUtils';

interface TaskCardProps {
  task: Task;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onAddSubtask?: (taskId: string, subtaskText: string) => void;
}

const priorityColors = {
  high: 'from-red-500 via-pink-500 to-purple-600',
  medium: 'from-orange-400 via-yellow-500 to-green-500',
  low: 'from-blue-400 via-teal-500 to-green-400'
};

const priorityIcons = {
  high: <Zap className="w-5 h-5" />,
  medium: <Target className="w-5 h-5" />,
  low: <Clock className="w-5 h-5" />
};

export function TaskCard({ task, onToggleSubtask, onCompleteTask, onAddSubtask }: TaskCardProps) {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [previousProgress, setPreviousProgress] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const progress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0;
  const allSubtasksCompleted = task.subtasks.length > 0 && completedSubtasks === task.subtasks.length;
  const showDueDate = shouldDisplayDueDate(task.dueDate, task.priority);
  const isDummyTask = task.id.startsWith('dummy-');

  // Track progress changes for smooth animation
  useEffect(() => {
    if (progress !== previousProgress) {
      setPreviousProgress(progress);
    }
  }, [progress, previousProgress]);

  // Preload image for better performance
  useEffect(() => {
    if (task.imageUrl && !imageError) {
      const img = new Image();
      img.onload = () => setImageLoaded(true);
      img.onerror = () => setImageError(true);
      img.src = task.imageUrl;
    }
  }, [task.imageUrl, imageError]);

  const handleAddSubtask = () => {
    if (newSubtaskText.trim() && onAddSubtask && !isDummyTask) {
      onAddSubtask(task.id, newSubtaskText.trim());
      setNewSubtaskText('');
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = (subtaskId: string) => {
    if (!isDummyTask) {
      onToggleSubtask(task.id, subtaskId);
    }
  };

  const handleCompleteTask = () => {
    if (!isDummyTask) {
      onCompleteTask(task.id);
    }
  };

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden snap-start flex items-center justify-center"
      initial={{ opacity: 0, y: 50 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: task.completed ? [1, 1.02, 1] : 1,
        boxShadow: task.completed 
          ? [
              '0 0 0 rgba(34, 197, 94, 0)',
              '0 0 30px rgba(34, 197, 94, 0.4)',
              '0 0 0 rgba(34, 197, 94, 0)'
            ]
          : '0 0 0 rgba(34, 197, 94, 0)'
      }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ 
        duration: 0.5,
        scale: { duration: 1.2, times: [0, 0.5, 1] },
        boxShadow: { duration: 1.5, times: [0, 0.5, 1] }
      }}
      // Optimize for GPU acceleration
      style={{ 
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform'
      }}
    >
      {/* Enhanced Progress Bar at Top with Smooth Animation */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-black/20">
        <motion.div
          className="h-full bg-gradient-to-r from-white to-yellow-300"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut",
            type: "tween"
          }}
          style={{ willChange: 'width' }}
        />
        {/* Completion Glow Effect */}
        {progress === 100 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400"
            initial={{ opacity: 0, scale: 1 }}
            animate={{ 
              opacity: [0, 0.8, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 1.2,
              times: [0, 0.5, 1],
              ease: "easeInOut"
            }}
          />
        )}
      </div>

      {/* Optimized Background Image with Loading States */}
      {task.imageUrl && !imageError && (
        <div className="absolute inset-0">
          {/* Loading placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
          )}
          
          {/* Actual image */}
          <div 
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ 
              backgroundImage: imageLoaded ? `url(${task.imageUrl})` : 'none',
              transform: 'translateZ(0)', // GPU acceleration
              willChange: 'opacity'
            }}
          />
        </div>
      )}
      
      {/* Background Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${priorityColors[task.priority]} opacity-90`} />
      
      {/* Glass Overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />

      {/* Bolt Badge - Positioned relative to task card */}
      <a 
        href="https://bolt.new" 
        target="_blank" 
        rel="noopener noreferrer"
        className="absolute top-[80px] right-4 z-30"
      >
        <img 
          src="/white_circle_360x360 copy.png" 
          alt="Powered by Bolt.new" 
          className="w-12 h-12 rounded-full object-cover"
          loading="lazy"
        />
      </a>

      {/* Centered Content Container with optimized layout */}
      <div className="relative w-full max-w-md mx-auto px-4 py-8 pl-8 pr-4 sm:pl-10 sm:pr-8 sm:py-12 pt-[160px] pb-[120px]">
        {/* Task Header */}
        <motion.div 
          className="text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Task Title - Large and Prominent */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 sm:mb-6 leading-tight font-task-title">
            {task.title}
          </h1>

          {/* Priority Indicator - Small, below title */}
          <div className="flex items-center justify-center space-x-2 text-white/80 mb-4 sm:mb-6">
            {priorityIcons[task.priority]}
            <span className="text-sm font-medium capitalize font-general-sans">{task.priority} Priority</span>
          </div>

          {/* Conditional Due Date/Time Display */}
          {showDueDate && (
            <div className="flex items-center justify-center space-x-4 text-white/70 text-sm mb-4 sm:mb-6 font-general-sans">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{task.estimatedTime}min</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Motivational Quote - Helpful Tip Section */}
        {task.motivationalQuote && (
          <motion.div 
            className="mb-8 sm:mb-12 p-4 sm:p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-white/90 text-sm sm:text-base leading-relaxed font-general-sans">{task.motivationalQuote}</p>
          </motion.div>
        )}

        {/* View Subtasks Button - Optimized for performance */}
        <motion.div
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <motion.button
            className="w-full p-3 sm:p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 text-white/70 hover:text-white/90 hover:bg-white/10 transition-all duration-200 font-supreme"
            onClick={() => setShowSubtasks(!showSubtasks)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            style={{ willChange: 'transform' }}
          >
            <div className="flex items-center justify-center space-x-3">
              <span className="font-medium text-sm sm:text-base">Subtasks</span>
              <motion.span 
                className="text-xs sm:text-sm text-white/60 font-general-sans"
                animate={completedSubtasks !== previousProgress ? {
                  scale: [1, 1.2, 1],
                  color: ['rgba(255,255,255,0.6)', 'rgba(34,197,94,0.8)', 'rgba(255,255,255,0.6)']
                } : {}}
                transition={{ duration: 0.6 }}
              >
                {completedSubtasks}/{task.subtasks.length}
              </motion.span>
              <motion.div
                animate={{ rotate: showSubtasks ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                style={{ willChange: 'transform' }}
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </div>
          </motion.button>

          {/* Subtasks List with optimized animations */}
          <AnimatePresence>
            {showSubtasks && (
              <motion.div
                className="mt-4 sm:mt-6 space-y-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{ willChange: 'height, opacity' }}
              >
                {task.subtasks.map((subtask, index) => (
                  <motion.div
                    key={subtask.id}
                    className="flex items-center space-x-3 p-3 sm:p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }} // Reduced delay for faster loading
                  >
                    <motion.button
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        subtask.completed
                          ? 'bg-green-500 border-green-500'
                          : isDummyTask
                          ? 'border-white/30 cursor-not-allowed'
                          : 'border-white/50 hover:border-white/80'
                      }`}
                      onClick={() => handleToggleSubtask(subtask.id)}
                      whileHover={isDummyTask ? {} : { scale: 1.1 }}
                      whileTap={isDummyTask ? {} : { scale: 0.9 }}
                      animate={subtask.completed ? {
                        scale: [1, 1.3, 1],
                        boxShadow: [
                          '0 0 0 rgba(34, 197, 94, 0)',
                          '0 0 15px rgba(34, 197, 94, 0.6)',
                          '0 0 0 rgba(34, 197, 94, 0)'
                        ]
                      } : {}}
                      transition={{ duration: 0.8 }}
                      disabled={isDummyTask}
                      style={{ willChange: 'transform' }}
                    >
                      {subtask.completed && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500 }}
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                      {isDummyTask && !subtask.completed && (
                        <Lock className="w-3 h-3 text-white/40" />
                      )}
                    </motion.button>
                    
                    <span
                      className={`text-xs sm:text-sm flex-1 font-general-sans ${
                        subtask.completed 
                          ? 'text-white/60 line-through' 
                          : isDummyTask
                          ? 'text-white/70'
                          : 'text-white/90'
                      }`}
                    >
                      {subtask.text}
                    </span>
                  </motion.div>
                ))}

                {/* Add Subtask Input - Only for non-dummy tasks */}
                <AnimatePresence>
                  {!isDummyTask && (
                    <>
                      {isAddingSubtask ? (
                        <motion.div
                          className="flex space-x-2 p-3 sm:p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <input
                            type="text"
                            value={newSubtaskText}
                            onChange={(e) => setNewSubtaskText(e.target.value)}
                            className="flex-1 bg-transparent text-white placeholder-white/50 focus:outline-none text-xs sm:text-sm font-general-sans"
                            placeholder="Enter new subtask..."
                            onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                            autoFocus
                          />
                          <motion.button
                            className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-300 hover:bg-green-500/30"
                            onClick={handleAddSubtask}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Check className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center text-red-300 hover:bg-red-500/30"
                            onClick={() => {
                              setIsAddingSubtask(false);
                              setNewSubtaskText('');
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </motion.div>
                      ) : (
                        onAddSubtask && !task.completed && (
                          <motion.button
                            className="flex items-center justify-center space-x-2 p-3 sm:p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 text-white/60 hover:text-white/80 hover:bg-white/10 font-supreme"
                            onClick={() => setIsAddingSubtask(true)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-xs sm:text-sm">Add subtask</span>
                          </motion.button>
                        )
                      )}
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Complete Task Button - Only for non-dummy tasks */}
        {!isDummyTask && allSubtasksCompleted && !task.completed && (
          <motion.button
            className="w-full p-3 sm:p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl text-white font-semibold text-center font-supreme"
            onClick={handleCompleteTask}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            style={{ willChange: 'transform' }}
          >
            Complete Task ✨
          </motion.button>
        )}

        {/* Demo Task Call-to-Action */}
        {isDummyTask && (
          <motion.div
            className="w-full p-3 sm:p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl border border-white/20 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <motion.p
              className="text-white/90 font-medium text-xs sm:text-sm font-general-sans"
              animate={{ scale: [1, 1.01, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              This is a Demo Task. Create tasks to unlock full functionality and see how TaskTok works.
            </motion.p>
          </motion.div>
        )}

        {/* Enhanced Completed State */}
        {task.completed && (
          <motion.div
            className="w-full p-3 sm:p-4 bg-green-500/20 backdrop-blur-sm rounded-2xl border border-green-500/30 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              boxShadow: [
                '0 0 0 rgba(34, 197, 94, 0)',
                '0 0 25px rgba(34, 197, 94, 0.4)',
                '0 0 0 rgba(34, 197, 94, 0)'
              ]
            }}
            transition={{ 
              delay: 0.8,
              boxShadow: { duration: 2, times: [0, 0.5, 1] }
            }}
          >
            <motion.p 
              className="text-green-300 font-semibold text-xs sm:text-sm font-general-sans"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 1.5,
                times: [0, 0.5, 1],
                ease: "easeInOut"
              }}
            >
              ✅ Task Completed
            </motion.p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}