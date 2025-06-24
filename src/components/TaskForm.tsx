import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Calendar, Clock, Target, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import { Task } from '../types/task';
import { generateAISuggestion } from '../utils/taskGenerator';
import { supabase } from '../lib/supabase';

interface TaskFormProps {
  onSubmit: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const categories = [
  'Work', 'Personal', 'Health', 'Learning', 'Creative', 'Social', 'Finance', 'Other'
];

const recurringOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' }
];

export function TaskForm({ onSubmit, onClose }: TaskFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    category: 'Personal',
    dueDate: new Date().toISOString().split('T')[0],
    estimatedTime: 25,
    isRecurring: false,
    recurringInterval: '',
    noDueDate: false
  });

  const [customInterval, setCustomInterval] = useState('');
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [subtaskError, setSubtaskError] = useState<string | null>(null);

  const generateAISubtasks = async (title: string, description: string, priority: string, category: string) => {
    try {
      console.log('🤖 Calling AI subtask generation...');
      setIsGeneratingSubtasks(true);
      setSubtaskError(null);

      const { data, error } = await supabase.functions.invoke('generate-subtasks', {
        body: {
          title: title.trim(),
          description: description.trim(),
          priority,
          category
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to generate subtasks');
      }

      if (!data.success) {
        console.error('❌ AI generation failed:', data.error);
        throw new Error(data.error || 'AI subtask generation failed');
      }

      console.log('✅ AI generated subtasks:', data.subtasks);
      
      // Transform AI-generated strings into Subtask objects
      return data.subtasks.map((text: string, index: number) => ({
        id: `ai-subtask-${Date.now()}-${index}`,
        text,
        completed: false
      }));

    } catch (error) {
      console.error('💥 Error generating AI subtasks:', error);
      setSubtaskError(error instanceof Error ? error.message : 'Failed to generate subtasks');
      
      // Return fallback subtasks
      return [
        { id: `fallback-subtask-${Date.now()}-0`, text: 'Plan and prepare for the task', completed: false },
        { id: `fallback-subtask-${Date.now()}-1`, text: `Complete the main part of: ${title}`, completed: false },
        { id: `fallback-subtask-${Date.now()}-2`, text: 'Review and finalize the task', completed: false }
      ];
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only require title, provide defaults for everything else
    if (!formData.title.trim()) {
      return;
    }

    try {
      // Generate AI subtasks
      const subtasks = await generateAISubtasks(
        formData.title,
        formData.description,
        formData.priority,
        formData.category
      );
      
      const aiSuggestion = generateAISuggestion();

      const newTask: Omit<Task, 'id' | 'createdAt'> = {
        title: formData.title.trim(),
        description: formData.description.trim() || `Complete: ${formData.title.trim()}`, // Default description
        priority: formData.priority,
        category: formData.category,
        dueDate: formData.noDueDate ? '' : formData.dueDate,
        estimatedTime: formData.estimatedTime,
        completed: false,
        likes: 0,
        subtasks,
        aiSuggestion,
        isRecurring: formData.isRecurring,
        recurringInterval: formData.isRecurring 
          ? (formData.recurringInterval === 'custom' ? customInterval : formData.recurringInterval)
          : undefined,
        noDueDate: formData.noDueDate
      };

      onSubmit(newTask);
    } catch (error) {
      console.error('Error creating task:', error);
      // Still submit the task even if AI generation fails
      const aiSuggestion = generateAISuggestion();
      const fallbackSubtasks = [
        { id: `fallback-${Date.now()}-0`, text: 'Plan and prepare for the task', completed: false },
        { id: `fallback-${Date.now()}-1`, text: `Complete: ${formData.title.trim()}`, completed: false },
        { id: `fallback-${Date.now()}-2`, text: 'Review and finalize', completed: false }
      ];

      const newTask: Omit<Task, 'id' | 'createdAt'> = {
        title: formData.title.trim(),
        description: formData.description.trim() || `Complete: ${formData.title.trim()}`,
        priority: formData.priority,
        category: formData.category,
        dueDate: formData.noDueDate ? '' : formData.dueDate,
        estimatedTime: formData.estimatedTime,
        completed: false,
        likes: 0,
        subtasks: fallbackSubtasks,
        aiSuggestion,
        isRecurring: formData.isRecurring,
        recurringInterval: formData.isRecurring 
          ? (formData.recurringInterval === 'custom' ? customInterval : formData.recurringInterval)
          : undefined,
        noDueDate: formData.noDueDate
      };

      onSubmit(newTask);
    }
  };

  const priorityColors = {
    high: 'border-red-500/50 bg-red-500/10',
    medium: 'border-yellow-500/50 bg-yellow-500/10',
    low: 'border-green-500/50 bg-green-500/10'
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-md rounded-3xl p-6 w-full max-w-lg border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-white font-task-title">Create New Task</h2>
            <div className="flex items-center space-x-1 px-2 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
              <Sparkles className="w-3 h-3 text-purple-300" />
              <span className="text-xs text-purple-300 font-medium font-general-sans">AI Powered</span>
            </div>
          </div>
          <motion.button
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title - REQUIRED */}
          <div>
            <label htmlFor="task-title" className="block text-white/90 text-sm font-medium mb-2 font-general-sans">
              Task Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="task-title"
              name="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-general-sans"
              placeholder="What needs to be done?"
              required
              autoFocus
            />
          </div>

          {/* Description - OPTIONAL */}
          <div>
            <label htmlFor="task-description" className="block text-white/90 text-sm font-medium mb-2 font-general-sans">
              Description <span className="text-white/50 text-xs">(optional)</span>
            </label>
            <textarea
              id="task-description"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-general-sans"
              placeholder="Add more details... (optional)"
              rows={3}
            />
          </div>

          {/* Priority */}
          <div>
            <fieldset>
              <legend className="block text-white/90 text-sm font-medium mb-2 font-general-sans">
                Priority Level
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(['high', 'medium', 'low'] as const).map((priority) => (
                  <motion.label
                    key={priority}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer font-supreme ${
                      formData.priority === priority 
                        ? priorityColors[priority]
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority}
                      checked={formData.priority === priority}
                      onChange={() => setFormData(prev => ({ ...prev, priority }))}
                      className="sr-only"
                    />
                    <div className="flex flex-col items-center space-y-1">
                      <Target className="w-4 h-4 text-white/80" />
                      <span className="text-xs text-white/90 capitalize font-medium">
                        {priority}
                      </span>
                    </div>
                  </motion.label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Category and Estimated Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-category" className="block text-white/90 text-sm font-medium mb-2 font-general-sans">
                Category
              </label>
              <select
                id="task-category"
                name="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-general-sans"
              >
                {categories.map(category => (
                  <option key={category} value={category} className="bg-gray-800">
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-estimated-time" className="block text-white/90 text-sm font-medium mb-2 font-general-sans">
                Estimated Time (min)
              </label>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-white/60" />
                <input
                  type="number"
                  id="task-estimated-time"
                  name="estimatedTime"
                  value={formData.estimatedTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 25 }))}
                  className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-general-sans"
                  min="5"
                  max="240"
                  step="5"
                />
              </div>
            </div>
          </div>

          {/* Recurring Task Toggle */}
          <div>
            <label htmlFor="task-recurring" className="flex items-center space-x-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  id="task-recurring"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    isRecurring: e.target.checked,
                    recurringInterval: e.target.checked ? 'daily' : ''
                  }))}
                  className="sr-only"
                />
                <motion.div
                  className={`w-12 h-6 rounded-full border-2 transition-all ${
                    formData.isRecurring 
                      ? 'bg-purple-500/30 border-purple-500' 
                      : 'bg-white/10 border-white/30'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transition-all ${
                      formData.isRecurring ? 'translate-x-6' : 'translate-x-1'
                    }`}
                    style={{ marginTop: '2px' }}
                    animate={{ x: formData.isRecurring ? 24 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </motion.div>
              </div>
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-white/80" />
                <span className="text-white/90 font-medium font-general-sans">Recurring Task</span>
              </div>
            </label>

            {/* Recurring Options */}
            {formData.isRecurring && (
              <motion.div
                className="mt-3 space-y-3"
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
                          formData.recurringInterval === option.value
                            ? 'border-purple-500/50 bg-purple-500/20 text-purple-300'
                            : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <input
                          type="radio"
                          name="recurringInterval"
                          value={option.value}
                          checked={formData.recurringInterval === option.value}
                          onChange={() => setFormData(prev => ({ ...prev, recurringInterval: option.value }))}
                          className="sr-only"
                        />
                        {option.label}
                      </motion.label>
                    ))}
                  </div>
                </fieldset>

                {/* Custom Interval Input */}
                {formData.recurringInterval === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <label htmlFor="custom-interval" className="sr-only">
                      Custom Recurring Interval
                    </label>
                    <input
                      type="text"
                      id="custom-interval"
                      name="customInterval"
                      value={customInterval}
                      onChange={(e) => setCustomInterval(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm font-general-sans"
                      placeholder="e.g., Every 3 days, Twice a week..."
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          {/* Due Date Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="task-due-date" className="text-white/90 text-sm font-medium font-general-sans">
                Due Date
              </label>
              <label htmlFor="task-no-due-date" className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="task-no-due-date"
                  name="noDueDate"
                  checked={formData.noDueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, noDueDate: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-500/50"
                />
                <span className="text-white/70 text-sm font-general-sans">No Due Date</span>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className={`w-5 h-5 ${formData.noDueDate ? 'text-white/30' : 'text-white/60'}`} />
              <input
                type="date"
                id="task-due-date"
                name="dueDate"
                value={formData.noDueDate ? '' : formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                disabled={formData.noDueDate}
                className={`flex-1 px-4 py-3 backdrop-blur-sm rounded-xl border text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-general-sans ${
                  formData.noDueDate 
                    ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed' 
                    : 'bg-white/10 border-white/20'
                }`}
              />
            </div>
            
            {formData.noDueDate && (
              <p className="text-white/50 text-xs mt-1 font-general-sans">This task has no specific deadline</p>
            )}
          </div>

          {/* AI Subtask Generation Status */}
          {subtaskError && (
            <motion.div
              className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-300 text-sm font-general-sans"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>AI subtask generation had an issue, but we'll use smart defaults instead.</span>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={!formData.title.trim() || isGeneratingSubtasks}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold flex items-center justify-center space-x-2 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-lg font-supreme disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!formData.title.trim() || isGeneratingSubtasks ? {} : { scale: 1.02 }}
            whileTap={!formData.title.trim() || isGeneratingSubtasks ? {} : { scale: 0.98 }}
          >
            {isGeneratingSubtasks ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating AI Subtasks...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Create Task</span>
              </>
            )}
          </motion.button>

          {/* Helper Text */}
          <div className="text-center space-y-1">
            <p className="text-white/50 text-xs font-general-sans">
              Only task title is required. All other fields are optional with smart defaults.
            </p>
            <div className="flex items-center justify-center space-x-1 text-purple-300/70 text-xs">
              <Sparkles className="w-3 h-3" />
              <span className="font-general-sans">AI will automatically generate 3 helpful subtasks for you</span>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}