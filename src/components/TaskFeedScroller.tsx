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
  const SCROLL_DEBOUNCE_MS = 50; // Reduced for more responsive updates
  const RESTORE_THRESHOLD_PX = 50; // Max jump distance for smooth restoration

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const rafRef = useRef<number>();
  const lastScrollTimeRef = useRef<number>(0);

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

  // Optimized RAF loop for consistent 60fps
  const startRAF = useCallback(() => {
    const animate = (time: number) => {
      if (lenisRef.current) {
        lenisRef.current.raf(time);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const stopRAF = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
  }, []);

  // Initialize Lenis smooth scrolling with optimized settings
  useEffect(() => {
    if (!scrollContainerRef.current || tasks.length === 0) return;

    // Detect device capabilities for optimal settings
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lenis = new Lenis({
      wrapper: scrollContainerRef.current,
      content: scrollContainerRef.current.firstElementChild as HTMLElement,
      duration: prefersReducedMotion ? 0.1 : (isLowEndDevice ? 0.8 : 1.2),
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: !prefersReducedMotion,
      smoothTouch: !prefersReducedMotion && !isLowEndDevice,
      touchMultiplier: isMobile ? 2.0 : 1.5,
      wheelMultiplier: isLowEndDevice ? 1.0 : 0.8,
      infinite: false, // We handle infinite scrolling manually
      autoResize: true,
      syncTouch: true,
      syncTouchLerp: 0.1,
      touchInertiaMultiplier: 35,
      orientation: 'vertical'
    });

    lenisRef.current = lenis;

    // Start optimized animation loop
    startRAF();

    // Handle scroll events with throttling
    lenis.on('scroll', handleScrollThrottled);

    // Handle resize events
    const handleResize = () => {
      lenis.resize();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      stopRAF();
      lenis.destroy();
      lenisRef.current = null;
      window.removeEventListener('resize', handleResize);
    };
  }, [visibleTasks, startRAF, stopRAF]);

  // Throttled scroll handler for better performance
  const handleScrollThrottled = useCallback((e: any) => {
    const now = performance.now();
    
    // Throttle to maintain 60fps (16.67ms intervals)
    if (now - lastScrollTimeRef.current < 16.67) {
      return;
    }
    
    lastScrollTimeRef.current = now;
    handleScroll(e);
  }, []);

  // Optimized scroll handler
  const handleScroll = useCallback((e: any) => {
    if (!scrollContainerRef.current || tasks.length === 0) return;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollTop = e.scroll;
      const containerHeight = container.clientHeight;
      
      // Find the currently visible task using optimized method
      const centerY = containerHeight / 2;
      const taskElements = container.querySelectorAll('[data-task-id][data-section="real"]');
      
      let currentTaskElement: Element | null = null;
      let currentTaskId = '';
      let offsetPercent = 0;

      // Use binary search-like approach for better performance
      for (const element of taskElements) {
        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Check if this task contains the center point
        const elementTop = rect.top - containerRect.top;
        const elementBottom = elementTop + rect.height;
        
        if (elementTop <= centerY && elementBottom >= centerY) {
          currentTaskElement = element;
          currentTaskId = element.getAttribute('data-task-id') || '';
          
          // Calculate offset percentage within the task
          offsetPercent = Math.max(0, Math.min(100, ((centerY - elementTop) / rect.height) * 100));
          break;
        }
      }

      // Debounce state updates to reduce database writes
      debounceTimeoutRef.current = setTimeout(() => {
        if (currentTaskId && currentTaskId !== currentScrollState?.taskId) {
          const newState: ScrollState = {
            taskId: currentTaskId,
            offsetPercent,
            timestamp: Date.now()
          };

          setCurrentScrollState(newState);
          onScrollStateChange(newState);
        }
      }, SCROLL_DEBOUNCE_MS);

      // Handle infinite scrolling with optimized calculations
      handleInfiniteScroll(scrollTop, container.scrollHeight, containerHeight);
    });
  }, [tasks.length, currentScrollState, onScrollStateChange]);

  // Optimized infinite scrolling logic
  const handleInfiniteScroll = useCallback((scrollTop: number, scrollHeight: number, containerHeight: number) => {
    if (!lenisRef.current || tasks.length <= 1) return;

    const taskHeight = containerHeight;
    const totalTaskHeight = tasks.length * taskHeight;
    const bufferZone = taskHeight * 0.5; // Trigger earlier for smoother transitions
    
    // Check if we're near the top (first buffer zone)
    if (scrollTop < bufferZone) {
      const newScrollTop = scrollTop + totalTaskHeight;
      lenisRef.current.scrollTo(newScrollTop, { immediate: true });
    }
    // Check if we're near the bottom (last buffer zone)
    else if (scrollTop > scrollHeight - containerHeight - bufferZone) {
      const newScrollTop = scrollTop - totalTaskHeight;
      lenisRef.current.scrollTo(newScrollTop, { immediate: true });
    }
  }, [tasks.length]);

  // Optimized scroll position restoration
  useEffect(() => {
    if (!initialScrollState || !userId || !lenisRef.current || isInitialized) return;

    // Use requestIdleCallback for non-critical restoration
    const restorePosition = () => {
      const targetTaskId = initialScrollState.taskId;
      const targetTask = tasks.find(t => t.id === targetTaskId);
      
      if (!targetTask) {
        lenisRef.current?.scrollTo(0, { immediate: true });
        setIsInitialized(true);
        return;
      }

      // Find the target task element in the middle section
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
        const scrollPosition = (targetElement as HTMLElement).offsetTop + targetOffset - containerRect.height / 2;
        
        // Smooth scroll to the restored position
        lenisRef.current?.scrollTo(scrollPosition, {
          duration: 0.8,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
      }

      setIsInitialized(true);
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(restorePosition);
    } else {
      setTimeout(restorePosition, 0);
    }
  }, [initialScrollState, userId, tasks, isInitialized]);

  // Auto-initialize if no initial scroll state
  useEffect(() => {
    if (!initialScrollState && !isInitialized && visibleTasks.length > 0) {
      setIsInitialized(true);
    }
  }, [initialScrollState, isInitialized, visibleTasks.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      stopRAF();
    };
  }, [stopRAF]);

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
      className="task-feed-scroller"
    >
      <div className="task-feed-content">
        {/* First buffer section (copy of last tasks) */}
        {tasks.map((task, index) => (
          <div
            key={`buffer-start-${task.id}-${index}`}
            data-task-id={task.id}
            data-section="buffer-start"
            className="task-item"
          >
            <TaskCard
              task={task}
              onToggleSubtask={onToggleSubtask}
              onCompleteTask={onCompleteTask}
              onAddSubtask={onAddSubtask}
            />
          </div>
        ))}

        {/* Real tasks section */}
        {tasks.map((task, index) => (
          <motion.div
            key={`real-${task.id}-${index}`}
            data-task-id={task.id}
            data-section="real"
            className="task-item"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.05, // Reduced delay for faster loading
              ease: "easeOut"
            }}
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
          <div
            key={`buffer-end-${task.id}-${index}`}
            data-task-id={task.id}
            data-section="buffer-end"
            className="task-item"
          >
            <TaskCard
              task={task}
              onToggleSubtask={onToggleSubtask}
              onCompleteTask={onCompleteTask}
              onAddSubtask={onAddSubtask}
            />
          </div>
        ))}
      </div>
    </div>
  );
};