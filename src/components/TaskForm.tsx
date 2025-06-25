import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Calendar, Clock, Target, RotateCcw, Loader2, Sparkles, AlertCircle, Trash2, Wand2 } from 'lucide-react';
import { Task, Subtask } from '../types/task';
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
    noDueDate: false,
    subtasks: [] as Subtask[],
    imageUrl: '',
    motivationalQuote: ''
  });

  const [customInterval, setCustomInterval] = useState('');
  const [newManualSubtaskText, setNewManualSubtaskText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [contextStatus, setContextStatus] = useState<{
    type: 'success' | 'warning' | 'error' | null;
    message: string;
    source?: 'ai' | 'fallback' | 'emergency_fallback';
  }>({ type: null, message: '' });

  const generateTaskContext = async (title: string, description: string, dueDate: string, recurrence: string) => {
    try {
      console.log('🎨 Calling AI task context generation...');
      setContextStatus({ type: null, message: '' });

      // Check if Supabase URL is configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured in environment variables');
      }

      // Check if we're in development and the URL looks like a local dev server
      if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('local-credentialless')) {
        console.warn('⚠️ Detected local development environment, AI features may not work');
        throw new Error('AI features are not available in local development mode');
      }

      const { data, error } = await supabase.functions.invoke('generate-task-context', {
        body: {
          taskName: title.trim(),
          taskDetails: description.trim(),
          dueDate: dueDate || undefined,
          recurrence: recurrence || undefined
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        
        // Handle different types of errors
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('NetworkError') ||
            error.message?.includes('Failed to send a request')) {
          throw new Error('Unable to connect to AI service. This might be due to local development environment or network issues.');
        }
        
        if (error.message?.includes('Function not found')) {
          throw new Error('AI task context function is not deployed. Please deploy the edge function first.');
        }
        
        throw new Error(error.message || 'Failed to generate task context');
      }

      if (!data || !data.success) {
        console.error('❌ AI generation failed:', data?.error);
        throw new Error(data?.error || 'AI task context generation failed');
      }

      console.log('✅ AI generated task context:', data);

      // Update form with AI-generated content
      setFormData(prev => ({
        ...prev,
        imageUrl: data.imageUrl || '',
        motivationalQuote: data.quote || '',
        subtasks: data.subtasks?.map((text: string, index: number) => ({
          id: `ai-subtask-${index}`,
          text,
          completed: false
        })) || []
      }));

      // Set status based on the source
      if (data.source === 'ai') {
        setContextStatus({
          type: 'success',
          message: 'AI generated personalized content for your task!',
          source: 'ai'
        });
      } else if (data.source === 'fallback') {
        setContextStatus({
          type: 'warning',
          message: 'Generated smart suggestions (AI temporarily unavailable)',
          source: 'fallback'
        });
      } else {
        setContextStatus({
          type: 'warning',
          message: 'Generated basic suggestions',
          source: 'emergency_fallback'
        });
      }

      return data;

    } catch (error: any) {
      console.error('💥 Error generating AI task context:', error);
      
      // Generate local fallback content
      const fallbackData = generateLocalFallbackContent(title, description);
      
      setFormData(prev => ({
        ...prev,
        imageUrl: fallbackData.imageUrl,
        motivationalQuote: fallbackData.quote,
        subtasks: fallbackData.subtasks.map((text, index) => ({
          id: `fallback-subtask-${index}`,
          text,
          completed: false
        }))
      }));

      // Set appropriate error message
      let errorMessage = 'Generated offline suggestions. ';
      if (error.message?.includes('local development')) {
        errorMessage += 'AI features require production deployment.';
      } else if (error.message?.includes('not deployed')) {
        errorMessage += 'Please deploy the edge function first.';
      } else if (error.message?.includes('Unable to connect')) {
        errorMessage += 'Check your internet connection.';
      } else {
        errorMessage += 'AI service temporarily unavailable.';
      }

      setContextStatus({
        type: 'warning',
        message: errorMessage,
        source: 'emergency_fallback'
      });

      return fallbackData;
    }
  };

  const generateLocalFallbackContent = (title: string, description: string) => {
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    const combined = `${titleLower} ${descLower}`.trim();

    // Simple keyword-based suggestions
    const patterns = [
      {
        keywords: ['exercise', 'workout', 'gym', 'run', 'fitness'],
        quote: "Your body can do it. It's your mind you need to convince.",
        subtasks: ['Prepare workout gear', 'Complete the exercise', 'Cool down and stretch']
      },
      {
        keywords: ['study', 'learn', 'research', 'read'],
        quote: "Learning is the only thing the mind never exhausts.",
        subtasks: ['Gather study materials', 'Focus on key concepts', 'Review and practice']
      },
      {
        keywords: ['clean', 'organize', 'tidy'],
        quote: "A clean space creates a clear mind.",
        subtasks: ['Gather cleaning supplies', 'Clean systematically', 'Organize and finish']
      },
      {
        keywords: ['write', 'document', 'report'],
        quote: "The first draft is just you telling yourself the story.",
        subtasks: ['Outline main points', 'Write the content', 'Review and edit']
      }
    ];

    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => combined.includes(keyword))) {
        return {
          imageUrl: `https://picsum.photos/400/300?random=${Date.now()}`,
          quote: pattern.quote,
          subtasks: pattern.subtasks
        };
      }
    }

    // Default fallback
    return {
      imageUrl: `https://picsum.photos/400/300?random=${Date.now()}`,
      quote: "Progress, not perfection, is the goal.",
      subtasks: [
        'Plan and prepare for the task',
        `Work on: ${title}`,
        'Review and complete'
      ]
    };
  };

  const handleGenerateAISubtasks = async () => {
    if (!formData.title.trim()) {
      setContextStatus({
        type: 'error',
        message: 'Please enter a task title first',
      });
      return;
    }

    setIsGeneratingAI(true);
    setContextStatus({ type: null, message: '' });

    try {
      await generateTaskContext(
        formData.title,
        formData.description,
        formData.noDueDate ? '' : formData.dueDate,
        formData.isRecurring ? formData.recurringInterval : ''
      );
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const addManualSubtask = () => {
    if (newManualSubtaskText.trim()) {
      const newSubtask: Subtask = {
        id: `manual-${Date.now()}`,
        text: newManualSubtaskText.trim(),
        completed: false
      };
      setFormData(prev => ({
        ...prev,
        subtasks: [...prev.subtasks, newSubtask]
      }));
      setNewManualSubtaskText('');
    }
  };

  const removeSubtask = (id: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter(subtask => subtask.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const task: Omit<Task, 'id' | 'createdAt'> = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority,
      category: formData.category,
      dueDate: formData.noDueDate ? null : formData.dueDate,
      estimatedTime: formData.estimatedTime,
      completed: false,
      isRecurring: formData.isRecurring,
      recurringInterval: formData.isRecurring ? (formData.recurringInterval === 'custom' ? customInterval : formData.recurringInterval) : null,
      subtasks: formData.subtasks,
      imageUrl: formData.imageUrl,
      motivationalQuote: formData.motivationalQuote
    };

    onSubmit(task);
    onClose();
  };

  // Rest of your component JSX remains the same...
  // I'll just show the key parts that changed

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create New Task</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* AI Context Status */}
          <AnimatePresence>
            {contextStatus.type && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                  contextStatus.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : contextStatus.type === 'warning'
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {contextStatus.type === 'success' ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {contextStatus.message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Generation Button */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Smart Task Assistant</h3>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleGenerateAISubtasks}
                disabled={isGeneratingAI || !formData.title.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium flex items-center gap-2 hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Smart Content
                  </>
                )}
              </motion.button>
            </div>
            
            <p className="text-sm text-gray-600">
              Get AI-powered suggestions for subtasks, motivational quotes, and visual inspiration for your task.
            </p>
          </div>

          {/* Task Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What needs to be done?"
              required
            />
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional details about this task..."
              rows={3}
            />
          </div>

          {/* Priority and Category Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date and Time Estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Due Date
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="noDueDate"
                    checked={formData.noDueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, noDueDate: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="noDueDate" className="text-sm text-gray-600">
                    No due date
                  </label>
                </div>
                {!formData.noDueDate && (
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Estimated Time (minutes)
              </label>
              <input
                type="number"
                value={formData.estimatedTime}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="5"
                step="5"
              />
            </div>
          </div>

          {/* Recurring Task Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                Recurring Task
              </label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Recurrence Pattern
                </label>
                <select
                  value={formData.recurringInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurringInterval: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select pattern</option>
                  {recurringOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                {formData.recurringInterval === 'custom' && (
                  <input
                    type="text"
                    value={customInterval}
                    onChange={(e) => setCustomInterval(e.target.value)}
                    placeholder="e.g., Every 3 days, Twice a week"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>
            )}
          </div>

          {/* Motivational Quote Display */}
          {formData.motivationalQuote && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Motivation</h4>
                  <p className="text-sm text-gray-700 italic">"{formData.motivationalQuote}"</p>
                </div>
              </div>
            </div>
          )}

          {/* Subtasks Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Subtasks</h3>
              <span className="text-sm text-gray-500">
                {formData.subtasks.length} subtask{formData.subtasks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Display AI/Generated Subtasks */}
            {formData.subtasks.length > 0 && (
              <div className="space-y-2">
                {formData.subtasks.map((subtask, index) => (
                  <motion.div
                    key={subtask.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-700">{subtask.text}</span>
                    <button
                      type="button"
                      onClick={() => removeSubtask(subtask.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Manual Subtask Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newManualSubtaskText}
                onChange={(e) => setNewManualSubtaskText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addManualSubtask())}
                placeholder="Add a subtask..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addManualSubtask}
                disabled={!newManualSubtaskText.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Create Task
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}