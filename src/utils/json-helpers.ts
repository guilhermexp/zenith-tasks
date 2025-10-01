/**
 * Utility functions for safe JSON parsing
 */

/**
 * Safely parse JSON with error handling
 * Returns empty object on parse error
 */
export async function safeJsonParse<T = any>(response: Response): Promise<T> {
  try {
    return await response.json()
  } catch (error) {
    console.error('JSON parse error:', error)
    return {} as T
  }
}

/**
 * Parse request body JSON with error handling
 * Returns empty object on parse error
 */
export async function parseRequestBody<T = any>(request: Request): Promise<T> {
  try {
    const text = await request.text()
    if (!text || text.trim() === '') {
      console.warn('[parseRequestBody] Empty request body')
      return {} as T
    }
    return JSON.parse(text)
  } catch (error) {
    console.error('[parseRequestBody] JSON parse error:', error)
    return {} as T
  }
}

/**
 * Extract JSON from text that may contain other content
 * Looks for JSON between markers or tries direct parse
 */
export function extractJson<T = any>(text: string): T | null {
  try {
    // First try direct parse
    return JSON.parse(text)
  } catch {
    // Try to find JSON between common markers
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        return null
      }
    }
    return null
  }
}