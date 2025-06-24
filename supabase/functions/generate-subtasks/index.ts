/*
  # AI Subtask Generation Edge Function

  This function takes a task title and optional description and uses OpenAI to generate
  3 relevant, achievable subtasks for the user to complete.
*/

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
  source?: 'ai' | 'fallback';
}

Deno.serve(async (req: Request): Promise<Response> => {
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

    let subtasks: string[] = []
    let source: 'ai' | 'fallback' = 'fallback'

    // Try AI generation first
    try {
      const aiSubtasks = await generateAISubtasks(title, description, priority, category)
      if (aiSubtasks && aiSubtasks.length === 3) {
        subtasks = aiSubtasks
        source = 'ai'
        console.log('✅ AI generated subtasks successfully')
      } else {
        throw new Error('AI returned invalid subtasks format')
      }
    } catch (aiError) {
      console.warn('⚠️ AI generation failed, using fallback:', aiError)
      subtasks = generateRuleBasedSubtasks(title, description, priority, category)
      source = 'fallback'
    }

    const response: SubtaskResponse = {
      subtasks,
      success: true,
      source
    }

    console.log('✅ Generated subtasks:', subtasks, 'Source:', source)

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
        success: true, 
        subtasks: getDefaultSubtasks(),
        source: 'fallback'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})

async function generateAISubtasks(
  title: string,
  description: string = '',
  priority: string = 'medium',
  category: string = 'Personal'
): Promise<string[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const systemPrompt = `You are a highly efficient productivity assistant specialized in breaking down complex tasks into clear, actionable subtasks. Your goal is to help users manage their workload by providing precise, achievable steps.

CRITICAL: You must respond with ONLY a valid JSON array of exactly 3 strings. No other text, explanations, or formatting. Each string should be a specific, actionable subtask.

Guidelines:
- Each subtask should be clear and specific
- Start with action verbs when possible
- Make them achievable in reasonable timeframes
- Ensure they logically contribute to the main task
- Consider the priority level and category context

Example response format:
["Research and gather necessary materials", "Execute the main task systematically", "Review results and finalize completion"]`

  const userPrompt = `Generate exactly 3 actionable subtasks for this task:

Title: "${title}"
Description: "${description || 'No additional description provided'}"
Priority: ${priority}
Category: ${category}

Priority context:
- High: Include preparation, research, and thorough execution
- Medium: Focus on planning, execution, and review
- Low: Keep simple with basic planning and execution

Respond with only the JSON array of 3 subtask strings.`

  try {
    console.log('🔄 Calling OpenAI API...')
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ OpenAI API error:', response.status, errorData)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('📥 OpenAI response:', data)

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid OpenAI response structure')
    }

    const content = data.choices[0].message.content.trim()
    console.log('📝 AI generated content:', content)

    // Parse the JSON response
    let parsedContent
    try {
      parsedContent = JSON.parse(content)
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', content)
      throw new Error('AI response is not valid JSON')
    }

    // Handle different possible response formats
    let subtasks: string[] = []
    
    if (Array.isArray(parsedContent)) {
      subtasks = parsedContent
    } else if (parsedContent.subtasks && Array.isArray(parsedContent.subtasks)) {
      subtasks = parsedContent.subtasks
    } else if (parsedContent.tasks && Array.isArray(parsedContent.tasks)) {
      subtasks = parsedContent.tasks
    } else {
      throw new Error('AI response does not contain a valid subtasks array')
    }

    // Validate subtasks
    if (!Array.isArray(subtasks) || subtasks.length !== 3) {
      throw new Error(`Expected 3 subtasks, got ${subtasks?.length || 0}`)
    }

    // Ensure all subtasks are strings and not empty
    const validSubtasks = subtasks
      .map(task => typeof task === 'string' ? task.trim() : '')
      .filter(task => task.length > 0)

    if (validSubtasks.length !== 3) {
      throw new Error('Some subtasks are empty or invalid')
    }

    return validSubtasks

  } catch (error) {
    console.error('❌ OpenAI API call failed:', error)
    throw error
  }
}

