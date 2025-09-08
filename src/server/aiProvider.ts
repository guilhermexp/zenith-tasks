import type { ZodTypeAny } from 'zod'

export async function getAISDKModel() {
  const provider = (process.env.AI_SDK_PROVIDER || 'google').toLowerCase()
  if (provider === 'openrouter') {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY missing')
    const { createOpenAI } = await import('@ai-sdk/openai')
    const openai = createOpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' })
    const modelName = process.env.OPENROUTER_MODEL || 'openrouter/auto'
    return openai(modelName)
  }
  // default: google
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY missing')
  const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
  const google = createGoogleGenerativeAI({ apiKey })
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro'
  return google(modelName)
}

