import { Task } from '../types/task';

export function calculateXP(task: Task): number {
  const baseXP = {
    high: 50,
    medium: 30,
    low: 15
  };
  
  const subtaskBonus = task.subtasks.filter(st => st.completed).length * 5;
  return baseXP[task.priority] + subtaskBonus;
}