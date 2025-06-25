import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import Lenis from '@studio-freight/lenis';
import { Task } from '../types/task';
import { TaskCard } from './TaskCard';

interface ScrollState {
  taskId: string;
  offsetPercent: number;
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

// Virtualization constants
const VIEWPORT_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 800;
const TASK_HEIGHT = VIEWPORT_HEIGHT;
const BUFFER_SIZE = 2; // Reduced from 3 for better performance
const VISIBLE_RANGE = 3; // Number of tasks to render around current position

export const TaskFeedScroller: React.FC<Props> = ({
  tasks,
  userId,
  onScrollStateChange,
  initialScrollState,
  onToggleSubtask,
  onCompleteTask,
  onAddSubtask
}) => {
  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const scrollStateRef = useRef<ScrollState>();
  const rafIdRef = useRef<number>();
  const lastScrollTimeRef = useRef<number>(0);

  // State
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Memoized calculations for performance
  const totalHeight = useMemo(() => tasks.length * TASK_HEIGHT, [tasks.length]);
  
  const visibleTaskIndices = useMemo(() => {
    if (tasks.length === 0) return [];
    
    const startIndex = Math.max(0, currentTaskIndex - VISIBLE_RANGE);
    const endIndex = Math.min(tasks.length - 1, currentTaskIndex + VISIBLE_RANGE);
    
    const indices = [];
    for (let i = startIndex; i <= endIndex; i++) {
      indices.push(i);
    }
    return indices;
  }, [currentTaskIndex, tasks.length]);

  // Optimized scroll handler using RAF
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || tasks.length === 0) return;

    const now = performance.now();
    if (now - lastScrollTimeRef.current < 16) return; // Throttle to ~60fps
    lastScrollTimeRef.current = now;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;

      const scrollTop = scrollContainerRef.current.scrollTop;
      setScrollY(scrollTop);

      // Calculate current task index
      const newTaskIndex = Math.floor(scrollTop / TASK_HEIGHT) % tasks.length;
      const normalizedIndex = newTaskIndex < 0 ? tasks.length + newTaskIndex : newTaskIndex;
      
      if (normalizedIndex !== currentTaskIndex) {
        setCurrentTaskIndex(normalizedIndex);
      }

      // Calculate offset percentage within current task
      const taskScrollOffset = scrollTop % TASK_HEIGHT;
      const offsetPercent = (taskScrollOffset / TASK_HEIGHT) * 100;

      // Update scroll state
      const currentTask = tasks[normalizedIndex];
      if (currentTask) {
        const newState: ScrollState = {
          taskId: currentTask.id,
          offsetPercent,
          timestamp: now
        };

        // Only update if significantly different
        if (!scrollStateRef.current || 
            scrollStateRef.current.taskId !== newState.taskId ||
            Math.abs(scrollStateRef.current.offsetPercent - newState.offsetPercent) > 5) {
          scrollStateRef.current = newState;
          onScrollStateChange(newState);
        }
      }

      // Handle infinite scrolling with improved logic
      handleInfiniteScrolling(scrollTop);
    });
  }, [tasks, currentTaskIndex, onScrollStateChange]);

  // Optimized infinite scrolling
  const handleInfiniteScrolling = useCallback((scrollTop: number) => {
    if (!lenisRef.current || tasks.length <= 1) return;

    const scrollHeight = scrollContainerRef.current?.scrollHeight || 0;
    const clientHeight = scrollContainerRef.current?.clientHeight || 0;

    // More efficient boundary detection
    if (scrollTop < TASK_HEIGHT) {
      // Near top, jump to bottom equivalent
      const jumpTo = scrollTop + (tasks.length * TASK_HEIGHT);
      lenisRef.current.scrollTo(jumpTo, { immediate: true });
    } else if (scrollTop > scrollHeight - clientHeight - TASK_HEIGHT) {
      // Near bottom, jump to top equivalent
      const jumpTo = scrollTop - (tasks.length * TASK_HEIGHT);
      lenisRef.current.scrollTo(jumpTo, { immediate: true });
    }
  }, [tasks.length]);

  // Initialize Lenis with optimized settings
  useEffect(() => {
    if (!scrollContainerRef.current || tasks.length === 0) return;

    // Clean up previous instance
    if (lenisRef.current) {
      lenisRef.current.destroy();
    }

    const lenis = new Lenis({
      wrapper: scrollContainerRef.current,
      content: scrollContainerRef.current.firstElementChild as HTMLElement,
      duration: 1.0, // Slightly faster for better responsiveness
      easing: (t) => 1 - Math.pow(1 - t, 3), // Cubic ease-out for smoother feel
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      smoothTouch: true,
      touchMultiplier: 2.0, // Increased for better mobile response
      wheelMultiplier: 1.0,
      infinite: false,
      autoResize: true
    });

    lenisRef.current = lenis;

    // Optimized RAF loop
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Add scroll listener
    lenis.on('scroll', handleScroll);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [tasks.length, handleScroll]);

  // Restore scroll position with improved logic
  useEffect(() => {
    if (!initialScrollState || !userId || !lenisRef.current || isInitialized || tasks.length === 0) return;

    const targetTask = tasks.find(t => t.id === initialScrollState.taskId);
    if (!targetTask) {
      setIsInitialized(true);
      return;
    }

    const targetIndex = tasks.findIndex(t => t.id === initialScrollState.taskId);
    if (targetIndex === -1) {
      setIsInitialized(true);
      return;
    }

    // Calculate scroll position
    const baseScrollTop = targetIndex * TASK_HEIGHT;
    const offsetWithinTask = (initialScrollState.offsetPercent / 100) * TASK_HEIGHT;
    const targetScrollTop = baseScrollTop + offsetWithinTask;

    // Smooth scroll to position
    setTimeout(() => {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(targetScrollTop, {
          duration: 0.6,
          easing: (t) => 1 - Math.pow(1 - t, 3)
        });
      }
      setIsInitialized(true);
    }, 100);
  }, [initialScrollState, userId, tasks, isInitialized]);

  // Auto-initialize
  useEffect(() => {
    if (!initialScrollState && !isInitialized && tasks.length > 0) {
      setIsInitialized(true);
    }
  }, [initialScrollState, isInitialized, tasks.length]);

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
      className="task-feed-scroller h-screen overflow-auto"
      style={{ 
        height: '100vh',
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch' // iOS momentum scrolling
      }}
    >
      <div 
        className="task-feed-content relative"
        style={{ height: totalHeight * BUFFER_SIZE }}
      >
        {/* Render only visible tasks for performance */}
        {visibleTaskIndices.map((taskIndex) => {
          const task = tasks[taskIndex];
          if (!task) return null;

          // Calculate positions for infinite scrolling
          const positions = [
            taskIndex * TASK_HEIGHT, // Original position
            (taskIndex + tasks.length) * TASK_HEIGHT, // First repeat
            (taskIndex + tasks.length * 2) * TASK_HEIGHT // Second repeat
          ];

          return positions.map((position, repeatIndex) => (
            <motion.div
              key={`${task.id}-${repeatIndex}-${taskIndex}`}
              data-task-id={task.id}
              className="task-item absolute w-full"
              style={{ 
                height: TASK_HEIGHT,
                top: position,
                scrollSnapAlign: 'start'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <TaskCard
                task={task}
                onToggleSubtask={onToggleSubtask}
                onCompleteTask={onCompleteTask}
                onAddSubtask={onAddSubtask}
              />
            </motion.div>
          ));
        })}
      </div>
    </div>
  );
};