import { OpenAI } from 'openai'
import { prisma } from './db'
import { trigger, userChannel } from './pusher'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

function createGroqClient() {
  if (!GROQ_API_KEY) return null
  return new OpenAI({
    apiKey: GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  })
}

function createOpenRouterClient() {
  if (!OPENROUTER_API_KEY) return null
  return new OpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  })
}

export async function getAIResponse(userId: string, conversationId: string, userMessage: string) {
  const systemPrompt = `You are the Altaris Capital support assistant — knowledgeable, calm, and direct.

Altaris Capital is a premium investment platform offering Crypto, DeFi, Stocks, Real Estate, Bonds, Fixed Income, Commodities, Forex, ETFs, and Hedge Funds.

How to behave:
- Greet the user naturally on first contact, like a real support person would — warm but professional.
- Answer questions clearly and concisely. Do not pad responses.
- For account-specific actions (balance lookups, withdrawals, account changes), explain that you can cover general guidance but account actions require a human agent.
- If the user seems frustrated, has asked the same question more than once, or the issue is clearly complex, offer once to connect them with a human agent: "Would you like me to connect you with a human agent?" Do NOT offer this on every reply — only when it genuinely makes sense.
- If the user explicitly asks for a human, live agent, or to speak to someone, acknowledge it immediately and tell them you are flagging the conversation for a human agent now.
- Never say you are an AI unless directly asked. Do not use robotic phrasing.`

  // Fetch recent conversation history for context (last 10 messages)
  const recentMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  const historyMessages = recentMessages.reverse().map((msg) => ({
    role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }))

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...historyMessages,
    { role: 'user' as const, content: userMessage },
  ]

  let responseText = ''
  let provider = 'groq'

  try {
    // Try Groq first (fastest)
    const groq = createGroqClient()
    if (!groq) throw new Error('GROQ_API_KEY is not configured')
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 500,
    })
    responseText = completion.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Groq AI failed, falling back to OpenRouter:', error)
    provider = 'openrouter'
    try {
      // Fallback to OpenRouter
      const openrouter = createOpenRouterClient()
      if (!openrouter) throw new Error('OPENROUTER_API_KEY is not configured')
      const completion = await openrouter.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages,
        max_tokens: 500,
      })
      responseText = completion.choices[0]?.message?.content || ''
    } catch (fallbackError) {
      console.error('All AI providers failed:', fallbackError)
      responseText = "Sorry, I'm having a technical issue right now. Would you like me to connect you with a human agent?"
    }
  }

  // Save AI message to DB
  const aiMsg = await prisma.message.create({
    data: {
      conversationId,
      sender: 'ai',
      content: responseText,
    },
  })

  // Trigger Pusher event for the user
  await trigger(userChannel(userId), 'chat:message', { ...aiMsg, isAdmin: true })

  // Check if handoff is needed
  const handoffKeywords = ['human', 'live agent', 'person', 'support team', 'agent', 'talk to someone']
  const needsHandoff = handoffKeywords.some(keyword => userMessage.toLowerCase().includes(keyword))

  if (needsHandoff) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'active' }, // Ensure it's active for human agents
    })
    // You could trigger an admin notification here
  }

  return { text: responseText, provider }
}
