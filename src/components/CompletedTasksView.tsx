import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Trophy, Zap, Target, Filter, SortAsc, SortDesc, Award, Star } from 'lucide-react';
import { Task, UserStats } from '../types/task';
import { formatDistanceToNow, differenceInDays, differenceInHours, format } from 'date-fns';

interface CompletedTasksViewProps {
  completedTasks: Task[];
  stats: UserStats;
  onClose: () => void;
}

type SortOption = 'completion_date' | 'creation_date' | 'duration' | 'xp_earned';
type SortDirection = 'asc' | 'desc';

interface TaskMetrics {
  task: Task;
  creationDate: Date;
  completionDate: Date;
  durationDays: number;
  durationHours: number;
  baseXP: number;
  bonusXP: number;
  totalXP: number;
  wasEarly: boolean;
  daysEarly: number;
}

const priorityColors = {
  high: 'border-red-500/50 bg-red-500/10 text-red-300',
  medium: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300',
  low: 'border-green-500/50 bg-green-500/10 text-green-300'
};

const priorityIcons = {
  high: <Zap className="w-4 h-4" />,
  medium: <Target className="w-4 h-4" />,
  low: <Clock className="w-4 h-4" />
};

function calculateTaskMetrics(task: Task): TaskMetrics {
  const creationDate = new Date(task.createdAt);
  const completionDate = new Date(task.completedAt!);
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  
  const durationDays = differenceInDays(completionDate, creationDate);
  const durationHours = differenceInHours(completionDate, creationDate);
  
  // Calculate base XP
  const baseXPValues = { high: 50, medium: 30, low: 15 };
  const subtaskBonus = task.subtasks.filter(st => st.completed).length * 5;
  const baseXP = baseXPValues[task.priority] + subtaskBonus;
  
  // Calculate early completion bonus
  let bonusXP = 0;
  let wasEarly = false;
  let daysEarly = 0;
  
  if (dueDate && !task.noDueDate) {
    daysEarly = differenceInDays(dueDate, completionDate);
    if (daysEarly > 0) {
      wasEarly = true;
      // 10% bonus per day early, capped at 50%
      const bonusPercentage = Math.min(daysEarly * 0.1, 0.5);
      bonusXP = Math.floor(baseXP * bonusPercentage);
    }
  }
  
  const totalXP = baseXP + bonusXP;
  
  return {
    task,
    creationDate,
    completionDate,
    durationDays,
    durationHours,
    baseXP,
    bonusXP,
    totalXP,
    wasEarly,
    daysEarly
  };
}

