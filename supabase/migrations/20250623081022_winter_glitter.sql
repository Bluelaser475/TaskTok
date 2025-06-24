/*
  # TaskTok Database Schema

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `description` (text)
      - `priority` (text, check constraint)
      - `category` (text)
      - `due_date` (date, nullable)
      - `estimated_time` (integer)
      - `completed` (boolean, default false)
      - `likes` (integer, default 0)
      - `ai_suggestion` (text)
      - `is_recurring` (boolean, default false)
      - `recurring_interval` (text, nullable)
      - `no_due_date` (boolean, default false)
      - `completed_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

    - `subtasks`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references tasks)
      - `text` (text)
      - `completed` (boolean, default false)
      - `created_at` (timestamptz, default now())

    - `user_stats`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `total_tasks` (integer, default 0)
      - `completed_tasks` (integer, default 0)
      - `current_streak` (integer, default 0)
      - `longest_streak` (integer, default 0)
      - `total_xp` (integer, default 0)
      - `level` (integer, default 1)
      - `achievements` (text[], default '{}')
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  category text NOT NULL DEFAULT 'Work',
  due_date date,
  estimated_time integer NOT NULL DEFAULT 25,
  completed boolean DEFAULT false,
  likes integer DEFAULT 0,
  ai_suggestion text NOT NULL,
  is_recurring boolean DEFAULT false,
  recurring_interval text,
  no_due_date boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_tasks integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  total_xp integer DEFAULT 0,
  level integer DEFAULT 1,
  achievements text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks
CREATE POLICY "Users can read own tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for subtasks
CREATE POLICY "Users can read own subtasks"
  ON subtasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = subtasks.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own subtasks"
  ON subtasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = subtasks.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own subtasks"
  ON subtasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = subtasks.task_id 
      AND tasks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = subtasks.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own subtasks"
  ON subtasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = subtasks.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

-- Create policies for user_stats
CREATE POLICY "Users can read own stats"
  ON user_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create user stats on signup
CREATE OR REPLACE FUNCTION create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user stats
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_stats();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);