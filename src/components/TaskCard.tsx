import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Target, Zap, Plus, Check, X, ChevronDown, Lock, CheckCircle2 } from 'lucide-react';
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
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);

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

  const handleCompleteTaskClick = () => {
    setShowCompletionConfirm(true);
  };

  const handleConfirmCompletion = () => {
    if (!isDummyTask) {
      onCompleteTask(task.id);
    }
    setShowCompletionConfirm(false);
  };

  const handleCancelCompletion = () => {
    setShowCompletionConfirm(false);
  };

  return (
    <div className="relative h-full w-full flex items-center justify-center">
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${priorityColors[task.priority]} opacity-95`} />
      
      {/* Glass Overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />

      {/* Enhanced Progress Bar at Top with Smooth Animation */}
      <div className="absolute top-0 left-0 right-0 z-10 h-1 bg-black/20">
        <motion.div
          className="h-full bg-gradient-to-r from-white to-yellow-300"
          animate={{ width: `${progress}%` }}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut",
            type: "tween"
          }}
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

      {/* Content Container with better mobile spacing */}
      <div className="relative w-full max-w-sm mx-auto px-4 py-8 sm:max-w-md sm:px-6 sm:py-12">
        <div className="pt-16 pb-16 sm:pt-20 sm:pb-20 space-y-6 sm:space-y-8">
          {/* Task Header */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Task Title - Responsive sizing */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight break-words font-task-title">
              {task.title}
            </h1>

            {/* Priority Indicator */}
            <div className="flex items-center justify-center space-x-2 text-white/80 mb-4 font-general-sans">
              {priorityIcons[task.priority]}
              <span className="text-sm font-medium capitalize">{task.priority} Priority</span>
            </div>

            {/* Conditional Due Date/Time Display */}
            {showDueDate && task.dueDate && (
              <div className="flex items-center justify-center space-x-4 text-white/70 text-sm mb-4 font-general-sans">
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

          {/* Motivational Quote */}
          {task.motivationalQuote && (
            <motion.div 
              className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-white/90 text-sm leading-relaxed break-words font-general-sans">{task.motivationalQuote}</p>
            </motion.div>
          )}

          {/* Subtasks Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <motion.button
              className="w-full p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 text-white/70 hover:text-white/90 hover:bg-white/10 transition-all duration-200 font-supreme"
              onClick={() => setShowSubtasks(!showSubtasks)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center justify-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-base">Subtasks</span>
                </div>
                <motion.span 
                  className="text-sm text-white/60 font-general-sans"
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
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </div>
            </motion.button>

            {/* Subtasks List */}
            <AnimatePresence>
              {showSubtasks && (
                <motion.div
                  className="mt-4 space-y-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {task.subtasks.map((subtask, index) => (
                    <motion.div
                      key={subtask.id}
                      className="flex items-center space-x-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <motion.button
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          subtask.completed
                            ? 'bg-green-500 border-green-500 shadow-lg shadow-green-500/30'
                            : isDummyTask
                            ? 'border-white/30 cursor-not-allowed'
                            : 'border-white/50 hover:border-white/80 hover:bg-white/10'
                        }`}
                        onClick={() => handleToggleSubtask(subtask.id)}
                        whileHover={isDummyTask ? {} : { scale: 1.1 }}
                        whileTap={isDummyTask ? {} : { scale: 0.9 }}
                        animate={subtask.completed ? {
                          scale: [1, 1.2, 1],
                          boxShadow: [
                            '0 0 0 rgba(34, 197, 94, 0)',
                            '0 0 15px rgba(34, 197, 94, 0.6)',
                            '0 0 5px rgba(34, 197, 94, 0.3)'
                          ]
                        } : {}}
                        transition={{ duration: 0.6 }}
                        disabled={isDummyTask}
                      >
                        <AnimatePresence>
                          {subtask.completed && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 180 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {isDummyTask && !subtask.completed && (
                          <Lock className="w-3 h-3 text-white/40" />
                        )}
                      </motion.button>
                      
                      <span
                        className={`text-sm flex-1 break-words font-general-sans transition-all duration-300 ${
                          subtask.completed 
                            ? 'text-white/60 line-through' 
                            : isDummyTask
                            ? 'text-white/70'
                            : 'text-white/90'
                        }`}
                      >
                        {subtask.text}
                      </span>

                      {/* Completion celebration effect */}
                      {subtask.completed && (
                        <motion.div
                          className="flex-shrink-0"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        </motion.div>
                      )}
                    </motion.div>
                  ))}

                  {/* Add Subtask Input - Only for non-dummy tasks */}
                  <AnimatePresence>
                    {!isDummyTask && (
                      <>
                        {isAddingSubtask ? (
                          <motion.div
                            className="flex space-x-2 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                          >
                            <input
                              type="text"
                              value={newSubtaskText}
                              onChange={(e) => setNewSubtaskText(e.target.value)}
                              className="flex-1 bg-transparent text-white placeholder-white/50 focus:outline-none text-sm font-general-sans"
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
                              className="flex items-center justify-center space-x-2 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 text-white/60 hover:text-white/80 hover:bg-white/10 font-supreme transition-all duration-200"
                              onClick={() => setIsAddingSubtask(true)}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <Plus className="w-4 h-4" />
                              <span className="text-sm">Add subtask</span>
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

          {/* Complete Task Button - Only for non-dummy tasks with all subtasks completed */}
          {!isDummyTask && allSubtasksCompleted && !task.completed && (
            <motion.button
              className="w-full p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl text-white font-semibold text-center font-supreme shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={handleCompleteTaskClick}
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(34, 197, 94, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Complete Task ✨</span>
              </div>
            </motion.button>
          )}

          {/* Demo Task Call-to-Action */}
          {isDummyTask && (
            <motion.div
              className="w-full p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl border border-white/20 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <motion.p
                className="text-white/90 font-medium text-sm break-words font-general-sans"
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
              className="w-full p-4 bg-green-500/20 backdrop-blur-sm rounded-2xl border border-green-500/30 text-center"
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
                className="text-green-300 font-semibold text-sm font-general-sans"
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
      </div>

      {/* Completion Confirmation Modal */}
      <AnimatePresence>
        {showCompletionConfirm && (
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white/10 backdrop-blur-md rounded-3xl p-6 w-full max-w-sm border border-white/20 shadow-2xl"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="text-center">
                <motion.div
                  className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    boxShadow: [
                      '0 0 0 rgba(34, 197, 94, 0)',
                      '0 0 20px rgba(34, 197, 94, 0.5)',
                      '0 0 0 rgba(34, 197, 94, 0)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </motion.div>
                
                <h3 className="text-xl font-bold text-white mb-3 font-task-title">
                  Complete Task?
                </h3>
                
                <p className="text-white/80 text-sm mb-6 font-general-sans leading-relaxed">
                  Are you sure you want to mark "<strong>{task.title}</strong>" as completed? This will move it to your completed tasks list.
                </p>
                
                <div className="flex space-x-3">
                  <motion.button
                    className="flex-1 px-4 py-3 bg-white/10 rounded-xl text-white/80 hover:text-white hover:bg-white/20 border border-white/20 font-supreme transition-all duration-200"
                    onClick={handleCancelCompletion}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  
                  <motion.button
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-semibold hover:from-green-600 hover:to-emerald-600 flex items-center justify-center space-x-2 font-supreme shadow-lg"
                    onClick={handleConfirmCompletion}
                    whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(34, 197, 94, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}