function generateRuleBasedSubtasks(
  title: string, 
  description: string = '', 
  priority: string = 'medium',
  category: string = 'Personal'
): string[] {
  const titleLower = title.toLowerCase()
  const descLower = description.toLowerCase()
  const combined = `${titleLower} ${descLower}`.trim()

  // Enhanced keyword-based intelligent subtask generation
  const keywordPatterns = [
    {
      keywords: ['exercise', 'workout', 'gym', 'run', 'fitness', 'training'],
      subtasks: [
        'Prepare workout clothes and equipment',
        'Complete the exercise routine',
        'Cool down and track progress'
      ]
    },
    {
      keywords: ['cook', 'recipe', 'meal', 'dinner', 'lunch', 'breakfast', 'bake'],
      subtasks: [
        'Gather ingredients and cooking tools',
        'Follow recipe and cook the meal',
        'Serve and clean up kitchen'
      ]
    },
    {
      keywords: ['clean', 'organize', 'tidy', 'declutter', 'vacuum', 'dust'],
      subtasks: [
        'Gather cleaning supplies and prepare area',
        'Clean and organize the space thoroughly',
        'Put everything back in place and inspect'
      ]
    },
    {
      keywords: ['study', 'learn', 'research', 'read', 'course', 'tutorial'],
      subtasks: [
        'Gather study materials and find quiet space',
        'Read and take notes on key concepts',
        'Review notes and test understanding'
      ]
    },
    {
      keywords: ['write', 'draft', 'document', 'report', 'essay', 'article'],
      subtasks: [
        'Outline main points and gather information',
        'Write the first draft',
        'Review, edit, and finalize'
      ]
    },
    {
      keywords: ['meeting', 'call', 'presentation', 'conference'],
      subtasks: [
        'Prepare agenda and necessary materials',
        'Conduct the meeting or presentation',
        'Follow up with notes and action items'
      ]
    },
    {
      keywords: ['shop', 'buy', 'purchase', 'grocery', 'shopping'],
      subtasks: [
        'Make a detailed list of what you need',
        'Go shopping and find all items',
        'Check out and organize purchases'
      ]
    },
    {
      keywords: ['plan', 'schedule', 'organize', 'arrange'],
      subtasks: [
        'Brainstorm ideas and requirements',
        'Create detailed plan or schedule',
        'Review and finalize arrangements'
      ]
    },
    {
      keywords: ['project', 'build', 'create', 'develop'],
      subtasks: [
        'Plan project scope and gather resources',
        'Execute main development work',
        'Test, review, and finalize project'
      ]
    },
    {
      keywords: ['email', 'message', 'contact', 'communicate'],
      subtasks: [
        'Draft clear and concise message',
        'Review and send communication',
        'Follow up if response is needed'
      ]
    }
  ]

  // Check for keyword matches
  for (const pattern of keywordPatterns) {
    if (pattern.keywords.some(keyword => combined.includes(keyword))) {
      return pattern.subtasks
    }
  }

  // Category-specific templates with priority consideration
  const categoryTemplates = {
    'Work': {
      high: [
        'Research requirements and gather necessary resources',
        'Execute main work tasks with attention to detail',
        'Review quality and prepare deliverables'
      ],
      medium: [
        'Plan approach and gather materials',
        'Complete the main work tasks',
        'Review and finalize deliverables'
      ],
      low: [
        'Set up workspace and basic materials',
        'Work on the main task',
        'Quick review and completion'
      ]
    },
    'Personal': {
      high: [
        'Plan thoroughly and prepare necessary steps',
        'Execute the main activity with focus',
        'Review progress and plan next steps'
      ],
      medium: [
        'Gather what you need to get started',
        'Work on completing the main task',
        'Finish up and tidy loose ends'
      ],
      low: [
        'Quick preparation and setup',
        'Complete the main task',
        'Simple cleanup and finish'
      ]
    },
    'Health': {
      high: [
        'Research best practices and prepare properly',
        'Implement the health activity safely',
        'Track progress and adjust plan as needed'
      ],
      medium: [
        'Prepare necessary items or space',
        'Complete the health activity',
        'Record progress or results'
      ],
      low: [
        'Quick setup and preparation',
        'Do the health activity',
        'Note how it went'
      ]
    },
    'Learning': {
      high: [
        'Research topic and gather comprehensive learning materials',
        'Study and practice the main concepts thoroughly',
        'Test knowledge and plan advanced next steps'
      ],
      medium: [
        'Find quality learning resources',
        'Study the main material actively',
        'Practice or review what you learned'
      ],
      low: [
        'Find basic information sources',
        'Learn the fundamental concepts',
        'Quick review of key points'
      ]
    },
    'Creative': {
      high: [
        'Brainstorm ideas and gather inspiration',
        'Create and refine your creative work',
        'Review, polish, and share your creation'
      ],
      medium: [
        'Gather materials and set up workspace',
        'Work on the creative project',
        'Review and make final touches'
      ],
      low: [
        'Quick setup and idea generation',
        'Create the basic version',
        'Simple review and completion'
      ]
    }
  }

  // Get appropriate template
  const templates = categoryTemplates[category as keyof typeof categoryTemplates] || categoryTemplates['Personal']
  const priorityTemplate = templates[priority as keyof typeof templates] || templates['medium']

  // Customize the middle subtask to be more specific to the actual task
  return priorityTemplate.map((subtask, index) => {
    if (index === 1) {
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