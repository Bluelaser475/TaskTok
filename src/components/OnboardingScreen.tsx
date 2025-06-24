import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowUp, ArrowDown, Brain, User, X, Sparkles, Pipette as Swipe, Target, Trophy } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { Task } from '../types/task';
import { useSwipe } from '../hooks/useSwipe';

interface OnboardingScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

const sampleTask: Task = {
  id: 'sample-task',
  title: 'Complete Your First Task',
  description: 'This is a sample task to show you how TaskTok works. You can swipe up and down to navigate between tasks, complete subtasks, and earn XP!',
  priority: 'medium',
  category: 'Personal',
  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  estimatedTime: 15,
  completed: false,
  likes: 0,
  subtasks: [
    { id: 'sub1', text: 'Learn how to navigate tasks', completed: false },
    { id: 'sub2', text: 'Understand AI suggestions', completed: false },
    { id: 'sub3', text: 'See the benefits of logging in', completed: false }
  ],
  aiSuggestion: '💡 Welcome to TaskTok! This AI suggestion helps you stay motivated and provides helpful tips for completing your tasks efficiently.',
  createdAt: new Date().toISOString(),
  isRecurring: false,
  noDueDate: false
};

const onboardingSteps = [
  {
    id: 1,
    title: 'Add Your First Task',
    description: 'Tap the + button to create new tasks and organize your productivity journey.',
    tooltipPosition: { bottom: 140, right: 80 },
    highlightElement: 'add-button'
  },
  {
    id: 2,
    title: 'Navigate Between Tasks',
    description: 'Swipe up and down to browse through your tasks like TikTok videos.',
    tooltipPosition: { left: 24, top: '50%' },
    highlightElement: 'navigation'
  },
  {
    id: 3,
    title: 'AI-Powered Assistance',
    description: 'Get smart suggestions and auto-generated subtasks to help you stay on track.',
    tooltipPosition: { top: 280, left: '50%' },
    highlightElement: 'ai-features'
  },
  {
    id: 4,
    title: 'Save Your Progress',
    description: 'Sign up to save your tasks, track streaks, and access your data across all devices.',
    tooltipPosition: { top: '50%', left: '50%' },
    highlightElement: 'login-benefits'
  }
];

