import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import Lenis from '@studio-freight/lenis';
import { Task } from '../types/task';
import { TaskCard } from './TaskCard';

interface ScrollState {
  taskId: string;
  offsetPercent: number; // Relative position within task (0-100)
  timestamp: number;
}

interface Props {
  tasks: Task[];
  userId?: string;
  onScrollStateChange: (state: ScrollState) => void;
  initialScrollState?: ScrollState;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onAddSubtask: (taskId: string, subtaskText: string) => void;
}

export const TaskFeedScroller: React.FC<Props> = ({
  tasks,
  userId,
  onScrollStateChange,
  initialScrollState,
  onToggleSubtask,
  onCompleteTask,
  onAddSubtask
}) => {
  // Configuration
  const BUFFER_SIZE = 3; // Number of list copies for smooth looping
  const SCROLL_DEBOUNCE_MS = 100;
  const RESTORE_THRESHOLD_PX = 50; // Max jump distance for smooth restoration

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // State
  const [visibleTasks, setVisibleTasks] = useState<Task[]>([]);
  const [currentScrollState, setCurrentScrollState] = useState<ScrollState>();
  const [isInitialized, setIsInitialized] = useState(false);

  // Create virtual list with buffer copies for infinite scrolling
  useEffect(() => {
    if (tasks.length === 0) {
      setVisibleTasks([]);
      return;
    }

    // Create buffered list for infinite scrolling
    const bufferedList = Array(BUFFER_SIZE).fill(tasks).flat();
    setVisibleTasks(bufferedList);
  }, [tasks]);

  // Initialize Lenis smooth scrolling
  useEffect(() => {
    if (!scrollContainerRef.current || tasks.length === 0) return;

    const lenis = new Lenis({
      wrapper: scrollContainerRef.current,
      content: scrollContainerRef.current.firstElementChild as HTMLElement,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      smoothTouch: true,
      touchMultiplier: 1.5,
      wheelMultiplier: 0.8,
      infinite: false // We'll handle infinite scrolling manually
    });

    lenisRef.current = lenis;

    // Animation frame loop
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Handle scroll events
    lenis.on('scroll', handleScroll);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [visibleTasks]);

  // Debounced scroll handler
  const handleScroll = useCallback((e: any) => {
    if (!scrollContainerRef.current || tasks.length === 0) return;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the scroll state update
    debounceTimeoutRef.current = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollTop = e.scroll;
      const containerHeight = container.clientHeight;
      
      // Find the currently visible task
      const taskElements = container.querySelectorAll('[data-task-id]');
      let currentTaskElement: Element | null = null;
      let currentTaskId = '';
      let offsetPercent = 0;

      // Find the task that's most visible in the viewport
      for (const element of taskElements) {
        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Check if this task is in the viewport
        if (rect.top <= containerRect.top + containerHeight / 2 && 
            rect.bottom >= containerRect.top + containerHeight / 2) {
          currentTaskElement = element;
          currentTaskId = element.getAttribute('data-task-id') || '';
          
          // Calculate offset percentage within the task
          const taskTop = rect.top - containerRect.top;
          const taskHeight = rect.height;
          offsetPercent = Math.max(0, Math.min(100, ((containerHeight / 2 - taskTop) / taskHeight) * 100));
          break;
        }
      }

      if (currentTaskId && currentTaskId !== currentScrollState?.taskId) {
        const newState: ScrollState = {
          taskId: currentTaskId,
          offsetPercent,
          timestamp: Date.now()
        };

        setCurrentScrollState(newState);
        onScrollStateChange(newState);
      }

      // Handle infinite scrolling
      handleInfiniteScroll(scrollTop, container.scrollHeight, containerHeight);
    }, SCROLL_DEBOUNCE_MS);
  }, [tasks.length, currentScrollState, onScrollStateChange]);

  // Handle infinite scrolling logic
  const handleInfiniteScroll = useCallback((scrollTop: number, scrollHeight: number, containerHeight: number) => {
    if (!lenisRef.current || tasks.length <= 1) return;

    const taskHeight = containerHeight; // Assuming each task takes full viewport height
    const totalTaskHeight = tasks.length * taskHeight;
    
    // Check if we're near the top (first buffer zone)
    if (scrollTop < taskHeight) {
      // Jump to the equivalent position in the last real section
      const newScrollTop = scrollTop + totalTaskHeight;
      lenisRef.current.scrollTo(newScrollTop, { immediate: true });
    }
    // Check if we're near the bottom (last buffer zone)
    else if (scrollTop > scrollHeight - containerHeight - taskHeight) {
      // Jump to the equivalent position in the first real section
      const newScrollTop = scrollTop - totalTaskHeight;
      lenisRef.current.scrollTo(newScrollTop, { immediate: true });
    }
  }, [tasks.length]);

  // Restore scroll position on mount/login
  useEffect(() => {
    if (!initialScrollState || !userId || !lenisRef.current || isInitialized) return;

    const targetTaskId = initialScrollState.taskId;
    const targetTask = tasks.find(t => t.id === targetTaskId);
    
    if (!targetTask) {
      // Fallback: scroll to top
      lenisRef.current.scrollTo(0, { immediate: true });
      setIsInitialized(true);
      return;
    }

    // Find the target task element in the middle section (real tasks)
    const targetElement = scrollContainerRef.current?.querySelector(
      `[data-task-id="${targetTaskId}"][data-section="real"]`
    );
    
    if (!targetElement) {
      setIsInitialized(true);
      return;
    }

    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = scrollContainerRef.current?.getBoundingClientRect();
    
    if (containerRect) {
      const targetOffset = (targetRect.height * initialScrollState.offsetPercent) / 100;
      const scrollPosition = targetElement.offsetTop + targetOffset - containerRect.height / 2;
      
      // Smooth scroll to the restored position
      lenisRef.current.scrollTo(scrollPosition, {
        duration: 0.8,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      });
    }

    setIsInitialized(true);
  }, [initialScrollState, userId, tasks, isInitialized]);

  // Auto-initialize if no initial scroll state
  useEffect(() => {
    if (!initialScrollState && !isInitialized && visibleTasks.length > 0) {
      setIsInitialized(true);
    }
  }, [initialScrollState, isInitialized, visibleTasks.length]);

  if (tasks.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4 font-task-title">No Tasks Yet</h2>
          <p className="text-white/70 font-general-sans">Create your first task to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="task-feed-scroller h-screen overflow-hidden"
      style={{ height: '100vh' }}
    >
      <div className="task-feed-content">
        {/* First buffer section (copy of last tasks) */}
        {tasks.map((task, index) => (
          <motion.div
            key={`buffer-start-${task.id}-${index}`}
            data-task-id={task.id}
            data-section="buffer-start"
            className="task-item h-screen snap-start"
            style={{ height: '100vh' }}
          >
            <TaskCard
              task={task}
              onToggleSubtask={onToggleSubtask}
              onCompleteTask={onCompleteTask}
              onAddSubtask={onAddSubtask}
            />
          </motion.div>
        ))}

        {/* Real tasks section */}
        {tasks.map((task, index) => (
          <motion.div
            key={`real-${task.id}-${index}`}
            data-task-id={task.id}
            data-section="real"
            className="task-item h-screen snap-start"
            style={{ height: '100vh' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <TaskCard
              task={task}
              onToggleSubtask={onToggleSubtask}
              onCompleteTask={onCompleteTask}
              onAddSubtask={onAddSubtask}
            />
          </motion.div>
        ))}

        {/* Last buffer section (copy of first tasks) */}
        {tasks.map((task, index) => (
          <motion.div
            key={`buffer-end-${task.id}-${index}`}
            data-task-id={task.id}
            data-section="buffer-end"
            className="task-item h-screen snap-start"
            style={{ height: '100vh' }}
          >
            <TaskCard
              task={task}
              onToggleSubtask={onToggleSubtask}
              onCompleteTask={onCompleteTask}
              onAddSubtask={onAddSubtask}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};