import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, List } from 'lucide-react';
import { Task } from './types/task';
import { TaskCard } from './components/TaskCard';
import { TaskForm } from './components/TaskForm';
import { TaskListView } from './components/TaskListView';
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
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ref for the scrollable task container
  const taskContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const isInitializedRef = useRef(false);

  const currentTask = tasks[currentTaskIndex];
  const userCreatedTasks = user ? tasks : tasks.filter(task => !task.id.startsWith('dummy-'));

  // Create rendered tasks array for infinite scrolling
  // Structure: [lastTask, ...actualTasks, firstTask]
  const renderedTasks = tasks.length > 1 
    ? [tasks[tasks.length - 1], ...tasks, tasks[0]]
    : tasks;

  // Handle scroll-based navigation with infinite loop detection
  const handleScroll = useCallback(() => {
    if (!taskContainerRef.current || isScrollingRef.current || tasks.length <= 1) return;

    const container = taskContainerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const renderedIndex = Math.round(scrollTop / containerHeight);
    
    // Check if we're in the duplicate regions and need to jump
    if (renderedIndex === 0) {
      // We're at the duplicated last task, jump to the real last task
      isScrollingRef.current = true;
      container.scrollTo({
        top: tasks.length * containerHeight,
        behavior: 'auto'
      });
      // Immediately update state without delay
      setCurrentTaskIndex(tasks.length - 1);
      isScrollingRef.current = false;
    } else if (renderedIndex === renderedTasks.length - 1) {
      // We're at the duplicated first task, jump to the real first task
      isScrollingRef.current = true;
      container.scrollTo({
        top: containerHeight,
        behavior: 'auto'
      });
      // Immediately update state without delay
      setCurrentTaskIndex(0);
      isScrollingRef.current = false;
    } else {
      // Normal navigation within actual tasks
      const actualIndex = renderedIndex - 1; // Adjust for the prepended duplicate
      if (actualIndex !== currentTaskIndex && actualIndex >= 0 && actualIndex < tasks.length) {
        setCurrentTaskIndex(actualIndex);
      }
    }
  }, [currentTaskIndex, tasks.length, renderedTasks.length]);

  // Debounced scroll handler
  useEffect(() => {
    const container = taskContainerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    container.addEventListener('scroll', debouncedHandleScroll);
    return () => {
      container.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);

  // Scroll to specific task with infinite loop support
  const scrollToTask = useCallback((targetActualIndex: number, smooth: boolean = true) => {
    if (!taskContainerRef.current || tasks.length === 0) return;
    
    isScrollingRef.current = true;
    const container = taskContainerRef.current;
    const containerHeight = container.clientHeight;
    
    // Calculate the rendered index (add 1 for the prepended duplicate)
    const renderedIndex = tasks.length > 1 ? targetActualIndex + 1 : targetActualIndex;
    
    container.scrollTo({
      top: renderedIndex * containerHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });

    setCurrentTaskIndex(targetActualIndex);

    // Reset scrolling flag - immediately for instant scrolls, with delay for smooth scrolls
    if (smooth) {
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 500);
    } else {
      isScrollingRef.current = false;
    }
  }, [tasks.length]);

  // Initialize scroll position to show the first real task
  useEffect(() => {
    if (tasks.length > 0 && taskContainerRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true;
      // Set initial position to show the first real task (skip the duplicated last task)
      if (tasks.length > 1) {
        taskContainerRef.current.scrollTo({
          top: taskContainerRef.current.clientHeight,
          behavior: 'auto'
        });
      }
    }
  }, [tasks.length, tasks]);

  // Handle TaskTok title click - return to first task
  const handleTitleClick = useCallback(() => {
    setCurrentTaskIndex(0);
    scrollToTask(0);
  }, [scrollToTask]);

  // Swipe handlers for mobile with infinite looping
  const swipeHandlers = useSwipe({
    onSwipeUp: () => {
      if (tasks.length > 0) {
        const nextIndex = (currentTaskIndex + 1) % tasks.length;
        setCurrentTaskIndex(nextIndex);
        scrollToTask(nextIndex);
      }
    },
    onSwipeDown: () => {
      if (tasks.length > 0) {
        const prevIndex = (currentTaskIndex - 1 + tasks.length) % tasks.length;
        setCurrentTaskIndex(prevIndex);
        scrollToTask(prevIndex);
      }
    }
  });

  const handleToggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    toggleSubtask(taskId, subtaskId);
  }, [toggleSubtask]);

  const handleCompleteTask = useCallback((taskId: string) => {
    completeTask(taskId);
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
    scrollToTask(0, false);
  }, [createTask, user, userCreatedTasks.length, scrollToTask]);

  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
  }, [updateTask]);

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask(taskId);
    // Reset to first task after deletion
    setCurrentTaskIndex(0);
    setTimeout(() => scrollToTask(0, false), 100);
  }, [deleteTask, scrollToTask]);

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
      scrollToTask(0, false);
    }, 1000);
  }, [refetch, user, scrollToTask]);

  const handleLoginClick = useCallback(() => {
    setShowAuthForm(true);
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

  // Show empty state if no tasks
  if (tasks.length === 0 && !showTaskList) {
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
          <h2 className="text-2xl font-bold text-white mb-4 font-task-title">No Tasks Yet</h2>
          <p className="text-white/70 mb-8 font-general-sans">
            {!user 
              ? `Create up to 3 tasks to try TaskTok! (${userCreatedTasks.length}/3)` 
              : 'Create your first task to get started!'
            }
          </p>
          <motion.button
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-semibold font-supreme"
            onClick={() => setShowTaskForm(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Create Task
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black" {...swipeHandlers}>
      {/* Stats Bar - Always visible */}
      <StatsBar stats={stats} onTitleClick={handleTitleClick} onLoginClick={handleLoginClick} />

      {/* Visual Progress Indicator - Left Side - Moved further from edge */}
      {!showTaskList && tasks.length > 1 && (
        <motion.div
          className="fixed left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          {tasks.map((_, index) => (
            <motion.div
              key={index}
              className={`w-1 h-6 rounded-full transition-all duration-300 ${
                index === currentTaskIndex 
                  ? 'bg-white' 
                  : 'bg-white/30'
              }`}
              animate={{
                scale: index === currentTaskIndex ? 1.2 : 1,
                opacity: index === currentTaskIndex ? 1 : 0.6
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </motion.div>
      )}

      {/* Main Task Display with Infinite Scroll Navigation */}
      {!showTaskList && tasks.length > 0 && (
        <div 
          ref={taskContainerRef}
          className="h-full overflow-y-auto snap-y snap-mandatory"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {renderedTasks.map((task, index) => (
            <div key={`${task.id}-${index}`} className="h-full snap-start" style={{ scrollSnapAlign: 'start' }}>
              <TaskCard
                task={task}
                onToggleSubtask={handleToggleSubtask}
                onCompleteTask={handleCompleteTask}
                onAddSubtask={handleAddSubtask}
              />
            </div>
          ))}
        </div>
      )}

      {/* Task Counter - Bottom Left - Enhanced mobile spacing */}
      {!showTaskList && tasks.length > 0 && (
        <div className="absolute bottom-6 left-6 sm:left-8 sm:bottom-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 sm:px-4 sm:py-2 border border-white/20">
            <span className="text-white/90 text-sm font-medium font-general-sans">
              Task {currentTaskIndex + 1}/{tasks.length}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Right Controls - Enhanced mobile spacing and positioning */}
      {!showTaskList && (
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;