/*
  # AI Task Context Generation Edge Function

  This function takes a task name and optional details and uses OpenAI to generate:
  1. A calming, abstract image representing the task
  2. A motivational quote/tip
  3. 3 relevant, achievable subtasks
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
  imageUrl: string;
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

    let imageUrl: string = ''
    let quote: string = ''
    let subtasks: string[] = []

    // Try AI generation first, but always fall back to rule-based generation
    try {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
      
      if (openaiApiKey && openaiApiKey.trim().length > 0) {
        console.log('🔑 OpenAI API key found, attempting AI generation...')
        const aiResult = await generateAITaskContext(taskName, taskDetails, dueDate, recurrence, openaiApiKey)
        imageUrl = aiResult.imageUrl
        quote = aiResult.quote
        subtasks = aiResult.subtasks
        console.log('✅ AI generated task context successfully')
      } else {
        console.log('⚠️ No OpenAI API key configured, using rule-based generation')
        throw new Error('OpenAI API key not configured')
      }
    } catch (aiError) {
      console.warn('⚠️ AI generation failed, using rule-based fallback:', aiError)
      const fallbackResult = generateRuleBasedTaskContext(taskName, taskDetails, dueDate, recurrence)
      imageUrl = fallbackResult.imageUrl
      quote = fallbackResult.quote
      subtasks = fallbackResult.subtasks
    }

    const response: TaskContextResponse = {
      imageUrl,
      quote,
      subtasks,
      success: true
    }

    console.log('✅ Generated task context:', { imageUrl: imageUrl.substring(0, 50) + '...', quote, subtasks })

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
        imageUrl: fallbackResult.imageUrl,
        quote: fallbackResult.quote,
        subtasks: fallbackResult.subtasks,
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
): Promise<{ imageUrl: string; quote: string; subtasks: string[] }> {
  console.log('🤖 Starting AI generation...')
  
  let imageUrl = ''
  let quote = ''
  let subtasks: string[] = []

  // 1. Generate Image using DALL-E
  try {
    console.log('🎨 Generating image with DALL-E...')
    
    const imagePrompt = `A calming, abstract, or nature-themed image representing the task "${taskName}". ${taskDetails ? `Include symbolic elements related to: ${taskDetails}.` : ''} The image should be peaceful and motivating with soft color palettes. Include symbolic elements like books for study tasks, nature elements for outdoor tasks, or abstract shapes for creative tasks. No human faces. Style: minimalist, calming, inspiring.`

    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url'
      })
    })

    if (imageResponse.ok) {
      const imageData = await imageResponse.json()
      imageUrl = imageData.data[0]?.url || ''
      console.log('✅ Image generated successfully')
    } else {
      console.warn('⚠️ Image generation failed, using placeholder')
      imageUrl = `https://picsum.photos/512/512?random=${Date.now()}`
    }
  } catch (imageError) {
    console.error('❌ Image generation error:', imageError)
    imageUrl = `https://picsum.photos/512/512?random=${Date.now()}`
  }

  // 2. Generate Quote and Subtasks using GPT
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

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
      })
    })

    if (chatResponse.ok) {
      const chatData = await chatResponse.json()
      const content = chatData.choices[0]?.message?.content

      if (content) {
        const parsedContent = JSON.parse(content)
        quote = parsedContent.quote || "Every step forward is progress."
        subtasks = parsedContent.subtasks || []

        // Validate subtasks
        if (!Array.isArray(subtasks) || subtasks.length !== 3) {
          throw new Error('Invalid subtasks format')
        }

        // Ensure all subtasks are non-empty strings
        subtasks = subtasks.map(task => String(task).trim()).filter(task => task.length > 0)
        
        if (subtasks.length !== 3) {
          throw new Error('Some subtasks are empty')
        }

        console.log('✅ Quote and subtasks generated successfully')
      }
    } else {
      throw new Error('Chat completion failed')
    }
  } catch (chatError) {
    console.error('❌ Quote/subtasks generation error:', chatError)
    quote = "Take it one step at a time."
    subtasks = [
      "Plan and prepare for the task",
      `Work on completing: ${taskName}`,
      "Review and finalize the work"
    ]
  }

  return { imageUrl, quote, subtasks }
}

function generateRuleBasedTaskContext(
  taskName: string, 
  taskDetails: string = '', 
  dueDate: string = '',
  recurrence: string = ''
): { imageUrl: string; quote: string; subtasks: string[] } {
  console.log('🔧 Generating rule-based task context...')
  
  const titleLower = taskName.toLowerCase()
  const descLower = taskDetails.toLowerCase()
  const combined = `${titleLower} ${descLower}`.trim()

  // Generate a placeholder image URL
  const imageUrl = `https://picsum.photos/512/512?random=${Date.now()}`

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
        imageUrl,
        quote: pattern.quote,
        subtasks: pattern.subtasks
      }
    }
  }

  // Default fallback
  console.log('✅ Using default task context')
  return {
    imageUrl,
    quote: "Progress, not perfection, is the goal.",
    subtasks: [
      'Plan and prepare for the task',
      `Work on completing: ${taskName}`,
      'Review and finalize the work'
    ]
  }
}

function getDefaultTaskContext(): { imageUrl: string; quote: string; subtasks: string[] } {
  console.log('🔧 Using default task context')
  return {
    imageUrl: `https://picsum.photos/512/512?random=${Date.now()}`,
    quote: "Every journey begins with a single step.",
    subtasks: [
      'Plan and prepare for the task',
      'Work on the main objective',
      'Review and complete the task'
    ]
  }
}