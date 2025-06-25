import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ScrollState {
  taskId: string;
  offsetPercent: number;
  timestamp: number;
}

export function useScrollState(userId?: string) {
  const [scrollState, setScrollState] = useState<ScrollState | null>(null);
  const [loading, setLoading] = useState(true);

  // Load initial scroll state
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadScrollState = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('last_scroll_state')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading scroll state:', error);
        } else if (data?.last_scroll_state) {
          setScrollState(data.last_scroll_state);
        }
      } catch (err) {
        console.error('Error loading scroll state:', err);
      } finally {
        setLoading(false);
      }
    };

    loadScrollState();
  }, [userId]);

  // Save scroll state
  const updateScrollState = async (state: ScrollState) => {
    if (!userId) return;

    setScrollState(state);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          last_scroll_state: state,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving scroll state:', error);
      }
    } catch (err) {
      console.error('Error saving scroll state:', err);
    }
  };

  return {
    scrollState,
    updateScrollState,
    loading
  };
}