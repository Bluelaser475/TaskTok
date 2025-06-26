import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, List, ChevronUp, ChevronDown } from 'lucide-react';
import { Task } from './types/task';
import { TaskCard } from './components/TaskCard';
import { TaskForm } from './components/TaskForm';
import { TaskListView } from './components/TaskListView';
import { CompletedTasksView } from './components/CompletedTasksView';
import { StatsBar } from './components/StatsBar';
import { AuthForm } from './components/AuthForm';
import { OnboardingScreen } from './components/OnboardingScreen';
import { useAuth } from './hooks/useAuth';
import { useOnboarding } from './hooks/useOnboarding';
import { useSupabaseTasks } from './hooks/useSupabaseTasks';
import { useLocalTasks } from './hooks/useLocalTasks';
import { useSwipe } from './hooks/useSwipe';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { hasOnboarded, completeOnboarding, skipOnboarding } = useOnboarding();
  
  // Use Supabase tasks for authenticated users, local tasks for unauthenticated
  const supabaseTasks = useSupabaseTasks(user?.id);
  const localTasks = useLocalTasks();
  
  // Choose which task system to use based on authentication
  const {
    tasks,
    stats,
    loading: tasksLoading,
    error,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    refetch
  } = user ? supabaseTasks : localTasks;

  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskList, setShowTaskList] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);

  const userCreatedTasks = user ? tasks : tasks.filter(task => !task.id.startsWith('dummy-'));
  const completedTasks = tasks.filter(task => task.completed);
  const activeTasks = tasks.filter(task => !task.completed);
  
  // Fix: Use activeTasks for currentTask calculation
  const currentTask = activeTasks.length > 0 ? activeTasks[Math.min(currentTaskIndex, activeTasks.length - 1)] : null;
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Navigation helper functions
  const navigateToNextTask = useCallback(() => {
    if (activeTasks.length > 0) {
      setSwipeDirection('up');
      const nextIndex = (currentTaskIndex + 1) % activeTasks.length;
      setCurrentTaskIndex(nextIndex);
    }
  }, [currentTaskIndex, activeTasks.length]);

  const navigateToPreviousTask = useCallback(() => {
    if (activeTasks.length > 0) {
      setSwipeDirection('down');
      const prevIndex = (currentTaskIndex - 1 + activeTasks.length) % activeTasks.length;
      setCurrentTaskIndex(prevIndex);
    }
  }, [currentTaskIndex, activeTasks.length]);

  // Desktop wheel event handler for task navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Debounce wheel events
      const now = Date.now();
      if (window.lastWheelTime && now - window.lastWheelTime < 300) return;
      window.lastWheelTime = now;

      if (e.deltaY > 0) {
        // Scrolling down - next task
        navigateToNextTask();
      } else if (e.deltaY < 0) {
        // Scrolling up - previous task
        navigateToPreviousTask();
      }
    };

    const container = containerRef.current;
    if (container && !showTaskList && !showTaskForm && !showAuthForm && !showCompletedTasks) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [navigateToNextTask, navigateToPreviousTask, showTaskList, showTaskForm, showAuthForm, showCompletedTasks]);

  // Swipe handlers for mobile navigation
  const swipeHandlers = useSwipe({
    onSwipeUp: navigateToNextTask,
    onSwipeDown: navigateToPreviousTask
  });

  const handleToggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    toggleSubtask(taskId, subtaskId);
  }, [toggleSubtask]);

  const handleCompleteTask = useCallback((taskId: string) => {
    completeTask(taskId);
    // Reset to first task after completion
    setCurrentTaskIndex(0);
  }, [completeTask]);

  const handleCreateTask = useCallback((newTaskData: Omit<Task, 'id' | 'createdAt'>) => {
    // For unauthenticated users, limit to 3 tasks
    if (!user && userCreatedTasks.length >= 3) {
      // Close the form and let the app show auth form
      setShowTaskForm(false);
      return;
    }
    
    createTask(newTaskData);
    setShowTaskForm(false);
    setCurrentTaskIndex(0);
  }, [createTask, user, userCreatedTasks.length]);

  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
  }, [updateTask]);

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask(taskId);
    // Reset to first task after deletion
    setCurrentTaskIndex(0);
  }, [deleteTask]);

  const handleAddSubtask = useCallback((taskId: string, subtaskText: string) => {
    addSubtask(taskId, subtaskText);
  }, [addSubtask]);

  const handleDeleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    deleteSubtask(taskId, subtaskId);
  }, [deleteSubtask]);

  const handleRefresh = useCallback(() => {
    if (!user) return; // Only allow refresh for authenticated users
    
    setIsRefreshing(true);
    refetch();
    setTimeout(() => {
      setIsRefreshing(false);
      setCurrentTaskIndex(0);
    }, 1000);
  }, [refetch, user]);

  const handleLoginClick = useCallback(() => {
    setShowAuthForm(true);
  }, []);

  // Handle TaskTok title click - return to first task
  const handleTitleClick = useCallback(() => {
    setCurrentTaskIndex(0);
  }, []);

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Plus className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-4 font-task-title">Loading TaskTok...</h2>
        </div>
      </div>
    );
  }

  // Show onboarding for new users (not authenticated and haven't onboarded)
  if (!user && !hasOnboarded) {
    return (
      <OnboardingScreen
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
    );
  }

  // Show auth form if explicitly requested or if not authenticated but has onboarded and reached task limit
  if (showAuthForm || (!user && hasOnboarded && userCreatedTasks.length >= 3)) {
    return (
      <AuthForm 
        onSuccess={() => setShowAuthForm(false)}
        onClose={() => setShowAuthForm(false)}
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
        <StatsBar stats={stats} onTitleClick={handleTitleClick} onLoginClick={handleLoginClick} />
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4 font-task-title">Something went wrong</h2>
          <p className="text-white/70 mb-8 font-general-sans">{error}</p>
          <motion.button
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-semibold font-supreme"
            onClick={handleRefresh}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Try Again
          </motion.button>
        </div>
      </div>
    );
  }

  // Show loading state for tasks (only for authenticated users)
  if (user && tasksLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
        <StatsBar stats={stats} onTitleClick={handleTitleClick} onLoginClick={handleLoginClick} />
        
        <div className="text-center">
          <motion.div
            className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Plus className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-4 font-task-title">Loading your tasks...</h2>
        </div>
      </div>
    );
  }

  // Show empty state if no active tasks
  if (activeTasks.length === 0 && !showTaskList && !showCompletedTasks) {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
        <StatsBar stats={stats} onTitleClick={handleTitleClick} onLoginClick={handleLoginClick} />
        
        <div className="text-center">
          <motion.div
            className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Plus className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-4 font-task-title">
            {completedTasks.length > 0 ? 'All Tasks Completed!' : 'No Tasks Yet'}
          </h2>
          <p className="text-white/70 mb-8 font-general-sans">
            {completedTasks.length > 0 
              ? `Great job! You've completed ${completedTasks.length} task${completedTasks.length !== 1 ? 's' : ''}. Create a new task to keep going!`
              : !user 
                ? `Create up to 3 tasks to try TaskTok! (${userCreatedTasks.length}/3)` 
                : 'Create your first task to get started!'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <motion.button
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-semibold font-supreme"
              onClick={() => setShowTaskForm(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create Task
            </motion.button>
            {completedTasks.length > 0 && (
              <motion.button
                className="px-8 py-3 bg-green-500/20 text-green-300 rounded-full border border-green-500/30 hover:bg-green-500/30 font-semibold font-supreme"
                onClick={() => setShowCompletedTasks(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                View Completed ({completedTasks.length})
              </motion.button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative h-screen overflow-hidden bg-black" 
      {...swipeHandlers}
    >
      {/* Stats Bar - Always visible */}
      <StatsBar stats={stats} onTitleClick={handleTitleClick} onLoginClick={handleLoginClick} />

      {/* Navigation Arrows - Left Side */}
      {!showTaskList && !showTaskForm && !showAuthForm && !showCompletedTasks && activeTasks.length > 1 && (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col space-y-4">
          {/* Previous Task Arrow */}
          <motion.button
            className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 border border-white/20 transition-all duration-200"
            onClick={navigateToPreviousTask}
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            aria-label="Previous task"
          >
            <ChevronUp className="w-6 h-6" />
          </motion.button>

          {/* Next Task Arrow */}
          <motion.button
            className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 border border-white/20 transition-all duration-200"
            onClick={navigateToNextTask}
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            aria-label="Next task"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.button>
        </div>
      )}

      {/* Single Task Display with AnimatePresence - Fixed condition */}
      {!showTaskList && !showCompletedTasks && activeTasks.length > 0 && currentTask && (
        <div className="h-full w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTask.id}
              className="h-full w-full absolute inset-0"
              initial={{ 
                opacity: 0, 
                y: swipeDirection === 'up' ? '100%' : swipeDirection === 'down' ? '-100%' : 50 
              }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ 
                opacity: 0, 
                y: swipeDirection === 'up' ? '-100%' : swipeDirection === 'down' ? '100%' : -50 
              }}
              transition={{ 
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 1
              }}
              onAnimationComplete={() => setSwipeDirection(null)}
            >
              <TaskCard
                task={currentTask}
                onToggleSubtask={handleToggleSubtask}
                onCompleteTask={handleCompleteTask}
                onAddSubtask={handleAddSubtask}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Task Counter - Bottom Left - Enhanced mobile spacing */}
      {!showTaskList && !showCompletedTasks && activeTasks.length > 0 && (
        <div className="absolute bottom-6 left-6 sm:left-8 sm:bottom-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 sm:px-4 sm:py-2 border border-white/20">
            <span className="text-white/90 text-sm font-medium font-general-sans">
              Task {currentTaskIndex + 1}/{activeTasks.length}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Right Controls - Enhanced mobile spacing and positioning */}
      {!showTaskList && !showCompletedTasks && (
        <div 
          className="absolute bottom-6 right-4 sm:right-6 sm:bottom-6 flex space-x-3"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Refresh Button - only show for authenticated users */}
          {user && (
            <motion.button
              className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white border border-white/20"
              onClick={handleRefresh}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={{ duration: 1 }}
            >
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.button>
          )}

          {/* Task List Button */}
          <motion.button
            className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white border border-white/20"
            onClick={() => setShowTaskList(true)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <List className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.button>

          {/* Add Task Button */}
          <motion.button
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-lg ${
              !user && userCreatedTasks.length >= 3
                ? 'bg-gray-500/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-110'
            }`}
            onClick={() => {
              if (!user && userCreatedTasks.length >= 3) {
                setShowAuthForm(true);
                return;
              }
              setShowTaskForm(true);
            }}
            whileHover={!user && userCreatedTasks.length >= 3 ? {} : { scale: 1.1 }}
            whileTap={!user && userCreatedTasks.length >= 3 ? {} : { scale: 0.9 }}
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.button>
        </div>
      )}

      {/* Task Form Modal */}
      <AnimatePresence>
        {showTaskForm && (
          <TaskForm
            onSubmit={handleCreateTask}
            onClose={() => setShowTaskForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Task List View */}
      <AnimatePresence>
        {showTaskList && (
          <TaskListView
            tasks={tasks}
            stats={stats}
            onClose={() => setShowTaskList(false)}
            onAddTask={() => {
              setShowTaskList(false);
              setShowTaskForm(true);
            }}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddSubtask={handleAddSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onToggleSubtask={handleToggleSubtask}
            onViewCompletedTasks={() => {
              setShowTaskList(false);
              setShowCompletedTasks(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Completed Tasks View */}
      <AnimatePresence>
        {showCompletedTasks && (
          <CompletedTasksView
            completedTasks={completedTasks}
            stats={stats}
            onClose={() => setShowCompletedTasks(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;