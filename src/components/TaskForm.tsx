import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Calendar, Clock, Target, RotateCcw, Loader2, Sparkles, AlertCircle, Trash2, Wand2, Zap, AlertTriangle, CheckCircle, Lock, User } from 'lucide-react';
import { Task, Subtask } from '../types/task';
import { useAuth } from '../hooks/useAuth';
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
  const { user } = useAuth();
  
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
    motivationalQuote: ''
  });

  const [customInterval, setCustomInterval] = useState('');
  const [newManualSubtaskText, setNewManualSubtaskText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [contextStatus, setContextStatus] = useState<{
    type: 'success' | 'warning' | 'error' | null;
    message: string;
    source?: 'ai' | 'fallback' | 'emergency_fallback';
  }>({ type: null, message: '' });

  // Scroll indicator state
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const generateTaskContext = async (title: string, description: string, dueDate: string, recurrence: string) => {
    try {
      console.log('🎨 Calling AI task context generation...');
      setContextStatus({ type: null, message: '' });

      console.log('📡 Calling Supabase Edge Function: generate-task-context');

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
        throw new Error(error.message || 'Edge function call failed');
      }

      console.log('✅ Edge function response:', data);

      if (!data || !data.success) {
        console.error('❌ AI generation failed:', data?.error);
        throw new Error(data?.error || 'AI task context generation failed');
      }

      // Update form with AI-generated content
      setFormData(prev => ({
        ...prev,
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
        motivationalQuote: fallbackData.quote,
        subtasks: fallbackData.subtasks.map((text, index) => ({
          id: `fallback-subtask-${index}`,
          text,
          completed: false
        }))
      }));

      // Set appropriate error message
      let errorMessage = 'Generated offline suggestions. ';
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage += 'Check your internet connection.';
      } else if (error.message?.includes('HTTP 404')) {
        errorMessage += 'AI service endpoint not found.';
      } else if (error.message?.includes('HTTP 401') || error.message?.includes('HTTP 403')) {
        errorMessage += 'Authentication failed.';
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
          quote: pattern.quote,
          subtasks: pattern.subtasks
        };
      }
    }

    // Default fallback
    return {
      quote: "Progress, not perfection, is the goal.",
      subtasks: [
        'Plan and prepare for the task',
        `Work on: ${title}`,
        'Review and complete'
      ]
    };
  };

  const handleGenerateAISubtasks = async () => {
    // Check if user is authenticated
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

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
    
    if (!formData.title.trim()) {
      return;
    }

    const newTask: Omit<Task, 'id' | 'createdAt'> = {
      title: formData.title.trim(),
      description: formData.description.trim() || `Complete: ${formData.title.trim()}`,
      priority: formData.priority,
      category: formData.category,
      dueDate: formData.noDueDate ? '' : formData.dueDate,
      estimatedTime: formData.estimatedTime,
      completed: false,
      likes: 0,
      subtasks: formData.subtasks.length > 0 ? formData.subtasks : [
        { id: `default-subtask-${Date.now()}-0`, text: 'Plan and prepare for the task', completed: false },
        { id: `default-subtask-${Date.now()}-1`, text: `Complete the main part of: ${formData.title}`, completed: false },
        { id: `default-subtask-${Date.now()}-2`, text: 'Review and finalize the task', completed: false }
      ],
      motivationalQuote: formData.motivationalQuote || 'Every step forward is progress.',
      isRecurring: formData.isRecurring,
      recurringInterval: formData.isRecurring 
        ? (formData.recurringInterval === 'custom' ? customInterval : formData.recurringInterval)
        : undefined,
      noDueDate: formData.noDueDate
    };

    onSubmit(newTask);
  };

  const priorityConfig = {
    high: {
      icon: <AlertTriangle className="w-5 h-5" />,
      colors: 'border-red-500/50 bg-red-500/10 text-red-300'
    },
    medium: {
      icon: <Zap className="w-5 h-5" />,
      colors: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300'
    },
    low: {
      icon: <CheckCircle className="w-5 h-5" />,
      colors: 'border-green-500/50 bg-green-500/10 text-green-300'
    }
  };

  const getStatusIcon = () => {
    switch (contextStatus.type) {
      case 'success':
        return <Sparkles className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (contextStatus.type) {
      case 'success':
        return 'bg-green-500/20 border-green-500/30 text-green-300';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300';
      case 'error':
        return 'bg-red-500/20 border-red-500/30 text-red-300';
      default:
        return '';
    }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-md rounded-3xl p-6 w-full max-w-lg border border-white/20 shadow-2xl max-h-[90vh] relative overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {/* Custom Scroll Indicator */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-10">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
              style={{ width: `${scrollProgress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white font-task-title">Create New Task</h2>
            <motion.button
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Scrollable Content */}
          <div 
            ref={scrollContainerRef}
            className="overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style jsx>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}</style>

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
                  placeholder="Add more details to help AI generate better context..."
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
                            ? priorityConfig[priority].colors
                            : 'border-white/20 bg-white/5 hover:bg-white/10 text-white/80'
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
                          {priorityConfig[priority].icon}
                          <span className="text-xs font-medium capitalize">
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
                <div className="flex-1">
                  <label htmlFor="task-category" className="block text-white/90 text-sm font-medium mb-2 font-general-sans">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      id="task-category"
                      name="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-general-sans appearance-none pr-10"
                    >
                      {categories.map(category => (
                        <option key={category} value={category} className="bg-gray-800">
                          {category}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <label htmlFor="task-estimated-time" className="block text-white/90 text-sm font-medium mb-2 font-general-sans">
                    Estimated Time (min)
                  </label>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-white/60 flex-shrink-0" />
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

              {/* Motivational Quote Display */}
              {formData.motivationalQuote && (
                <motion.div
                  className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-purple-300 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-white mb-1 font-general-sans">AI Motivation</h4>
                      <p className="text-sm text-white/80 italic font-general-sans">"{formData.motivationalQuote}"</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Subtasks Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white font-task-title">Subtasks</h3>
                  <span className="text-sm text-white/60 font-general-sans">
                    {formData.subtasks.length} subtask{formData.subtasks.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Display Generated Subtasks */}
                {formData.subtasks.length > 0 && (
                  <div className="space-y-2">
                    {formData.subtasks.map((subtask, index) => (
                      <motion.div
                        key={subtask.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
                      >
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-500/20 text-purple-300 rounded-full flex items-center justify-center text-sm font-medium font-general-sans">
                          {index + 1}
                        </span>
                        <span className="flex-1 text-sm text-white/90 font-general-sans">{subtask.text}</span>
                        <motion.button
                          type="button"
                          onClick={() => removeSubtask(subtask.id)}
                          className="p-1 hover:bg-white/20 rounded transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 className="w-4 h-4 text-white/60" />
                        </motion.button>
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
                    placeholder="Add a subtask, or Generate with AI below..."
                    className="flex-1 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-general-sans"
                  />
                  <motion.button
                    type="button"
                    onClick={addManualSubtask}
                    disabled={!newManualSubtaskText.trim()}
                    className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-supreme"
                    whileHover={newManualSubtaskText.trim() ? { scale: 1.02 } : {}}
                    whileTap={newManualSubtaskText.trim() ? { scale: 0.98 } : {}}
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* AI Generation Button - Moved to bottom */}
              <div className="space-y-3">
                <motion.button
                  type="button"
                  onClick={handleGenerateAISubtasks}
                  disabled={isGeneratingAI || !formData.title.trim()}
                  className={`w-full py-4 rounded-xl text-white font-semibold flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-lg font-supreme transition-all ${
                    !user 
                      ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 border border-gray-500/30'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                  whileHover={!isGeneratingAI && formData.title.trim() ? { scale: 1.02 } : {}}
                  whileTap={!isGeneratingAI && formData.title.trim() ? { scale: 0.98 } : {}}
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating with AI...</span>
                    </>
                  ) : !user ? (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Generate with AI</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      <span>Generate with AI</span>
                    </>
                  )}
                </motion.button>
                
                <p className="text-white/60 text-xs text-center font-general-sans">
                  {!user ? 'Login required for AI features' : 'AI will generate subtasks and motivation!'}
                </p>
              </div>

              {/* AI Context Generation Status */}
              {contextStatus.type && (
                <motion.div
                  className={`p-3 border rounded-xl text-sm font-general-sans ${getStatusColor()}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center space-x-2">
                    {getStatusIcon()}
                    <span>{contextStatus.message}</span>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={!formData.title.trim()}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold flex items-center justify-center space-x-2 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-lg font-supreme disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={formData.title.trim() ? { scale: 1.02 } : {}}
                whileTap={formData.title.trim() ? { scale: 0.98 } : {}}
              >
                <Plus className="w-5 h-5" />
                <span>Create Task</span>
              </motion.button>
            </form>
          </div>
        </motion.div>
      </motion.div>

      {/* Authentication Prompt Modal */}
      <AnimatePresence>
        {showAuthPrompt && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAuthPrompt(false)}
          >
            <motion.div
              className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-md rounded-2xl p-6 w-full max-w-sm border border-white/20 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 font-task-title">
                  Login Required
                </h3>
                
                <p className="text-white/80 text-sm mb-6 font-general-sans leading-relaxed">
                  You need to be logged in to use this feature. Create an account to unlock AI-powered task generation and save your progress.
                </p>
                
                <div className="flex space-x-3">
                  <motion.button
                    className="flex-1 px-4 py-3 bg-white/10 rounded-xl text-white/80 hover:text-white hover:bg-white/20 border border-white/20 font-supreme"
                    onClick={() => setShowAuthPrompt(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  
                  <motion.button
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:from-purple-600 hover:to-pink-600 flex items-center justify-center space-x-2 font-supreme"
                    onClick={() => {
                      setShowAuthPrompt(false);
                      onClose();
                      // The parent component will handle showing the auth form
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <User className="w-4 h-4" />
                    <span>Login</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}