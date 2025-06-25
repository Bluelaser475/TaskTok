import { useState, useCallback } from 'react';
import { Task, Subtask, UserStats } from '../types/task';
import { calculateXP } from '../utils/taskGenerator';

// Dummy tasks for new users
const dummyTasks: Task[] = [
  {
    id: 'dummy-1',
    title: 'Plan Your Day',
    description: 'Organize your schedule and prioritize your most important tasks for today.',
    priority: 'high',
    category: 'Personal',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    estimatedTime: 30,
    completed: false,
    likes: 0,
    subtasks: [
      { id: 'sub-d1-1', text: 'List all appointments', completed: false },
      { id: 'sub-d1-2', text: 'Identify top 3 priorities', completed: false },
      { id: 'sub-d1-3', text: 'Allocate time slots', completed: false },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=512&h=512&fit=crop',
    motivationalQuote: '💡 Start with your most challenging task first to build momentum!',
    createdAt: new Date().toISOString(),
    isRecurring: false,
    noDueDate: false,
  },
  {
    id: 'dummy-2',
    title: 'Learn a New Skill',
    description: 'Dedicate some time to learning something new that interests you.',
    priority: 'medium',
    category: 'Learning',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
    estimatedTime: 60,
    completed: false,
    likes: 0,
    subtasks: [
      { id: 'sub-d2-1', text: 'Choose a topic', completed: false },
      { id: 'sub-d2-2', text: 'Find learning resources', completed: false },
      { id: 'sub-d2-3', text: 'Set a small learning goal', completed: false },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=512&h=512&fit=crop',
    motivationalQuote: '🎯 Consistency is key! Even 15 minutes a day can lead to significant progress.',
    createdAt: new Date().toISOString(),
    isRecurring: false,
    noDueDate: false,
  },
  {
    id: 'dummy-3',
    title: 'Mindfulness Moment',
    description: 'Take a short break to practice mindfulness and clear your mind.',
    priority: 'low',
    category: 'Health',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    estimatedTime: 10,
    completed: false,
    likes: 0,
    subtasks: [
      { id: 'sub-d3-1', text: 'Find a quiet spot', completed: false },
      { id: 'sub-d3-2', text: 'Close your eyes', completed: false },
      { id: 'sub-d3-3', text: 'Focus on your breath', completed: false },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=512&h=512&fit=crop',
    motivationalQuote: '🧘‍♀️ A short break can boost your productivity and reduce stress. Try a 5-minute meditation!',
    createdAt: new Date().toISOString(),
    isRecurring: false,
    noDueDate: false,
  },
];

export function useLocalTasks() {
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [stats] = useState<UserStats>({
    currentStreak: 0,
    longestStreak: 0,
    totalXP: 0,
    level: 1,
    achievements: [],
    totalTasks: 0,
    completedTasks: 0
  });

  // Show dummy tasks if user hasn't created any tasks yet
  const tasks = userTasks.length === 0 ? dummyTasks : userTasks;

  const createTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: `local-task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      subtasks: taskData.subtasks.length > 0 ? taskData.subtasks : [
        { id: `local-subtask-${Date.now()}-0`, text: 'Plan and prepare for the task', completed: false },
        { id: `local-subtask-${Date.now()}-1`, text: `Work on completing: ${taskData.title}`, completed: false },
        { id: `local-subtask-${Date.now()}-2`, text: 'Review and finalize the work', completed: false }
      ],
      imageUrl: taskData.imageUrl || `https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=512&h=512&fit=crop&random=${Date.now()}`,
      motivationalQuote: taskData.motivationalQuote || 'Every step forward is progress.'
    };

    setUserTasks(prev => [newTask, ...prev]);
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    // Don't allow updating dummy tasks
    if (taskId.startsWith('dummy-')) return;
    
    setUserTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  const completeTask = useCallback((taskId: string) => {
    // Don't allow completing dummy tasks
    if (taskId.startsWith('dummy-')) return;
    
    setUserTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, completed: true, completedAt: new Date().toISOString() }
        : task
    ));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    // Don't allow deleting dummy tasks
    if (taskId.startsWith('dummy-')) return;
    
    setUserTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    // Don't allow modifying dummy task subtasks
    if (taskId.startsWith('dummy-')) return;
    
    setUserTasks(prev => prev.map(task => 
      task.id === taskId 
        ? {
            ...task,
            subtasks: task.subtasks.map(subtask =>
              subtask.id === subtaskId 
                ? { ...subtask, completed: !subtask.completed }
                : subtask
            )
          }
        : task
    ));
  }, []);

  const addSubtask = useCallback((taskId: string, text: string) => {
    // Don't allow adding subtasks to dummy tasks
    if (taskId.startsWith('dummy-')) return;
    
    const newSubtask: Subtask = {
      id: `local-subtask-${Date.now()}`,
      text,
      completed: false
    };

    setUserTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, subtasks: [...task.subtasks, newSubtask] }
        : task
    ));
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    // Don't allow deleting subtasks from dummy tasks
    if (taskId.startsWith('dummy-')) return;
    
    setUserTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId) }
        : task
    ));
  }, []);

  const refetch = useCallback(() => {
    // No-op for local tasks
  }, []);

  return {
    tasks,
    stats,
    loading: false,
    error: null,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    refetch
  };
}