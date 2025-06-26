/*
  # AI Task Context Generation Edge Function

  This function takes a task name and optional details and uses OpenAI to generate:
  1. A motivational quote/tip
  2. 3 relevant, achievable subtasks
  
  Note: Image generation has been removed to improve performance and reduce loading times.
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface RequestBody {
  taskName: string;
  taskDetails?: string;
  dueDate?: string; // ISO string
  recurrence?: string;
}

interface TaskContextResponse {
  quote: string;
  subtasks: string[];
  success: boolean;
  error?: string;
  source?: 'ai' | 'fallback' | 'emergency_fallback';
}

interface AIGenerationResult {
  quote: string;
  subtasks: string[];
  success: boolean;
  error?: string;
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

    const { taskName, taskDetails, dueDate, recurrence }: RequestBody = await req.json()

    if (!taskName || taskName.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Task name is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    console.log('🎨 Generating task context for:', { taskName, taskDetails, dueDate, recurrence })

    let quote: string = ''
    let subtasks: string[] = []
    let source: 'ai' | 'fallback' | 'emergency_fallback' = 'fallback'

    // Try AI generation first with explicit error handling
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (openaiApiKey && openaiApiKey.trim().length > 0) {
      console.log('🔑 OpenAI API key found, attempting AI generation...')
      
      try {
        const aiResult = await generateAITaskContext(taskName, taskDetails, dueDate, recurrence, openaiApiKey)
        
        if (aiResult.success) {
          quote = aiResult.quote
          subtasks = aiResult.subtasks
          source = 'ai'
          console.log('✅ AI generated task context successfully')
        } else {
          console.warn('⚠️ AI generation failed:', aiResult.error)
          throw new Error(aiResult.error || 'AI generation failed')
        }
      } catch (aiError) {
        console.warn('⚠️ AI generation error, using rule-based fallback:', aiError)
        const fallbackResult = generateRuleBasedTaskContext(taskName, taskDetails, dueDate, recurrence)
        quote = fallbackResult.quote
        subtasks = fallbackResult.subtasks
        source = 'fallback'
      }
    } else {
      console.log('⚠️ No OpenAI API key configured, using rule-based generation')
      const fallbackResult = generateRuleBasedTaskContext(taskName, taskDetails, dueDate, recurrence)
      quote = fallbackResult.quote
      subtasks = fallbackResult.subtasks
      source = 'fallback'
    }

    const response: TaskContextResponse = {
      quote,
      subtasks,
      success: true,
      source
    }

    console.log('✅ Generated task context:', { quote, subtasks, source })

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )

  } catch (error) {
    console.error('💥 Error in generate-task-context function:', error)
    
    // Always return a successful response with fallback content
    const fallbackResult = getDefaultTaskContext()
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        quote: fallbackResult.quote,
        subtasks: fallbackResult.subtasks,
        source: 'emergency_fallback',
        error: 'Used fallback generation due to error'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})

async function generateAITaskContext(
  taskName: string,
  taskDetails: string = '',
  dueDate: string = '',
  recurrence: string = '',
  apiKey: string
): Promise<AIGenerationResult> {
  console.log('🤖 Starting AI generation...')
  
  try {
    console.log('💭 Generating quote and subtasks with GPT...')
    
    const contextInfo = [
      `Task: "${taskName}"`,
      taskDetails ? `Details: "${taskDetails}"` : '',
      dueDate ? `Due: ${new Date(dueDate).toLocaleDateString()}` : '',
      recurrence ? `Recurrence: ${recurrence}` : ''
    ].filter(Boolean).join('\n')

    const systemPrompt = `You are a productivity coach who helps people break down tasks and stay motivated. Generate a motivational quote and 3 actionable subtasks for the given task.

CRITICAL: Respond with ONLY a valid JSON object containing 'quote' (string) and 'subtasks' (array of exactly 3 strings).

Guidelines for the quote:
- 1-2 sentences maximum
- Encouraging and actionable
- Relevant to the task type
- Avoid clichés

Guidelines for subtasks:
- Each should be specific and actionable
- Logically sequenced (preparation → execution → completion)
- Realistic and achievable
- Start with action verbs when possible

Example response:
{
  "quote": "Progress comes from starting, not from waiting for perfect timing.",
  "subtasks": [
    "Gather necessary materials and set up workspace",
    "Complete the main task systematically",
    "Review results and finalize completion"
  ]
}`

    const userPrompt = `Generate a motivational quote and 3 subtasks for this task:

${contextInfo}

Respond with only the JSON object.`

    // Add timeout and explicit error handling for fetch
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    let chatResponse: Response
    
    try {
      chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 300,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('❌ Network error during OpenAI API call:', fetchError)
      return {
        success: false,
        error: `Network error: ${fetchError.message}`,
        quote: '',
        subtasks: []
      }
    }

    clearTimeout(timeoutId)

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text().catch(() => 'Unknown error')
      console.error('❌ OpenAI API error:', chatResponse.status, errorText)
      return {
        success: false,
        error: `OpenAI API error: ${chatResponse.status} - ${errorText}`,
        quote: '',
        subtasks: []
      }
    }

    const chatData = await chatResponse.json()
    const content = chatData.choices[0]?.message?.content

    if (!content) {
      return {
        success: false,
        error: 'No content received from OpenAI API',
        quote: '',
        subtasks: []
      }
    }

    const parsedContent = JSON.parse(content)
    const quote = parsedContent.quote || "Every step forward is progress."
    let subtasks = parsedContent.subtasks || []

    // Validate subtasks
    if (!Array.isArray(subtasks) || subtasks.length !== 3) {
      return {
        success: false,
        error: 'Invalid subtasks format from AI response',
        quote: '',
        subtasks: []
      }
    }

    // Ensure all subtasks are non-empty strings
    subtasks = subtasks.map(task => String(task).trim()).filter(task => task.length > 0)
    
    if (subtasks.length !== 3) {
      return {
        success: false,
        error: 'Some subtasks are empty after validation',
        quote: '',
        subtasks: []
      }
    }

    console.log('✅ Quote and subtasks generated successfully')
    
    return {
      success: true,
      quote,
      subtasks
    }

  } catch (error) {
    console.error('❌ Unexpected error in AI generation:', error)
    return {
      success: false,
      error: `Unexpected error: ${error.message}`,
      quote: '',
      subtasks: []
    }
  }
}

function generateRuleBasedTaskContext(
  taskName: string, 
  taskDetails: string = '', 
  dueDate: string = '',
  recurrence: string = ''
): { quote: string; subtasks: string[] } {
  console.log('🔧 Generating rule-based task context...')
  
  const titleLower = taskName.toLowerCase()
  const descLower = taskDetails.toLowerCase()
  const combined = `${titleLower} ${descLower}`.trim()

  // Enhanced keyword-based intelligent subtask and quote generation
  const keywordPatterns = [
    {
      keywords: ['exercise', 'workout', 'gym', 'run', 'fitness', 'training'],
      quote: "Your body can do it. It's your mind you need to convince.",
      subtasks: [
        'Prepare workout clothes and equipment',
        'Complete the exercise routine',
        'Cool down and track progress'
      ]
    },
    {
      keywords: ['cook', 'recipe', 'meal', 'dinner', 'lunch', 'breakfast', 'bake'],
      quote: "Cooking is love made visible through every ingredient.",
      subtasks: [
        'Gather ingredients and cooking tools',
        'Follow recipe and cook the meal',
        'Serve and clean up kitchen'
      ]
    },
    {
      keywords: ['clean', 'organize', 'tidy', 'declutter', 'vacuum', 'dust'],
      quote: "A clean space creates a clear mind and focused energy.",
      subtasks: [
        'Gather cleaning supplies and prepare area',
        'Clean and organize the space thoroughly',
        'Put everything back in place and inspect'
      ]
    },
    {
      keywords: ['study', 'learn', 'research', 'read', 'course', 'tutorial'],
      quote: "Learning is the only thing the mind never exhausts.",
      subtasks: [
        'Gather study materials and find quiet space',
        'Read and take notes on key concepts',
        'Review notes and test understanding'
      ]
    },
    {
      keywords: ['write', 'draft', 'document', 'report', 'essay', 'article'],
      quote: "The first draft is just you telling yourself the story.",
      subtasks: [
        'Outline main points and gather information',
        'Write the first draft',
        'Review, edit, and finalize'
      ]
    },
    {
      keywords: ['meeting', 'call', 'presentation', 'conference'],
      quote: "Preparation prevents poor performance.",
      subtasks: [
        'Prepare agenda and necessary materials',
        'Conduct the meeting or presentation',
        'Follow up with notes and action items'
      ]
    },
    {
      keywords: ['shop', 'buy', 'purchase', 'grocery', 'shopping'],
      quote: "Smart shopping starts with a clear plan.",
      subtasks: [
        'Make a detailed list of what you need',
        'Go shopping and find all items',
        'Check out and organize purchases'
      ]
    },
    {
      keywords: ['plan', 'schedule', 'organize', 'arrange'],
      quote: "A goal without a plan is just a wish.",
      subtasks: [
        'Brainstorm ideas and requirements',
        'Create detailed plan or schedule',
        'Review and finalize arrangements'
      ]
    },
    {
      keywords: ['project', 'build', 'create', 'develop'],
      quote: "Every expert was once a beginner who refused to give up.",
      subtasks: [
        'Plan project scope and gather resources',
        'Execute main development work',
        'Test, review, and finalize project'
      ]
    }
  ]

  // Check for keyword matches
  for (const pattern of keywordPatterns) {
    if (pattern.keywords.some(keyword => combined.includes(keyword))) {
      console.log('✅ Found keyword match for pattern:', pattern.keywords)
      return {
        quote: pattern.quote,
        subtasks: pattern.subtasks
      }
    }
  }

  // Default fallback
  console.log('✅ Using default task context')
  return {
    quote: "Progress, not perfection, is the goal.",
    subtasks: [
      'Plan and prepare for the task',
      `Work on completing: ${taskName}`,
      'Review and finalize the work'
    ]
  }
}

function getDefaultTaskContext(): { quote: string; subtasks: string[] } {
  console.log('🔧 Using default task context')
  return {
    quote: "Every journey begins with a single step.",
    subtasks: [
      'Plan and prepare for the task',
      'Work on the main objective',
      'Review and complete the task'
    ]
  }
}