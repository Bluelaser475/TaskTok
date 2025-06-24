import { Task, Subtask } from '../types/task';

const subtaskTemplates = {
  high: [
    "Break down into smaller, actionable steps",
    "Set up proper workspace and tools",
    "Research best practices and methodologies",
    "Create detailed timeline with milestones",
    "Identify potential obstacles and solutions"
  ],
  medium: [
    "Gather necessary resources and materials",
    "Create rough outline or plan",
    "Set realistic deadlines",
    "Identify key requirements"
  ],
  low: [
    "Quick planning session (5-10 minutes)",
    "Gather basic materials needed",
    "Set simple completion goal"
  ]
};

const aiSuggestions = [
  "💡 Try using the Pomodoro technique for better focus",
  "🎯 Break this down into even smaller tasks for easier completion",
  "⚡ Consider tackling this during your peak energy hours",
  "🤝 This might be a good task to delegate or get help with",
  "📅 Setting a specific deadline can boost your motivation",
  "🎵 Put on some focus music to enhance your productivity",
  "🏃‍♂️ Take breaks every 25 minutes to maintain quality"
];

export function generateSubtasks(title: string, priority: Task['priority']): Subtask[] {
  const templates = subtaskTemplates[priority];
  const count = priority === 'high' ? 5 : priority === 'medium' ? 4 : 3;
  
  return Array.from({ length: count }, (_, index) => ({
    id: `subtask-${Date.now()}-${index}`,
    text: templates[index] || `Complete step ${index + 1} of ${title}`,
    completed: false
  }));
}

export function generateAISuggestion(): string {
  return aiSuggestions[Math.floor(Math.random() * aiSuggestions.length)];
}

export function calculateXP(task: Task): number {
  const baseXP = {
    high: 50,
    medium: 30,
    low: 15
  };
  
  const subtaskBonus = task.subtasks.filter(st => st.completed).length * 5;
  return baseXP[task.priority] + subtaskBonus;
}