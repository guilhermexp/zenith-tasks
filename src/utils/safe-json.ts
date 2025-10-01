/**
 * Utilitários para parsing seguro de JSON
 * Previne erros "Unexpected end of JSON input"
 */

/**
 * Parse JSON de forma segura com tratamento de erros
 */
export function safeJsonParse<T = any>(text: string | null | undefined, fallback: T): T {
  if (!text || text.trim() === '') {
    return fallback
  }

  try {
    return JSON.parse(text) as T
  } catch (error) {
    console.warn('[safeJsonParse] Failed to parse JSON:', error)
    return fallback
  }
}

/**
 * Parse JSON de localStorage com tratamento de erros e limpeza automática
 */
export function safeLocalStorageParse<T = any>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const stored = localStorage.getItem(key)
    if (!stored || stored.trim() === '') {
      return fallback
    }

    return JSON.parse(stored) as T
  } catch (error) {
    console.warn(`[safeLocalStorageParse] Failed to parse key "${key}", clearing corrupted data`, error)
    try {
      localStorage.removeItem(key)
    } catch {}
    return fallback
  }
}

/**
 * Salvar em localStorage com tratamento de erros
 */
export function safeLocalStorageSet(key: string, value: any): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const json = JSON.stringify(value)
    localStorage.setItem(key, json)
    return true
  } catch (error) {
    console.error(`[safeLocalStorageSet] Failed to save key "${key}"`, error)
    return false
  }
}

/**
 * Parse response JSON de forma segura
 */
export async function safeResponseJson<T = any>(response: Response, fallback: T): Promise<T> {
  try {
    const text = await response.text()
    if (!text || text.trim() === '') {
      console.warn('[safeResponseJson] Empty response body')
      return fallback
    }
    return JSON.parse(text) as T
  } catch (error) {
    console.error('[safeResponseJson] Failed to parse response:', error)
    return fallback
  }
}

/**
 * Parse request body JSON de forma segura
 */
export async function safeRequestJson<T = any>(request: Request, fallback: T): Promise<T> {
  try {
    const text = await request.text()
    if (!text || text.trim() === '') {
      console.warn('[safeRequestJson] Empty request body')
      return fallback
    }
    return JSON.parse(text) as T
  } catch (error) {
    console.error('[safeRequestJson] Failed to parse request:', error)
    return fallback
  }
}
