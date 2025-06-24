export function shouldDisplayDueDate(dueDate: string, priority: 'high' | 'medium' | 'low'): boolean {
  const now = new Date();
  const due = new Date(dueDate);
  const timeDiff = due.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  // Define thresholds based on priority
  const thresholds = {
    high: 24,    // 24 hours for urgent tasks
    medium: 72,  // 72 hours for normal tasks
    low: 168     // 1 week (168 hours) for long-term tasks
  };
  
  return hoursDiff <= thresholds[priority] && hoursDiff >= 0;
}