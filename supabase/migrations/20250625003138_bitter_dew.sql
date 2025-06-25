/*
  # Add scroll state tracking to user profiles

  1. Changes
    - Add `last_scroll_state` column to user_profiles table to store scroll position
    - The column stores JSON data with taskId, offsetPercent, and timestamp

  2. Security
    - Existing RLS policies will handle access control
*/

-- Add last_scroll_state column to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_scroll_state'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_scroll_state jsonb;
  END IF;
END $$;

-- Add index for better performance on scroll state queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_scroll_state ON user_profiles(last_scroll_state);