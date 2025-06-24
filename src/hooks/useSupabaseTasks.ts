import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Task, Subtask, UserStats } from '../types/task';
import { calculateXP } from '../utils/taskGenerator';

// Dummy tasks for new authenticated users
const dummyTasks: Task[] = [
  {
    id: 'dummy-auth-1',
    title: 'Welcome to TaskTok!',
    description: 'Get started with your productivity journey. This is a sample task to show you how TaskTok works with your account.',
    priority: 'high',
    category: 'Personal',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    estimatedTime: 15,
    completed: false,
    likes: 0,
    subtasks: [
      { id: 'sub-auth-1-1', text: 'Explore the TaskTok interface', completed: false },
      { id: 'sub-auth-1-2', text: 'Create your first real task', completed: false },
      { id: 'sub-auth-1-3', text: 'Complete a subtask to earn XP', completed: false },
    ],
    aiSuggestion: '🎉 Welcome! Your tasks are now saved to your account and will sync across all your devices.',
    createdAt: new Date().toISOString(),
    isRecurring: false,
    noDueDate: false,
  },
  {
    id: 'dummy-auth-2',
    title: 'Set Up Your Workspace',
    description: 'Organize your physical or digital workspace for maximum productivity.',
    priority: 'medium',
    category: 'Work',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
    estimatedTime: 45,
    completed: false,
    likes: 0,
    subtasks: [
      { id: 'sub-auth-2-1', text: 'Clear your desk/workspace', completed: false },
      { id: 'sub-auth-2-2', text: 'Organize essential tools', completed: false },
      { id: 'sub-auth-2-3', text: 'Set up productivity apps', completed: false },
      { id: 'sub-auth-2-4', text: 'Create a distraction-free zone', completed: false },
    ],
    aiSuggestion: '🏢 A well-organized workspace can boost your productivity by up to 25%!',
    createdAt: new Date().toISOString(),
    isRecurring: false,
    noDueDate: false,
  },
  {
    id: 'dummy-auth-3',
    title: 'Build a Morning Routine',
    description: 'Establish a consistent morning routine to start your days with purpose and energy.',
    priority: 'low',
    category: 'Health',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    estimatedTime: 30,
    completed: false,
    likes: 0,
    subtasks: [
      { id: 'sub-auth-3-1', text: 'Wake up at the same time daily', completed: false },
      { id: 'sub-auth-3-2', text: 'Include 10 minutes of movement', completed: false },
      { id: 'sub-auth-3-3', text: 'Practice gratitude or meditation', completed: false },
    ],
    aiSuggestion: '🌅 A consistent morning routine can improve your mood and productivity throughout the day.',
    createdAt: new Date().toISOString(),
    isRecurring: true,
    recurringInterval: 'daily',
    noDueDate: false,
  },
];

