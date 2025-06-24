/*
  # Add task context fields

  1. New Columns
    - Add `image_url` column to tasks table for AI-generated images
    - Add `motivational_quote` column to tasks table for AI-generated quotes
    - Remove `ai_suggestion` column as it's being replaced by `motivational_quote`

  2. Data Migration
    - Migrate existing `ai_suggestion` data to `motivational_quote` column
    - Set default values for new columns

  3. Indexes
    - Add indexes for better performance on new columns
*/

-- Add new columns to tasks table
DO $$
BEGIN
  -- Add image_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE tasks ADD COLUMN image_url text;
  END IF;

  -- Add motivational_quote column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'motivational_quote'
  ) THEN
    ALTER TABLE tasks ADD COLUMN motivational_quote text;
  END IF;
END $$;

-- Migrate existing ai_suggestion data to motivational_quote
UPDATE tasks 
SET motivational_quote = ai_suggestion 
WHERE motivational_quote IS NULL AND ai_suggestion IS NOT NULL;

-- Set default values for existing tasks that don't have these fields
UPDATE tasks 
SET image_url = 'https://picsum.photos/512/512?random=' || extract(epoch from created_at)::text
WHERE image_url IS NULL;

UPDATE tasks 
SET motivational_quote = 'Every step forward is progress.'
WHERE motivational_quote IS NULL;

-- Drop the old ai_suggestion column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'ai_suggestion'
  ) THEN
    ALTER TABLE tasks DROP COLUMN ai_suggestion;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_image_url ON tasks(image_url);
CREATE INDEX IF NOT EXISTS idx_tasks_motivational_quote ON tasks(motivational_quote);