export function CompletedTasksView({ completedTasks, stats, onClose }: CompletedTasksViewProps) {
  const [sortBy, setSortBy] = useState<SortOption>('completion_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Calculate metrics for all completed tasks
  const taskMetrics = useMemo(() => {
    return completedTasks.map(calculateTaskMetrics);
  }, [completedTasks]);

  // Filter and sort tasks
  const filteredAndSortedMetrics = useMemo(() => {
    let filtered = taskMetrics;
    
    // Apply priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(metric => metric.task.priority === filterPriority);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'completion_date':
          comparison = a.completionDate.getTime() - b.completionDate.getTime();
          break;
        case 'creation_date':
          comparison = a.creationDate.getTime() - b.creationDate.getTime();
          break;
        case 'duration':
          comparison = a.durationDays - b.durationDays;
          break;
        case 'xp_earned':
          comparison = a.totalXP - b.totalXP;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [taskMetrics, sortBy, sortDirection, filterPriority]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalXP = taskMetrics.reduce((sum, metric) => sum + metric.totalXP, 0);
    const totalBonusXP = taskMetrics.reduce((sum, metric) => sum + metric.bonusXP, 0);
    const earlyCompletions = taskMetrics.filter(metric => metric.wasEarly).length;
    const averageDuration = taskMetrics.length > 0 
      ? taskMetrics.reduce((sum, metric) => sum + metric.durationDays, 0) / taskMetrics.length 
      : 0;
    
    return {
      totalTasks: taskMetrics.length,
      totalXP,
      totalBonusXP,
      earlyCompletions,
      averageDuration: Math.round(averageDuration * 10) / 10
    };
  }, [taskMetrics]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('desc');
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-gradient-to-br from-purple-900 to-pink-900 z-50 overflow-hidden"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10 px-4 py-3 sm:px-6 sm:py-5 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <motion.button
            className="w-9 h-9 sm:w-11 sm:h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 border border-white/20"
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.button>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-white font-task-title">
            Completed Tasks
          </h1>

          {/* Summary Stats */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-right">
              <div className="text-white text-xs sm:text-sm font-semibold leading-none font-general-sans">
                {summaryStats.totalTasks} Tasks
              </div>
              <div className="text-white/60 text-xs leading-none mt-0.5 font-general-sans">
                {summaryStats.totalXP} XP
              </div>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="h-full overflow-y-auto pb-20">
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-white/80 text-sm font-medium font-general-sans">Total XP</span>
              </div>
              <div className="text-2xl font-bold text-white font-task-title">
                {summaryStats.totalXP.toLocaleString()}
              </div>
              {summaryStats.totalBonusXP > 0 && (
                <div className="text-xs text-green-400 font-general-sans">
                  +{summaryStats.totalBonusXP} bonus
                </div>
              )}
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-purple-400" />
                <span className="text-white/80 text-sm font-medium font-general-sans">Early</span>
              </div>
              <div className="text-2xl font-bold text-white font-task-title">
                {summaryStats.earlyCompletions}
              </div>
              <div className="text-xs text-white/60 font-general-sans">
                {summaryStats.totalTasks > 0 
                  ? Math.round((summaryStats.earlyCompletions / summaryStats.totalTasks) * 100)
                  : 0}% early
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-white/80 text-sm font-medium font-general-sans">Avg Time</span>
              </div>
              <div className="text-2xl font-bold text-white font-task-title">
                {summaryStats.averageDuration}
              </div>
              <div className="text-xs text-white/60 font-general-sans">days</div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-green-400" />
                <span className="text-white/80 text-sm font-medium font-general-sans">Tasks</span>
              </div>
              <div className="text-2xl font-bold text-white font-task-title">
                {summaryStats.totalTasks}
              </div>
              <div className="text-xs text-white/60 font-general-sans">completed</div>
            </motion.div>
          </div>

          {/* Filters and Sorting */}
          <motion.div
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex flex-wrap items-center gap-4">
              {/* Priority Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-white/60" />
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm font-general-sans"
                >
                  <option value="all" className="bg-gray-800">All Priorities</option>
                  <option value="high" className="bg-gray-800">High Priority</option>
                  <option value="medium" className="bg-gray-800">Medium Priority</option>
                  <option value="low" className="bg-gray-800">Low Priority</option>
                </select>
              </div>

              {/* Sort Options */}
              <div className="flex items-center space-x-2">
                {sortDirection === 'asc' ? (
                  <SortAsc className="w-4 h-4 text-white/60" />
                ) : (
                  <SortDesc className="w-4 h-4 text-white/60" />
                )}
                <div className="flex space-x-1">
                  {[
                    { key: 'completion_date', label: 'Completed' },
                    { key: 'creation_date', label: 'Created' },
                    { key: 'duration', label: 'Duration' },
                    { key: 'xp_earned', label: 'XP' }
                  ].map((option) => (
                    <button
                      key={option.key}
                      onClick={() => handleSort(option.key as SortOption)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all font-supreme ${
                        sortBy === option.key
                          ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                          : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Completed Tasks List */}
          {filteredAndSortedMetrics.length > 0 ? (
            <div className="space-y-4">
              {filteredAndSortedMetrics.map((metric, index) => (
                <CompletedTaskCard
                  key={metric.task.id}
                  metric={metric}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Trophy className="w-10 h-10 text-white/60" />
              </div>
              <h3 className="text-xl font-semibold text-white/80 mb-2 font-task-title">
                {filterPriority === 'all' ? 'No completed tasks yet' : `No ${filterPriority} priority tasks completed`}
              </h3>
              <p className="text-white/50 text-sm font-general-sans">
                {filterPriority === 'all' 
                  ? 'Complete some tasks to see your achievements here!'
                  : 'Try changing the filter to see other completed tasks.'
                }
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface CompletedTaskCardProps {
  metric: TaskMetrics;
  index: number;
}

function CompletedTaskCard({ metric, index }: CompletedTaskCardProps) {
  const { task, creationDate, completionDate, durationDays, durationHours, baseXP, bonusXP, totalXP, wasEarly, daysEarly } = metric;

  return (
    <motion.div
      className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 + index * 0.1 }}
      whileHover={{ scale: 1.01 }}
    >
      {/* Task Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2 font-task-title">
            {task.title}
          </h3>
          <p className="text-sm text-white/70 font-general-sans">
            {task.description}
          </p>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <span className={`px-3 py-1 rounded-xl text-xs font-medium border font-general-sans ${priorityColors[task.priority]}`}>
            {priorityIcons[task.priority]}
            <span className="ml-1 capitalize">{task.priority}</span>
          </span>
          {wasEarly && (
            <div className="px-2 py-1 bg-green-500/20 text-green-300 rounded-lg text-xs border border-green-500/30 flex items-center space-x-1 font-general-sans">
              <Award className="w-3 h-3" />
              <span>Early</span>
            </div>
          )}
        </div>
      </div>

      {/* Task Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {/* Creation Date */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-white/60 text-xs mb-1 font-general-sans">
            <Calendar className="w-3 h-3" />
            <span>Created</span>
          </div>
          <div className="text-white text-sm font-medium font-general-sans">
            {format(creationDate, 'MM/dd/yyyy')}
          </div>
        </div>

        {/* Completion Date */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-white/60 text-xs mb-1 font-general-sans">
            <Trophy className="w-3 h-3" />
            <span>Completed</span>
          </div>
          <div className="text-white text-sm font-medium font-general-sans">
            {format(completionDate, 'MM/dd/yyyy')}
          </div>
        </div>

        {/* Duration */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-white/60 text-xs mb-1 font-general-sans">
            <Clock className="w-3 h-3" />
            <span>Duration</span>
          </div>
          <div className="text-white text-sm font-medium font-general-sans">
            {durationDays === 0 
              ? `${durationHours}h`
              : durationDays === 1 
                ? '1 day'
                : `${durationDays} days`
            }
          </div>
        </div>

        {/* XP Earned */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-white/60 text-xs mb-1 font-general-sans">
            <Zap className="w-3 h-3" />
            <span>XP Earned</span>
          </div>
          <div className="text-white text-sm font-medium font-general-sans">
            {totalXP}
            {bonusXP > 0 && (
              <span className="text-green-400 text-xs ml-1">
                (+{bonusXP})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Due Date and Early Completion Info */}
      {(task.dueDate && !task.noDueDate) && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-white/60 font-general-sans">
            <Calendar className="w-4 h-4" />
            <span>Due: {format(new Date(task.dueDate), 'MM/dd/yyyy')}</span>
          </div>
          {wasEarly && (
            <div className="flex items-center space-x-2 text-green-400 font-general-sans">
              <Award className="w-4 h-4" />
              <span>
                {daysEarly} day{daysEarly !== 1 ? 's' : ''} early (+{Math.round((bonusXP / baseXP) * 100)}% bonus)
              </span>
            </div>
          )}
        </div>
      )}

      {/* XP Breakdown */}
      {bonusXP > 0 && (
        <div className="mt-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
          <div className="text-xs text-green-300 font-general-sans">
            <div className="flex justify-between">
              <span>Base XP:</span>
              <span>{baseXP}</span>
            </div>
            <div className="flex justify-between">
              <span>Early Bonus:</span>
              <span>+{bonusXP}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-green-500/20 pt-1 mt-1">
              <span>Total XP:</span>
              <span>{totalXP}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}