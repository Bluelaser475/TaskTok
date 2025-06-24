import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AuthFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export function AuthForm({ onSuccess, onClose }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signUp, signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setSuccess('Account created successfully! Please check your email to verify your account.');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        className="bg-white/10 backdrop-blur-md rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl relative"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {/* Close Button */}
        {onClose && (
          <motion.button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 font-logo">TaskTok</h1>
          <p className="text-white/70 font-general-sans">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="auth-email" className="block text-white/90 text-sm font-medium mb-2 font-general-sans">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type="email"
                id="auth-email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-general-sans"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="auth-password" className="block text-white/90 text-sm font-medium mb-2 font-general-sans">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="auth-password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-general-sans"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/80"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Sign Up only) */}
          {isSignUp && (
            <div>
              <label htmlFor="auth-confirm-password" className="block text-white/90 text-sm font-medium mb-2 font-general-sans">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="auth-confirm-password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-general-sans"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm font-general-sans"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          {/* Success Message */}
          {success && (
            <motion.div
              className="p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm font-general-sans"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {success}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold flex items-center justify-center space-x-2 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed font-supreme"
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            )}
          </motion.button>

          {/* Toggle Form */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-white/70 hover:text-white text-sm font-general-sans"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}