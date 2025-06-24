export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          priority: 'high' | 'medium' | 'low';
          category: string;
          due_date: string | null;
          estimated_time: number;
          completed: boolean;
          likes: number;
          image_url: string | null;
          motivational_quote: string | null;
          is_recurring: boolean;
          recurring_interval: string | null;
          no_due_date: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          priority: 'high' | 'medium' | 'low';
          category: string;
          due_date?: string | null;
          estimated_time?: number;
          completed?: boolean;
          likes?: number;
          image_url?: string | null;
          motivational_quote?: string | null;
          is_recurring?: boolean;
          recurring_interval?: string | null;
          no_due_date?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          priority?: 'high' | 'medium' | 'low';
          category?: string;
          due_date?: string | null;
          estimated_time?: number;
          completed?: boolean;
          likes?: number;
          image_url?: string | null;
          motivational_quote?: string | null;
          is_recurring?: boolean;
          recurring_interval?: string | null;
          no_due_date?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string;
          text: string;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          text: string;
          completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          text?: string;
          completed?: boolean;
          created_at?: string;
        };
      };
      user_stats: {
        Row: {
          id: string;
          user_id: string;
          total_tasks: number;
          completed_tasks: number;
          current_streak: number;
          longest_streak: number;
          total_xp: number;
          level: number;
          achievements: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_tasks?: number;
          completed_tasks?: number;
          current_streak?: number;
          longest_streak?: number;
          total_xp?: number;
          level?: number;
          achievements?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_tasks?: number;
          completed_tasks?: number;
          current_streak?: number;
          longest_streak?: number;
          total_xp?: number;
          level?: number;
          achievements?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}