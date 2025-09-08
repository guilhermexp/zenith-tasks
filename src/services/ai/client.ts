import { GoogleGenerativeAI } from '@google/generative-ai'

export type GeminiClient = ReturnType<typeof createGemini>

export function createGemini(apiKey: string) {
  const client = new GoogleGenerativeAI(apiKey)

  function modelJson() {
    return client.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        responseMimeType: 'application/json',
      },
    })
  }

  // Some tools (like Google Search Grounding) are only supported on 1.5 models.
  function modelJsonSearch() {
    return client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        responseMimeType: 'application/json',
      },
    })
  }

  function modelText() {
    return client.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.25,
        topP: 0.9,
      },
    })
  }

  return { client, modelJson, modelJsonSearch, modelText }
}
