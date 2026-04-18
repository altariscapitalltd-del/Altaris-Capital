import { OpenAI } from 'openai'
import { prisma } from './db'
import { trigger, userChannel } from './pusher'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})

const openrouter = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

export async function getAIResponse(userId: string, conversationId: string, userMessage: string) {
  const systemPrompt = `You are the Altaris Capital AI Support Assistant. 
Your goal is to provide quick, professional, and helpful responses to users of our premium investment platform.
Altaris Capital offers investments in Crypto, DeFi, Stocks, Real Estate, Bonds, Fixed Income, Commodities, Forex, ETF, and Hedge Funds.

Guidelines:
1. Be professional, concise, and helpful.
2. If the user asks about their balance, withdrawals, or specific account details, inform them you can help with general questions but for account-specific actions they should speak to a live agent.
3. ALWAYS end your response by asking if they would like to be connected to a live human agent for further assistance.
4. If the user explicitly asks for a "human", "live agent", "person", or "support team", acknowledge this and tell them you are connecting them now.

Current User Message: ${userMessage}`

  let responseText = ''
  let provider = 'groq'

  try {
    // Try Groq first (fastest)
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
      max_tokens: 500,
    })
    responseText = completion.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Groq AI failed, falling back to OpenRouter:', error)
    provider = 'openrouter'
    try {
      // Fallback to OpenRouter
      const completion = await openrouter.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
        max_tokens: 500,
      })
      responseText = completion.choices[0]?.message?.content || ''
    } catch (fallbackError) {
      console.error('All AI providers failed:', fallbackError)
      responseText = "I'm sorry, I'm having trouble connecting to my brain right now. Would you like me to connect you to a live human agent instead?"
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