export function OnboardingScreen({ onComplete, onSkip }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSampleTask, setShowSampleTask] = useState(true);

  const currentStepData = onboardingSteps.find(step => step.id === currentStep);

  const nextStep = useCallback(() => {
    if (currentStep < onboardingSteps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Desktop wheel event handler
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    // Debounce wheel events
    const now = Date.now();
    if (window.lastWheelTime && now - window.lastWheelTime < 300) return;
    window.lastWheelTime = now;

    if (e.deltaY > 0) {
      // Scrolling down - next step
      nextStep();
    } else if (e.deltaY < 0) {
      // Scrolling up - previous step
      prevStep();
    }
  }, [nextStep, prevStep]);

  // Add wheel event listener for desktop
  useEffect(() => {
    const container = document.getElementById('onboarding-container');
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel]);

  // Swipe handlers for onboarding navigation
  const swipeHandlers = useSwipe({
    onSwipeUp: nextStep,
    onSwipeDown: prevStep
  });

  const handleSkip = () => {
    onSkip();
  };

  // Dummy handlers for the sample task
  const dummyHandlers = {
    onToggleSubtask: () => {},
    onCompleteTask: () => {},
    onAddSubtask: () => {}
  };

  return (
    <div 
      id="onboarding-container"
      className="fixed inset-0 bg-gradient-to-br from-purple-900 to-pink-900 z-50 overflow-hidden" 
      {...swipeHandlers}
    >
      {/* Skip Button */}
      <motion.button
        className="absolute top-6 right-6 z-50 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/80 hover:text-white hover:bg-white/20 border border-white/20 flex items-center space-x-2 font-supreme"
        onClick={handleSkip}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <X className="w-4 h-4" />
        <span className="text-sm font-medium">Skip</span>
      </motion.button>

      {/* Progress Indicator */}
      <div className="absolute top-6 left-6 z-50">
        <div className="flex space-x-2">
          {onboardingSteps.map((step) => (
            <motion.div
              key={step.id}
              className={`w-3 h-3 rounded-full ${
                step.id <= currentStep 
                  ? 'bg-white' 
                  : 'bg-white/30'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: step.id * 0.1 }}
            />
          ))}
        </div>
      </div>

      {/* Sample Task Display */}
      <AnimatePresence>
        {showSampleTask && currentStep <= 3 && (
          <motion.div
            className="relative h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <TaskCard
              task={sampleTask}
              {...dummyHandlers}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 4: Login Benefits Screen */}
      <AnimatePresence>
        {currentStep === 4 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center p-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-md w-full border border-white/20 text-center">
              <motion.div
                className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <User className="w-10 h-10 text-white" />
              </motion.div>
              
              <h2 className="text-2xl font-bold text-white mb-4 font-task-title">Save Your Progress</h2>
              <p className="text-white/80 mb-8 leading-relaxed font-general-sans">
                Create an account to save your tasks, track your streaks, earn XP, and access your productivity data across all your devices.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3 text-white/90">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm font-general-sans">Track XP and level progression</span>
                </div>
                <div className="flex items-center space-x-3 text-white/90">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-general-sans">Maintain productivity streaks</span>
                </div>
                <div className="flex items-center space-x-3 text-white/90">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-general-sans">Sync across all devices</span>
                </div>
              </div>

              <motion.button
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold font-supreme"
                onClick={onComplete}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Tooltips */}
      <AnimatePresence>
        {currentStepData && currentStep <= 3 && (
          <>
            {/* Step 1: Add Task Tooltip */}
            {currentStep === 1 && (
              <motion.div
                className="absolute z-40"
                style={{ 
                  bottom: currentStepData.tooltipPosition.bottom,
                  right: currentStepData.tooltipPosition.right 
                }}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ delay: 0.8 }}
              >
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border border-white/20 max-w-xs">
                  <h3 className="font-bold text-gray-800 mb-2 font-task-title">{currentStepData.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 font-general-sans">{currentStepData.description}</p>
                  
                  {/* Animated Arrow pointing to Add Button */}
                  <motion.div
                    className="absolute -bottom-3 right-6 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent border-t-white/90"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>

                {/* Simulated Add Button with Glow */}
                <motion.div
                  className="absolute -bottom-20 right-0 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    boxShadow: [
                      '0 0 0 0 rgba(168, 85, 247, 0.4)',
                      '0 0 0 20px rgba(168, 85, 247, 0)',
                      '0 0 0 0 rgba(168, 85, 247, 0)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Plus className="w-6 h-6 text-white" />
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Navigation Tooltip */}
            {currentStep === 2 && (
              <motion.div
                className="absolute z-40"
                style={{ 
                  left: currentStepData.tooltipPosition.left,
                  top: currentStepData.tooltipPosition.top,
                  transform: 'translateY(-50%)'
                }}
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -20 }}
                transition={{ delay: 0.8 }}
              >
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border border-white/20 max-w-xs">
                  <h3 className="font-bold text-gray-800 mb-2 font-task-title">{currentStepData.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 font-general-sans">{currentStepData.description}</p>
                  
                  <div className="flex items-center justify-center space-x-4 mb-2">
                    <motion.div
                      animate={{ y: [-8, 8, -8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ArrowUp className="w-6 h-6 text-purple-500" />
                    </motion.div>
                    <Swipe className="w-6 h-6 text-gray-400" />
                    <motion.div
                      animate={{ y: [8, -8, 8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ArrowDown className="w-6 h-6 text-purple-500" />
                    </motion.div>
                  </div>
                  
                  {/* Arrow pointing right */}
                  <motion.div
                    className="absolute top-1/2 -right-3 w-0 h-0 border-l-[12px] border-t-[12px] border-b-[12px] border-l-white/90 border-t-transparent border-b-transparent -translate-y-1/2"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: AI Features Tooltip */}
            {currentStep === 3 && (
              <motion.div
                className="absolute z-40"
                style={{ 
                  top: currentStepData.tooltipPosition.top,
                  left: currentStepData.tooltipPosition.left,
                  transform: 'translateX(-50%)'
                }}
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ delay: 0.8 }}
              >
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border border-white/20 max-w-xs">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <h3 className="font-bold text-gray-800 font-task-title">{currentStepData.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 font-general-sans">{currentStepData.description}</p>
                  
                  <div className="flex items-center space-x-2 text-sm text-purple-600">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-general-sans">Smart & Personalized</span>
                  </div>
                  
                  {/* Arrow pointing down */}
                  <motion.div
                    className="absolute -bottom-3 left-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent border-t-white/90 -translate-x-1/2"
                    animate={{ y: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Step Indicator Text */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center z-40">
        <motion.p
          className="text-white/80 text-sm font-general-sans mb-2"
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          Step {currentStep} of {onboardingSteps.length}
        </motion.p>
        {currentStep < 4 && (
          <motion.p
            className="text-white/60 text-xs font-general-sans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Swipe up for next step
          </motion.p>
        )}
      </div>
    </div>
  );
}