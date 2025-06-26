import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Edit3, Trash2, Plus, Check, X, Calendar, Clock, Trophy, Zap, Target, RotateCcw, Award } from 'lucide-react';
import { Task, Subtask, UserStats } from '../types/task';

interface TaskListViewProps {
  tasks: Task[];
  stats: UserStats;
  onClose: () => void;
  onAddTask: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddSubtask: (taskId: string, subtaskText: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onViewCompletedTasks: () => void;
}

const priorityColors = {
  high: 'border-red-500/50 bg-red-500/10 text-red-300',
  medium: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300',
  low: 'border-green-500/50 bg-green-500/10 text-green-300'
};

const categories = [
  'Work', 'Personal', 'Health', 'Learning', 'Creative', 'Social', 'Finance', 'Other'
];

const recurringOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' }
];

export function TaskListView({ 
  tasks, 
  stats,
  onClose, 
  onAddTask,
  onUpdateTask, 
  onDeleteTask, 
  onAddSubtask, 
  onDeleteSubtask, 
  onToggleSubtask,
  onViewCompletedTasks
}: TaskListViewProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    category: '',
    dueDate: '',
    estimatedTime: 25,
    isRecurring: false,
    recurringInterval: '',
    noDueDate: false
  });
  const [customInterval, setCustomInterval] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Animation states for XP and Level updates
  const [previousXP, setPreviousXP] = useState(stats.totalXP);
  const [previousLevel, setPreviousLevel] = useState(stats.level);
  const [xpAnimationKey, setXpAnimationKey] = useState(0);
  const [levelAnimationKey, setLevelAnimationKey] = useState(0);

  // Monitor XP and Level changes for animations
  useEffect(() => {
    if (stats.totalXP !== previousXP) {
      setXpAnimationKey(prev => prev + 1);
      setPreviousXP(stats.totalXP);
    }
  }, [stats.totalXP, previousXP]);

  useEffect(() => {
    if (stats.level !== previousLevel) {
      setLevelAnimationKey(prev => prev + 1);
      setPreviousLevel(stats.level);
    }
  }, [stats.level, previousLevel]);

  const startEditing = (task: Task) => {
    setEditingTask(task.id);
    setEditForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate || '',
      estimatedTime: task.estimatedTime,
      isRecurring: task.isRecurring || false,
      recurringInterval: task.recurringInterval || '',
      noDueDate: task.noDueDate || false
    });
    setCustomInterval(
      task.isRecurring && task.recurringInterval && !['daily', 'weekly', 'monthly'].includes(task.recurringInterval)
        ? task.recurringInterval
        : ''
    );
    setValidationErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Title validation
    if (!editForm.title.trim()) {
      errors.title = 'Title is required';
    } else if (editForm.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (editForm.title.trim().length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    // Description validation
    if (!editForm.description.trim()) {
      errors.description = 'Description is required';
    } else if (editForm.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (editForm.description.trim().length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    // Due date validation
    if (!editForm.noDueDate) {
      if (!editForm.dueDate) {
        errors.dueDate = 'Due date is required when "No Due Date" is not selected';
      } else {
        const selectedDate = new Date(editForm.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          errors.dueDate = 'Due date cannot be in the past';
        }
      }
    }

    // Estimated time validation
    if (editForm.estimatedTime < 5) {
      errors.estimatedTime = 'Estimated time must be at least 5 minutes';
    } else if (editForm.estimatedTime > 480) {
      errors.estimatedTime = 'Estimated time cannot exceed 8 hours (480 minutes)';
    }

    // Recurring task validation
    if (editForm.isRecurring) {
      if (!editForm.recurringInterval) {
        errors.recurringInterval = 'Please select a recurring interval';
      } else if (editForm.recurringInterval === 'custom' && !customInterval.trim()) {
        errors.customInterval = 'Please specify the custom interval';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveTask = () => {
    if (!editingTask) return;

    if (!validateForm()) {
      return;
    }

    const updates: Partial<Task> = {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      priority: editForm.priority,
      category: editForm.category,
      dueDate: editForm.noDueDate ? '' : editForm.dueDate,
      estimatedTime: editForm.estimatedTime,
      isRecurring: editForm.isRecurring,
      recurringInterval: editForm.isRecurring 
        ? (editForm.recurringInterval === 'custom' ? customInterval.trim() : editForm.recurringInterval)
        : undefined,
      noDueDate: editForm.noDueDate
    };

    onUpdateTask(editingTask, updates);
    setEditingTask(null);
    setValidationErrors({});
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setValidationErrors({});
    setCustomInterval('');
  };

  const addSubtask = (taskId: string) => {
    if (newSubtaskText.trim()) {
      onAddSubtask(taskId, newSubtaskText.trim());
      setNewSubtaskText('');
      setAddingSubtaskTo(null);
    }
  };

  const completedTasks = tasks.filter(task => task.completed);
  const pendingTasks = tasks.filter(task => !task.completed);

  return (
    <motion.div
      className="fixed inset-0 bg-gradient-to-br from-purple-900 to-pink-900 z-50 overflow-hidden"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Responsive Header with Three-Section Layout */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10 px-4 py-3 sm:px-6 sm:py-5 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Left: Back Button */}
          <motion.button
            className="w-9 h-9 sm:w-11 sm:h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 border border-white/20"
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.button>

          {/* Center: Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Completed Tasks Button */}
            <motion.button
              className="px-3 py-2 sm:px-4 sm:py-2 bg-green-500/20 text-green-300 rounded-full border border-green-500/30 hover:bg-green-500/30 flex items-center space-x-2 font-supreme"
              onClick={onViewCompletedTasks}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Award className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Completed</span>
              <span className="text-sm font-medium sm:hidden">{completedTasks.length}</span>
            </motion.button>

            {/* New Task Button */}
            <motion.button
              className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-semibold shadow-lg flex items-center space-x-2 hover:from-purple-600 hover:to-pink-600 border border-white/20 font-supreme"
              onClick={onAddTask}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">New Task</span>
            </motion.button>
          </div>

          {/* Right: Stats Container */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* XP Display */}
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <motion.div 
                  key={xpAnimationKey}
                  className="text-white text-xs sm:text-sm font-semibold leading-none font-general-sans"
                  animate={{
                    scale: [1, 1.1, 1],
                    color: ['rgba(255,255,255,1)', 'rgba(34,197,94,1)', 'rgba(255,255,255,1)']
                  }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                >
                  {stats.totalXP} XP
                </motion.div>
                <motion.div 
                  key={levelAnimationKey}
                  className="text-white/60 text-xs leading-none mt-0.5 font-general-sans"
                  animate={{
                    scale: [1, 1.1, 1],
                    color: ['rgba(255,255,255,0.6)', 'rgba(147,51,234,1)', 'rgba(255,255,255,0.6)']
                  }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                >
                  Level {stats.level}
                </motion.div>
              </div>
            </div>

            {/* Streak Display */}
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-white text-xs sm:text-sm font-semibold leading-none font-general-sans">{stats.currentStreak}</div>
                <div className="text-white/60 text-xs leading-none mt-0.5 font-general-sans">Streak</div>
              </div>
            </div>

            {/* Task Counter */}
            <div className="flex items-center space-x-2">
              <div className="text-right hidden sm:block">
                <div className="text-white text-xs sm:text-sm font-semibold leading-none font-general-sans">{pendingTasks.length} Active</div>
                <div className="text-white/60 text-xs leading-none mt-0.5 font-general-sans">{completedTasks.length} Done</div>
              </div>
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="h-full overflow-y-auto pb-20">
        <div className="p-6 space-y-8">
          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white/90 mb-4 flex items-center space-x-2 font-task-title">
                <div className="w-2 h-6 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full" />
                <span>Active Tasks ({pendingTasks.length})</span>
              </h2>
              <div className="space-y-4">
                {pendingTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isEditing={editingTask === task.id}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    customInterval={customInterval}
                    setCustomInterval={setCustomInterval}
                    validationErrors={validationErrors}
                    onStartEdit={() => startEditing(task)}
                    onSave={saveTask}
                    onCancel={cancelEdit}
                    onDelete={() => onDeleteTask(task.id)}
                    onToggleSubtask={onToggleSubtask}
                    onDeleteSubtask={onDeleteSubtask}
                    onAddSubtask={onAddSubtask}
                    editingSubtask={editingSubtask}
                    setEditingSubtask={setEditingSubtask}
                    addingSubtaskTo={addingSubtaskTo}
                    setAddingSubtaskTo={setAddingSubtaskTo}
                    newSubtaskText={newSubtaskText}
                    setNewSubtaskText={setNewSubtaskText}
                    addSubtask={addSubtask}
                  />
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Plus className="w-10 h-10 text-white/60" />
              </div>
              <h3 className="text-xl font-semibold text-white/80 mb-2 font-task-title">No tasks yet</h3>
              <p className="text-white/50 text-sm font-general-sans">Create your first task to get started on your productivity journey!</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface TaskItemProps {
  task: Task;
  isEditing: boolean;
  editForm: any;
  setEditForm: (form: any) => void;
  customInterval: string;
  setCustomInterval: (interval: string) => void;
  validationErrors: Record<string, string>;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, text: string) => void;
  editingSubtask: string | null;
  setEditingSubtask: (id: string | null) => void;
  addingSubtaskTo: string | null;
  setAddingSubtaskTo: (id: string | null) => void;
  newSubtaskText: string;
  setNewSubtaskText: (text: string) => void;
  addSubtask: (taskId: string) => void;
  isCompleted?: boolean;
}

function TaskItem({
  task,
  isEditing,
  editForm,
  setEditForm,
  customInterval,
  setCustomInterval,
  validationErrors,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  onToggleSubtask,
  onDeleteSubtask,
  addingSubtaskTo,
  setAddingSubtaskTo,
  newSubtaskText,
  setNewSubtaskText,
  addSubtask,
  isCompleted = false
}: TaskItemProps) {
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const progress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0;

  return (
    <motion.div
      className={`bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 shadow-lg ${
        isCompleted ? 'opacity-70' : ''
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isCompleted ? [1, 1.02, 1] : 1,
        boxShadow: isCompleted 
          ? [
              '0 0 0 rgba(34, 197, 94, 0)',
              '0 0 20px rgba(34, 197, 94, 0.3)',
              '0 0 0 rgba(34, 197, 94, 0)'
            ]
          : '0 0 0 rgba(34, 197, 94, 0)'
      }}
      whileHover={{ scale: isEditing ? 1 : 1.01 }}
      transition={{ 
        duration: 0.2,
        scale: { duration: 1, times: [0, 0.5, 1] },
        boxShadow: { duration: 1.5, times: [0, 0.5, 1] }
      }}
    >
      {isEditing ? (
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor={`edit-title-${task.id}`} className="sr-only">
              Task Title
            </label>
            <input
              type="text"
              id={`edit-title-${task.id}`}
              name="title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className={`w-full px-4 py-3 bg-white/10 rounded-xl border text-white placeholder-white/50 focus:outline-none focus:ring-2 font-general-sans ${
                validationErrors.title 
                  ? 'border-red-500/50 focus:ring-red-500/50' 
                  : 'border-white/20 focus:ring-purple-500/50'
              }`}
              placeholder="Task title"
            />
            {validationErrors.title && (
              <p className="text-red-400 text-xs mt-1 font-general-sans">{validationErrors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor={`edit-description-${task.id}`} className="sr-only">
              Task Description
            </label>
            <textarea
              id={`edit-description-${task.id}`}
              name="description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className={`w-full px-4 py-3 bg-white/10 rounded-xl border text-white placeholder-white/50 focus:outline-none focus:ring-2 resize-none font-general-sans ${
                validationErrors.description 
                  ? 'border-red-500/50 focus:ring-red-500/50' 
                  : 'border-white/20 focus:ring-purple-500/50'
              }`}
              placeholder="Description"
              rows={3}
            />
            {validationErrors.description && (
              <p className="text-red-400 text-xs mt-1 font-general-sans">{validationErrors.description}</p>
            )}
          </div>

          {/* Priority and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`edit-priority-${task.id}`} className="block text-white/90 text-sm font-medium mb-2 font-general-sans">Priority</label>
              <select
                id={`edit-priority-${task.id}`}
                name="priority"
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Task['priority'] })}
                className="w-full px-4 py-3 bg-white/10 rounded-xl border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-general-sans"
              >
                <option value="high" className="bg-gray-800">High</option>
                <option value="medium" className="bg-gray-800">Medium</option>
                <option value="low" className="bg-gray-800">Low</option>
              </select>
            </div>

            <div>
              <label htmlFor={`edit-category-${task.id}`} className="block text-white/90 text-sm font-medium mb-2 font-general-sans">Category</label>
              <select
                id={`edit-category-${task.id}`}
                name="category"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 rounded-xl border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-general-sans"
              >
                {categories.map(category => (
                  <option key={category} value={category} className="bg-gray-800">
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date and Estimated Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor={`edit-due-date-${task.id}`} className="text-white/90 text-sm font-medium font-general-sans">Due Date</label>
                <label htmlFor={`edit-no-due-date-${task.id}`} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id={`edit-no-due-date-${task.id}`}
                    name="noDueDate"
                    checked={editForm.noDueDate}
                    onChange={(e) => setEditForm({ ...editForm, noDueDate: e.target.checked })}
                    className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-500/50"
                  />
                  <span className="text-white/70 text-xs font-general-sans">No Due Date</span>
                </label>
              </div>
              <input
                type="date"
                id={`edit-due-date-${task.id}`}
                name="dueDate"
                value={editForm.noDueDate ? '' : editForm.dueDate}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                disabled={editForm.noDueDate}
                className={`w-full px-4 py-3 rounded-xl border text-white focus:outline-none focus:ring-2 font-general-sans ${
                  editForm.noDueDate 
                    ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed' 
                    : validationErrors.dueDate
                      ? 'bg-white/10 border-red-500/50 focus:ring-red-500/50'
                      : 'bg-white/10 border-white/20 focus:ring-purple-500/50'
                }`}
              />
              {validationErrors.dueDate && (
                <p className="text-red-400 text-xs mt-1 font-general-sans">{validationErrors.dueDate}</p>
              )}
            </div>

            <div>
              <label htmlFor={`edit-estimated-time-${task.id}`} className="block text-white/90 text-sm font-medium mb-2 font-general-sans">Time (min)</label>
              <input
                type="number"
                id={`edit-estimated-time-${task.id}`}
                name="estimatedTime"
                value={editForm.estimatedTime}
                onChange={(e) => setEditForm({ ...editForm, estimatedTime: parseInt(e.target.value) || 25 })}
                min="5"
                max="480"
                step="5"
                className={`w-full px-4 py-3 bg-white/10 rounded-xl border text-white focus:outline-none focus:ring-2 font-general-sans ${
                  validationErrors.estimatedTime 
                    ? 'border-red-500/50 focus:ring-red-500/50' 
                    : 'border-white/20 focus:ring-purple-500/50'
                }`}
              />
              {validationErrors.estimatedTime && (
                <p className="text-red-400 text-xs mt-1 font-general-sans">{validationErrors.estimatedTime}</p>
              )}
            </div>
          </div>

          {/* Recurring Task Toggle */}
          <div>
            <label htmlFor={`edit-recurring-${task.id}`} className="flex items-center space-x-3 cursor-pointer mb-3">
              <div className="relative">
                <input
                  type="checkbox"
                  id={`edit-recurring-${task.id}`}
                  name="isRecurring"
                  checked={editForm.isRecurring}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    isRecurring: e.target.checked,
                    recurringInterval: e.target.checked ? 'daily' : ''
                  })}
                  className="sr-only"
                />
                <motion.div
                  className={`w-12 h-6 rounded-full border-2 transition-all ${
                    editForm.isRecurring 
                      ? 'bg-purple-500/30 border-purple-500' 
                      : 'bg-white/10 border-white/30'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="w-4 h-4 rounded-full bg-white shadow-md"
                    style={{ marginTop: '2px' }}
                    animate={{ x: editForm.isRecurring ? 24 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </motion.div>
              </div>
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-white/80" />
                <span className="text-white/90 font-medium font-general-sans">Recurring Task</span>
              </div>
            </label>

            {editForm.isRecurring && (
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <fieldset>
                  <legend className="sr-only">Recurring Interval</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {recurringOptions.map((option) => (
                      <motion.label
                        key={option.value}
                        className={`p-2 rounded-lg border transition-all text-sm cursor-pointer font-supreme ${
                          editForm.recurringInterval === option.value
                            ? 'border-purple-500/50 bg-purple-500/20 text-purple-300'
                            : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <input
                          type="radio"
                          name={`recurring-interval-${task.id}`}
                          value={option.value}
                          checked={editForm.recurringInterval === option.value}
                          onChange={() => setEditForm({ ...editForm, recurringInterval: option.value })}
                          className="sr-only"
                        />
                        {option.label}
                      </motion.label>
                    ))}
                  </div>
                </fieldset>

                {editForm.recurringInterval === 'custom' && (
                  <div>
                    <label htmlFor={`custom-interval-${task.id}`} className="sr-only">
                      Custom Recurring Interval
                    </label>
                    <input
                      type="text"
                      id={`custom-interval-${task.id}`}
                      name="customInterval"
                      value={customInterval}
                      onChange={(e) => setCustomInterval(e.target.value)}
                      className={`w-full px-3 py-2 bg-white/10 rounded-lg border text-white placeholder-white/50 focus:outline-none focus:ring-2 text-sm font-general-sans ${
                        validationErrors.customInterval 
                          ? 'border-red-500/50 focus:ring-red-500/50' 
                          : 'border-white/20 focus:ring-purple-500/50'
                      }`}
                      placeholder="e.g., Every 3 days, Twice a week..."
                    />
                    {validationErrors.customInterval && (
                      <p className="text-red-400 text-xs mt-1 font-general-sans">{validationErrors.customInterval}</p>
                    )}
                  </div>
                )}

                {validationErrors.recurringInterval && (
                  <p className="text-red-400 text-xs font-general-sans">{validationErrors.recurringInterval}</p>
                )}
              </motion.div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <motion.button
              className="px-6 py-3 bg-green-500/20 text-green-300 rounded-xl border border-green-500/30 hover:bg-green-500/30 flex items-center space-x-2 font-medium font-supreme"
              onClick={onSave}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </motion.button>
            <motion.button
              className="px-6 py-3 bg-red-500/20 text-red-300 rounded-xl border border-red-500/30 hover:bg-red-500/30 flex items-center space-x-2 font-medium font-supreme"
              onClick={onCancel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </motion.button>
          </div>
        </div>
      ) : (
        <>
          {/* Task Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className={`text-lg font-semibold mb-2 font-task-title ${isCompleted ? 'text-white/60 line-through' : 'text-white'}`}>
                {task.title}
              </h3>
              <p className={`text-sm font-general-sans ${isCompleted ? 'text-white/40' : 'text-white/70'}`}>
                {task.description}
              </p>
            </div>
            {!isCompleted && (
              <div className="flex space-x-2 ml-4">
                <motion.button
                  className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20"
                  onClick={onStartEdit}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Edit3 className="w-4 h-4" />
                </motion.button>
                <motion.button
                  className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-300 hover:bg-red-500/30"
                  onClick={onDelete}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>

          {/* Task Meta */}
          <div className="flex items-center space-x-4 mb-4">
            <span className={`px-3 py-1 rounded-xl text-xs font-medium border font-general-sans ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
            {!task.noDueDate && task.dueDate && (
              <div className="flex items-center space-x-1 text-white/60 text-xs font-general-sans">
                <Calendar className="w-3 h-3" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center space-x-1 text-white/60 text-xs font-general-sans">
              <Clock className="w-3 h-3" />
              <span>{task.estimatedTime}min</span>
            </div>
            {task.isRecurring && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs border border-blue-500/30 font-general-sans">
                {task.recurringInterval}
              </span>
            )}
          </div>

          {/* Enhanced Progress with Smooth Animation */}
          <div className="mb-4">
            <div className="flex justify-between text-white/70 text-xs mb-2 font-general-sans">
              <span>Progress</span>
              <span>{completedSubtasks}/{task.subtasks.length}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ 
                  duration: 0.6, 
                  ease: "easeOut",
                  type: "tween"
                }}
              />
              {/* Progress completion glow effect */}
              {progress === 100 && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 h-2 rounded-full"
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{ 
                    opacity: [0, 0.7, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ 
                    duration: 1,
                    times: [0, 0.5, 1],
                    ease: "easeInOut"
                  }}
                />
              )}
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            {task.subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center space-x-3 group">
                <motion.button
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                    subtask.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-white/50 hover:border-white/80'
                  }`}
                  onClick={() => onToggleSubtask(task.id, subtask.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={subtask.completed ? {
                    scale: [1, 1.2, 1],
                    boxShadow: [
                      '0 0 0 rgba(34, 197, 94, 0)',
                      '0 0 10px rgba(34, 197, 94, 0.5)',
                      '0 0 0 rgba(34, 197, 94, 0)'
                    ]
                  } : {}}
                  transition={{ duration: 0.6 }}
                >
                  {subtask.completed && <Check className="w-3 h-3 text-white" />}
                </motion.button>
                <span
                  className={`text-sm flex-1 font-general-sans ${
                    subtask.completed ? 'text-white/50 line-through' : 'text-white/80'
                  }`}
                >
                  {subtask.text}
                </span>
                {!isCompleted && (
                  <motion.button
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 bg-red-500/20 rounded flex items-center justify-center text-red-300 hover:bg-red-500/30"
                    onClick={() => onDeleteSubtask(task.id, subtask.id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </motion.button>
                )}
              </div>
            ))}

            {/* Add Subtask */}
            {!isCompleted && (
              <div className="mt-3">
                {addingSubtaskTo === task.id ? (
                  <div className="flex space-x-2">
                    <label htmlFor={`new-subtask-${task.id}`} className="sr-only">
                      New Subtask
                    </label>
                    <input
                      type="text"
                      id={`new-subtask-${task.id}`}
                      name="newSubtask"
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm font-general-sans"
                      placeholder="New subtask..."
                      onKeyPress={(e) => e.key === 'Enter' && addSubtask(task.id)}
                      autoFocus
                    />
                    <motion.button
                      className="px-3 py-2 bg-green-500/20 text-green-300 rounded-xl border border-green-500/30 hover:bg-green-500/30 font-supreme"
                      onClick={() => addSubtask(task.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      className="px-3 py-2 bg-red-500/20 text-red-300 rounded-xl border border-red-500/30 hover:bg-red-500/30 font-supreme"
                      onClick={() => setAddingSubtaskTo(null)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    className="flex items-center space-x-2 text-white/60 hover:text-white/80 text-sm font-supreme"
                    onClick={() => setAddingSubtaskTo(task.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add subtask</span>
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}