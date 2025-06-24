/*
  # AI Subtask Generation Edge Function

  This function takes a task title and optional description and uses AI to generate
  3 relevant, achievable subtasks for the user to complete.
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface RequestBody {
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
}

interface SubtaskResponse {
  subtasks: string[];
  success: boolean;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const { title, description, priority = 'medium', category = 'Personal' }: RequestBody = await req.json()

    if (!title || title.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Task title is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    console.log('🤖 Generating subtasks for:', { title, description, priority, category })

    // Create a comprehensive prompt for AI subtask generation
    const prompt = `You are a productivity assistant helping users break down tasks into manageable subtasks.

Task Details:
- Title: "${title}"
- Description: "${description || 'No additional description provided'}"
- Priority: ${priority}
- Category: ${category}

Please generate exactly 3 specific, actionable subtasks that will help the user complete this main task. Each subtask should:
1. Be clear and specific
2. Be achievable in a reasonable timeframe
3. Logically contribute to completing the main task
4. Be written as action items (start with verbs when possible)

Priority Guidelines:
- High priority: Include preparation, research, and execution steps
- Medium priority: Focus on planning, execution, and review
- Low priority: Keep it simple with basic planning and execution

Respond with ONLY a JSON array of 3 strings, no additional text or formatting. Example format:
["First subtask action", "Second subtask action", "Third subtask action"]`

    // For now, we'll use a simple rule-based system since we don't have OpenAI configured
    // In production, you would replace this with actual AI API calls
    const subtasks = generateRuleBasedSubtasks(title, description, priority, category)

    const response: SubtaskResponse = {
      subtasks,
      success: true
    }

    console.log('✅ Generated subtasks:', subtasks)

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )

  } catch (error) {
    console.error('❌ Error in generate-subtasks function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Failed to generate subtasks",
        subtasks: getDefaultSubtasks() // Fallback subtasks
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})

function generateRuleBasedSubtasks(
  title: string, 
  description: string = '', 
  priority: string = 'medium',
  category: string = 'Personal'
): string[] {
  const titleLower = title.toLowerCase()
  const descLower = description.toLowerCase()
  const combined = `${titleLower} ${descLower}`.trim()

  // Category-specific subtask templates
  const categoryTemplates = {
    'Work': {
      high: [
        'Research requirements and gather necessary resources',
        'Create detailed project plan with timeline',
        'Execute main work and review quality'
      ],
      medium: [
        'Plan approach and gather materials',
        'Complete the main work tasks',
        'Review and finalize deliverables'
      ],
      low: [
        'Set up workspace and materials',
        'Work on the main task',
        'Quick review and completion'
      ]
    },
    'Personal': {
      high: [
        'Plan and prepare necessary steps',
        'Execute the main activity',
        'Review progress and next steps'
      ],
      medium: [
        'Gather what you need to get started',
        'Work on the main task',
        'Complete and tidy up'
      ],
      low: [
        'Quick preparation',
        'Do the main task',
        'Finish up'
      ]
    },
    'Health': {
      high: [
        'Research best practices and prepare',
        'Implement the health activity',
        'Track progress and adjust plan'
      ],
      medium: [
        'Prepare necessary items or space',
        'Complete the health activity',
        'Record progress or results'
      ],
      low: [
        'Quick setup',
        'Do the activity',
        'Note how it went'
      ]
    },
    'Learning': {
      high: [
        'Research topic and gather learning materials',
        'Study and practice the main concepts',
        'Test knowledge and plan next steps'
      ],
      medium: [
        'Find learning resources',
        'Study the main material',
        'Practice or review what you learned'
      ],
      low: [
        'Find basic information',
        'Learn the basics',
        'Quick review'
      ]
    }
  }

  // Keyword-based intelligent subtask generation
  const keywordPatterns = [
    {
      keywords: ['exercise', 'workout', 'gym', 'run', 'fitness'],
      subtasks: [
        'Prepare workout clothes and equipment',
        'Complete the exercise routine',
        'Cool down and track progress'
      ]
    },
    {
      keywords: ['cook', 'recipe', 'meal', 'dinner', 'lunch'],
      subtasks: [
        'Gather ingredients and cooking tools',
        'Follow recipe and cook the meal',
        'Serve and clean up kitchen'
      ]
    },
    {
      keywords: ['clean', 'organize', 'tidy', 'declutter'],
      subtasks: [
        'Gather cleaning supplies and prepare area',
        'Clean and organize the space',
        'Put everything back in place'
      ]
    },
    {
      keywords: ['study', 'learn', 'research', 'read'],
      subtasks: [
        'Gather study materials and find quiet space',
        'Read and take notes on key concepts',
        'Review notes and test understanding'
      ]
    },
    {
      keywords: ['write', 'draft', 'document', 'report'],
      subtasks: [
        'Outline main points and gather information',
        'Write the first draft',
        'Review, edit, and finalize'
      ]
    },
    {
      keywords: ['meeting', 'call', 'presentation'],
      subtasks: [
        'Prepare agenda and necessary materials',
        'Conduct the meeting or call',
        'Follow up with notes and action items'
      ]
    },
    {
      keywords: ['shop', 'buy', 'purchase', 'grocery'],
      subtasks: [
        'Make a list of what you need',
        'Go shopping and find items',
        'Check out and organize purchases'
      ]
    },
    {
      keywords: ['plan', 'schedule', 'organize'],
      subtasks: [
        'Brainstorm ideas and requirements',
        'Create detailed plan or schedule',
        'Review and finalize arrangements'
      ]
    }
  ]

  // Check for keyword matches
  for (const pattern of keywordPatterns) {
    if (pattern.keywords.some(keyword => combined.includes(keyword))) {
      return pattern.subtasks
    }
  }

  // Fall back to category and priority-based templates
  const templates = categoryTemplates[category as keyof typeof categoryTemplates] || categoryTemplates['Personal']
  const priorityTemplate = templates[priority as keyof typeof templates] || templates['medium']

  // Customize the generic template with the task title
  return priorityTemplate.map((subtask, index) => {
    if (index === 1) {
      // Make the middle subtask more specific to the actual task
      return `Complete the main part of: ${title}`
    }
    return subtask
  })
}

function getDefaultSubtasks(): string[] {
  return [
    'Plan and prepare for the task',
    'Work on the main objective',
    'Review and complete the task'
  ]
}