export function useSupabaseTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<UserStats>({
    currentStreak: 0,
    longestStreak: 0,
    totalXP: 0,
    level: 1,
    achievements: [],
    totalTasks: 0,
    completedTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks from Supabase
  const fetchTasks = useCallback(async () => {
    console.log('🔍 fetchTasks called with userId:', userId);
    if (!userId) {
      console.warn('⚠️ fetchTasks: userId is undefined, skipping fetch');
      return;
    }

    try {
      setLoading(true);
      console.log('📡 Fetching tasks from Supabase for user:', userId);
      
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          subtasks (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('❌ Supabase tasks fetch error:', tasksError);
        throw tasksError;
      }

      console.log('✅ Raw tasks data from Supabase:', tasksData);
      console.log('📊 Number of tasks fetched:', tasksData?.length || 0);

      // Transform database data to match our Task interface
      const transformedTasks: Task[] = (tasksData || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        dueDate: task.due_date || '',
        estimatedTime: task.estimated_time,
        completed: task.completed,
        likes: task.likes,
        subtasks: (task.subtasks || []).map(subtask => ({
          id: subtask.id,
          text: subtask.text,
          completed: subtask.completed
        })),
        aiSuggestion: task.ai_suggestion,
        createdAt: task.created_at,
        completedAt: task.completed_at || undefined,
        isRecurring: task.is_recurring,
        recurringInterval: task.recurring_interval || undefined,
        noDueDate: task.no_due_date
      }));

      console.log('🔄 Transformed tasks:', transformedTasks);

      // If user has no tasks, show dummy tasks
      if (transformedTasks.length === 0) {
        console.log('📝 No user tasks found, showing dummy tasks');
        setTasks(dummyTasks);
      } else {
        console.log('📝 Setting user tasks:', transformedTasks.length, 'tasks');
        setTasks(transformedTasks);
      }
    } catch (err) {
      console.error('💥 Error in fetchTasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
      console.log('✅ fetchTasks completed');
    }
  }, [userId]);

  // Fetch user stats from Supabase
  const fetchStats = useCallback(async () => {
    console.log('📈 fetchStats called with userId:', userId);
    if (!userId) {
      console.warn('⚠️ fetchStats: userId is undefined, skipping fetch');
      return;
    }

    try {
      console.log('📡 Fetching user stats from Supabase for user:', userId);
      
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('❌ Supabase stats fetch error:', statsError);
        throw statsError;
      }

      if (statsData) {
        console.log('✅ User stats data from Supabase:', statsData);
        setStats({
          currentStreak: statsData.current_streak,
          longestStreak: statsData.longest_streak,
          totalXP: statsData.total_xp,
          level: statsData.level,
          achievements: statsData.achievements,
          totalTasks: statsData.total_tasks,
          completedTasks: statsData.completed_tasks
        });
      } else {
        console.log('📊 No stats data found for user, using defaults');
      }
    } catch (err) {
      console.error('💥 Error in fetchStats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
  }, [userId]);

  // Create a new task
  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    console.log('🚀 createTask called with userId:', userId);
    console.log('📝 Task data to create:', taskData);
    
    if (!userId) {
      console.error('❌ createTask: userId is undefined, cannot create task');
      setError('User not authenticated');
      return;
    }

    try {
      console.log('💾 Starting task creation process...');
      
      // Prepare task data for database
      const taskInsertData = {
        user_id: userId,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        category: taskData.category,
        due_date: taskData.dueDate || null,
        estimated_time: taskData.estimatedTime,
        completed: taskData.completed,
        likes: taskData.likes,
        ai_suggestion: taskData.aiSuggestion,
        is_recurring: taskData.isRecurring || false,
        recurring_interval: taskData.recurringInterval || null,
        no_due_date: taskData.noDueDate || false
      };
      
      console.log('📤 Inserting task data:', taskInsertData);

      const { data: taskResult, error: taskError } = await supabase
        .from('tasks')
        .insert(taskInsertData)
        .select()
        .single();

      if (taskError) {
        console.error('❌ Supabase task insertion error:', taskError);
        console.error('🔍 Error details:', {
          code: taskError.code,
          message: taskError.message,
          details: taskError.details,
          hint: taskError.hint
        });
        throw taskError;
      }
      
      console.log('✅ Task created successfully:', taskResult);

      // Insert subtasks if any
      if (taskData.subtasks && taskData.subtasks.length > 0) {
        console.log('📝 Inserting subtasks:', taskData.subtasks.length, 'subtasks');
        
        const subtasksData = taskData.subtasks.map(subtask => ({
          task_id: taskResult.id,
          text: subtask.text,
          completed: subtask.completed
        }));
        
        console.log('📤 Subtasks data to insert:', subtasksData);

        const { error: subtasksError } = await supabase
          .from('subtasks')
          .insert(subtasksData);

        if (subtasksError) {
          console.error('❌ Supabase subtask insertion error:', subtasksError);
          throw subtasksError;
        }
        
        console.log('✅ Subtasks inserted successfully');
      } else {
        console.log('📝 No subtasks to insert');
      }

      // Update user stats
      console.log('📈 Updating user stats...');
      console.log('📊 Current stats before update:', stats);
      
      const { error: statsError } = await supabase
        .from('user_stats')
        .update({ 
          total_tasks: stats.totalTasks + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (statsError) {
        console.error('❌ Stats update error:', statsError);
        // Don't throw here, task creation was successful
      } else {
        console.log('✅ User stats updated successfully');
      }

      // Refresh data
      console.log('🔄 Refreshing tasks and stats...');
      await fetchTasks();
      await fetchStats();
      
      console.log('🎉 Task creation process completed successfully');
    } catch (err) {
      console.error('💥 Error in createTask:', err);
      console.error('🔍 Full error object:', JSON.stringify(err, null, 2));
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  }, [userId, stats.totalTasks, fetchTasks, fetchStats]);

  // Update a task
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    console.log('✏️ updateTask called for taskId:', taskId, 'with updates:', updates);
    
    if (!userId) {
      console.error('❌ updateTask: userId is undefined');
      return;
    }

    // Don't allow updating dummy tasks
    if (taskId.startsWith('dummy-')) {
      console.warn('⚠️ updateTask: Cannot update dummy task:', taskId);
      return;
    }

    try {
      console.log('💾 Updating task in database...');
      
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          title: updates.title,
          description: updates.description,
          priority: updates.priority,
          category: updates.category,
          due_date: updates.dueDate || null,
          estimated_time: updates.estimatedTime,
          is_recurring: updates.isRecurring,
          recurring_interval: updates.recurringInterval || null,
          no_due_date: updates.noDueDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('user_id', userId);

      if (taskError) {
        console.error('❌ Task update error:', taskError);
        throw taskError;
      }

      console.log('✅ Task updated successfully');
      await fetchTasks();
    } catch (err) {
      console.error('💥 Error in updateTask:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }, [userId, fetchTasks]);

  // Complete a task
  const completeTask = useCallback(async (taskId: string) => {
    console.log('🎯 completeTask called for taskId:', taskId);
    
    if (!userId) {
      console.error('❌ completeTask: userId is undefined');
      return;
    }

    // Don't allow completing dummy tasks
    if (taskId.startsWith('dummy-')) {
      console.warn('⚠️ completeTask: Cannot complete dummy task:', taskId);
      return;
    }

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.completed) {
        console.warn('⚠️ Task not found or already completed:', taskId);
        return;
      }

      console.log('🎯 Completing task:', task.title);
      
      const completedAt = new Date().toISOString();
      const xpGained = calculateXP(task);
      
      console.log('🏆 XP gained:', xpGained);

      // Update task as completed
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          completed: true,
          completed_at: completedAt,
          updated_at: completedAt
        })
        .eq('id', taskId)
        .eq('user_id', userId);

      if (taskError) {
        console.error('❌ Task completion error:', taskError);
        throw taskError;
      }

      // Update user stats
      const newTotalXP = stats.totalXP + xpGained;
      const newLevel = Math.floor(newTotalXP / 100) + 1;
      const newCurrentStreak = stats.currentStreak + 1;
      const newLongestStreak = Math.max(stats.longestStreak, newCurrentStreak);
      const newCompletedTasks = stats.completedTasks + 1;

      console.log('📈 Updating stats:', {
        newTotalXP,
        newLevel,
        newCurrentStreak,
        newLongestStreak,
        newCompletedTasks
      });

      const { error: statsError } = await supabase
        .from('user_stats')
        .update({
          total_xp: newTotalXP,
          level: newLevel,
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          completed_tasks: newCompletedTasks,
          updated_at: completedAt
        })
        .eq('user_id', userId);

      if (statsError) {
        console.error('❌ Stats update error:', statsError);
        throw statsError;
      }

      console.log('✅ Task completed and stats updated successfully');
      await fetchTasks();
      await fetchStats();
    } catch (err) {
      console.error('💥 Error in completeTask:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    }
  }, [userId, tasks, stats, fetchTasks, fetchStats]);

  // Delete a task
  const deleteTask = useCallback(async (taskId: string) => {
    console.log('🗑️ deleteTask called for taskId:', taskId);
    
    if (!userId) {
      console.error('❌ deleteTask: userId is undefined');
      return;
    }

    // Don't allow deleting dummy tasks
    if (taskId.startsWith('dummy-')) {
      console.warn('⚠️ deleteTask: Cannot delete dummy task:', taskId);
      return;
    }

    try {
      console.log('🗑️ Deleting task from database...');
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Task deletion error:', error);
        throw error;
      }

      // Update user stats
      const { error: statsError } = await supabase
        .from('user_stats')
        .update({ 
          total_tasks: Math.max(0, stats.totalTasks - 1),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (statsError) {
        console.error('❌ Stats update error after deletion:', statsError);
      }

      console.log('✅ Task deleted successfully');
      await fetchTasks();
      await fetchStats();
    } catch (err) {
      console.error('💥 Error in deleteTask:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }, [userId, stats.totalTasks, fetchTasks, fetchStats]);

  // Toggle subtask completion
  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    console.log('🔄 toggleSubtask called for taskId:', taskId, 'subtaskId:', subtaskId);
    
    if (!userId) {
      console.error('❌ toggleSubtask: userId is undefined');
      return;
    }

    // Don't allow modifying dummy task subtasks
    if (taskId.startsWith('dummy-')) {
      console.warn('⚠️ toggleSubtask: Cannot modify dummy task subtask');
      return;
    }

    try {
      const task = tasks.find(t => t.id === taskId);
      const subtask = task?.subtasks.find(st => st.id === subtaskId);
      if (!subtask) {
        console.warn('⚠️ Subtask not found:', subtaskId);
        return;
      }

      console.log('🔄 Toggling subtask completion:', subtask.text, 'from', subtask.completed, 'to', !subtask.completed);

      const { error } = await supabase
        .from('subtasks')
        .update({
          completed: !subtask.completed
        })
        .eq('id', subtaskId);

      if (error) {
        console.error('❌ Subtask toggle error:', error);
        throw error;
      }

      console.log('✅ Subtask toggled successfully');
      await fetchTasks();
    } catch (err) {
      console.error('💥 Error in toggleSubtask:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle subtask');
    }
  }, [userId, tasks, fetchTasks]);

  // Add subtask
  const addSubtask = useCallback(async (taskId: string, text: string) => {
    console.log('➕ addSubtask called for taskId:', taskId, 'text:', text);
    
    if (!userId) {
      console.error('❌ addSubtask: userId is undefined');
      return;
    }

    // Don't allow adding subtasks to dummy tasks
    if (taskId.startsWith('dummy-')) {
      console.warn('⚠️ addSubtask: Cannot add subtask to dummy task');
      return;
    }

    try {
      console.log('➕ Adding subtask to database...');
      
      const { error } = await supabase
        .from('subtasks')
        .insert({
          task_id: taskId,
          text: text,
          completed: false
        });

      if (error) {
        console.error('❌ Subtask addition error:', error);
        throw error;
      }

      console.log('✅ Subtask added successfully');
      await fetchTasks();
    } catch (err) {
      console.error('💥 Error in addSubtask:', err);
      setError(err instanceof Error ? err.message : 'Failed to add subtask');
    }
  }, [userId, fetchTasks]);

  // Delete subtask
  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    console.log('🗑️ deleteSubtask called for taskId:', taskId, 'subtaskId:', subtaskId);
    
    if (!userId) {
      console.error('❌ deleteSubtask: userId is undefined');
      return;
    }

    // Don't allow deleting subtasks from dummy tasks
    if (taskId.startsWith('dummy-')) {
      console.warn('⚠️ deleteSubtask: Cannot delete subtask from dummy task');
      return;
    }

    try {
      console.log('🗑️ Deleting subtask from database...');
      
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) {
        console.error('❌ Subtask deletion error:', error);
        throw error;
      }

      console.log('✅ Subtask deleted successfully');
      await fetchTasks();
    } catch (err) {
      console.error('💥 Error in deleteSubtask:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete subtask');
    }
  }, [userId, fetchTasks]);

  // Initial data fetch
  useEffect(() => {
    console.log('🔄 useEffect triggered with userId:', userId);
    if (userId) {
      console.log('👤 User authenticated, fetching data...');
      fetchTasks();
      fetchStats();
    } else {
      console.log('👤 No user, skipping data fetch');
    }
  }, [userId, fetchTasks, fetchStats]);

  return {
    tasks,
    stats,
    loading,
    error,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    refetch: () => {
      console.log('🔄 Manual refetch triggered');
      fetchTasks();
      fetchStats();
    }
  };
}