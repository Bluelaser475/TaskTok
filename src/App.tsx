import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, List } from 'lucide-react';
import { Task } from './types/task';
import { TaskFeedScroller } from './components/TaskFeedScroller';
import { TaskForm } from './components/TaskForm';
import { TaskListView } from './components/TaskListView';
import { StatsBar } from './components/StatsBar';
import { AuthForm } from './components/AuthForm';
import { OnboardingScreen } from './components/OnboardingScreen';
import { useAuth } from './hooks/useAuth';
import { useOnboarding } from './hooks/useOnboarding';
import { useSupabaseTasks } from './hooks/useSupabaseTasks';
import { useLocalTasks } from './hooks/useLocalTasks';
import { useScrollState } from './hooks/useScrollState';

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

  // Scroll state management
  const { scrollState, updateScrollState, loading: scrollStateLoading } = useScrollState(user?.id);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskList, setShowTaskList] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const userCreatedTasks = user ? tasks : tasks.filter(task => !task.id.startsWith('dummy-'));

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
  }, [createTask, user, userCreatedTasks.length]);

  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
  }, [updateTask]);

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask(taskId);
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
    }, 1000);
  }, [refetch, user]);

  const handleLoginClick = useCallback(() => {
    setShowAuthForm(true);
  }, []);

  const handleTitleClick = useCallback(() => {
    // Scroll to top of feed
    if (tasks.length > 0) {
      updateScrollState({
        taskId: tasks[0].id,
        offsetPercent: 0,
        timestamp: Date.now()
      });
    }
  }, [tasks, updateScrollState]);

  // Show loading screen while checking auth
  if (authLoading || (user && scrollStateLoading)) {
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
    <div className="relative h-screen overflow-hidden bg-black">
      {/* Stats Bar - Always visible */}
      <StatsBar stats={stats} onTitleClick={handleTitleClick} onLoginClick={handleLoginClick} />

      {/* Main Task Feed with Infinite Scrolling */}
      {!showTaskList && tasks.length > 0 && (
        <TaskFeedScroller
          tasks={tasks}
          userId={user?.id}
          initialScrollState={scrollState || undefined}
          onScrollStateChange={updateScrollState}
          onToggleSubtask={handleToggleSubtask}
          onCompleteTask={handleCompleteTask}
          onAddSubtask={handleAddSubtask}
        />
      )}

      {/* Bottom Right Controls */}
      {!showTaskList && (
        <div className="absolute bottom-6 right-4 sm:right-6 flex space-x-3 z-50">
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
            onAddTask={() => setShowTaskForm(true)}
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