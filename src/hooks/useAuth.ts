import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session with error handling for invalid refresh tokens
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // If there's an invalid refresh token error, clear the session
          if (error.message.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            console.error('Auth initialization error:', error);
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error: any) {
        // Handle any other errors during session initialization
        if (error.message && error.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        } else {
          console.error('Unexpected auth error:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}