export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
  dueDate: string;
  estimatedTime: number;
  completed: boolean;
  likes: number;
  subtasks: Subtask[];
  imageUrl?: string;
  motivationalQuote?: string;
  createdAt: string;
  completedAt?: string;
  isRecurring?: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'custom' | string;
  noDueDate?: boolean;
}

export interface UserStats {
  totalTasks: number;
  completedTasks: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  level: number;
  achievements: string[];
}