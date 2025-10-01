export interface SecurityConfig {
  maxInputLength: number;
  maxTokensPerUser: number;
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
  enablePromptInjectionDetection: boolean;
  enableSensitiveDataMasking: boolean;
}

export interface UserPermissions {
  tools: string[];
  maxTokensPerRequest: number;
  allowedProviders: string[];
  canUseStructuredOutput: boolean;
  canUseMCP: boolean;
}

// Configuração padrão de segurança
export const defaultSecurityConfig: SecurityConfig = {
  maxInputLength: 10000,
  maxTokensPerUser: 100000,
  rateLimitWindow: 60000, // 1 minuto
  rateLimitMaxRequests: 60,
  enablePromptInjectionDetection: true,
  enableSensitiveDataMasking: true
};

export class SecurityManager {
  private static instance: SecurityManager;
  private userPermissions: Map<string, UserPermissions> = new Map();
  private rateLimits: Map<string, number[]> = new Map();
  private config: SecurityConfig;

  private constructor(config: SecurityConfig = defaultSecurityConfig) {
    this.config = config;
  }

  static getInstance(config?: SecurityConfig): SecurityManager {
    if (!this.instance) {
      this.instance = new SecurityManager(config);
    }
    return this.instance;
  }

  /**
   * Sanitiza input do usuário removendo conteúdo perigoso
   */
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Remover caracteres de controle
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Limitar tamanho
    if (sanitized.length > defaultSecurityConfig.maxInputLength) {
      sanitized = sanitized.substring(0, defaultSecurityConfig.maxInputLength) + '...';
    }

    // Remover possíveis scripts maliciosos
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[SCRIPT_REMOVED]');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '[IFRAME_REMOVED]');

    // Escapar caracteres HTML perigosos
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return sanitized;
  }

  /**
   * Detecta tentativas de prompt injection
   */
  static detectPromptInjection(prompt: string): {
    detected: boolean;
    patterns: string[];
    risk: 'low' | 'medium' | 'high';
  } {
    const dangerousPatterns = [
      // Comandos diretos
      {
        pattern: /ignore\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/gi,
        risk: 'high' as const,
        name: 'ignore_instructions'
      },
      {
        pattern: /disregard\s+(above|previous|all)/gi,
        risk: 'high' as const,
        name: 'disregard_instructions'
      },
      {
        pattern: /forget\s+(everything|all|previous)/gi,
        risk: 'high' as const,
        name: 'forget_instructions'
      },
      
      // Tentativas de role hijacking
      {
        pattern: /system\s*[:]\s*|system\s+prompt/gi,
        risk: 'high' as const,
        name: 'system_prompt_injection'
      },
      {
        pattern: /\\n\\n\s*system\s*:/gi,
        risk: 'high' as const,
        name: 'newline_system_injection'
      },
      {
        pattern: /ADMIN\s*[:]/gi,
        risk: 'medium' as const,
        name: 'admin_role'
      },
      {
        pattern: /sudo\s+/gi,
        risk: 'medium' as const,
        name: 'sudo_command'
      },

      // Tentativas de extração de informações
      {
        pattern: /show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions|rules)/gi,
        risk: 'medium' as const,
        name: 'prompt_extraction'
      },
      {
        pattern: /what\s+(are\s+)?(your\s+)?(initial\s+)?(instructions|rules|guidelines)/gi,
        risk: 'medium' as const,
        name: 'instruction_extraction'
      },

      // Tentativas de bypass
      {
        pattern: /act\s+as\s+(if\s+)?you\s+(are|were)\s+not\s+an?\s+ai/gi,
        risk: 'medium' as const,
        name: 'identity_bypass'
      },
      {
        pattern: /pretend\s+(you\s+are|to\s+be)/gi,
        risk: 'low' as const,
        name: 'pretend_instruction'
      },

      // Caracteres suspeitos
      {
        pattern: /\u200B|\u200C|\u200D|\uFEFF/g, // Zero-width characters
        risk: 'low' as const,
        name: 'zero_width_chars'
      }
    ];

    const detectedPatterns: string[] = [];
    let maxRisk: 'low' | 'medium' | 'high' = 'low';

    for (const { pattern, risk, name } of dangerousPatterns) {
      if (pattern.test(prompt)) {
        detectedPatterns.push(name);
        if (risk === 'high' || (risk === 'medium' && maxRisk === 'low')) {
          maxRisk = risk;
        }
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
      risk: detectedPatterns.length > 0 ? maxRisk : 'low'
    };
  }

  /**
   * Sanitiza prompt removendo ou mascarando tentativas de injection
   */
  static sanitizePrompt(prompt: string): string {
    const injection = this.detectPromptInjection(prompt);
    
    if (!injection.detected) {
      return prompt;
    }

    let sanitized = prompt;

    // Substituir padrões perigosos
    const replacements = [
      { pattern: /ignore\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/gi, replacement: '[INSTRUCTION_BLOCKED]' },
      { pattern: /disregard\s+(above|previous|all)/gi, replacement: '[INSTRUCTION_BLOCKED]' },
      { pattern: /forget\s+(everything|all|previous)/gi, replacement: '[INSTRUCTION_BLOCKED]' },
      { pattern: /system\s*[:]\s*/gi, replacement: 'user: ' },
      { pattern: /\\n\\n\s*system\s*:/gi, replacement: '\\n\\nuser:' },
      { pattern: /ADMIN\s*[:]/gi, replacement: 'USER:' },
      { pattern: /sudo\s+/gi, replacement: '' },
      { pattern: /\u200B|\u200C|\u200D|\uFEFF/g, replacement: '' }
    ];

    for (const { pattern, replacement } of replacements) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
  }

  /**
   * Valida se usuário tem acesso a uma ferramenta específica
   */
  validateToolAccess(userId: string, toolName: string): boolean {
    const permissions = this.getUserPermissions(userId);
    return permissions.tools.includes(toolName) || permissions.tools.includes('*');
  }

  /**
   * Obtém permissões do usuário (com fallback para permissões padrão)
   */
  getUserPermissions(userId: string): UserPermissions {
    if (this.userPermissions.has(userId)) {
      return this.userPermissions.get(userId)!;
    }

    // Permissões padrão
    const defaultPermissions: UserPermissions = {
      tools: ['createTask', 'updateTask', 'searchTasks', 'toggleTask', 'analyzeProductivity'],
      maxTokensPerRequest: 4000,
      allowedProviders: ['google', 'openrouter'],
      canUseStructuredOutput: true,
      canUseMCP: false
    };

    this.userPermissions.set(userId, defaultPermissions);
    return defaultPermissions;
  }

  /**
   * Define permissões customizadas para um usuário
   */
  setUserPermissions(userId: string, permissions: Partial<UserPermissions>) {
    const current = this.getUserPermissions(userId);
    const updated = { ...current, ...permissions };
    this.userPermissions.set(userId, updated);
  }

  /**
   * Verifica rate limiting para um usuário
   */
  checkRateLimit(userId: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;
    
    // Obter ou criar array de timestamps para o usuário
    let timestamps = this.rateLimits.get(userId) || [];
    
    // Remover timestamps antigos
    timestamps = timestamps.filter(ts => ts > windowStart);
    
    // Verificar se excedeu o limite
    const allowed = timestamps.length < this.config.rateLimitMaxRequests;
    
    if (allowed) {
      timestamps.push(now);
      this.rateLimits.set(userId, timestamps);
    }

    return {
      allowed,
      remaining: Math.max(0, this.config.rateLimitMaxRequests - timestamps.length),
      resetTime: windowStart + this.config.rateLimitWindow
    };
  }

  /**
   * Mascara dados sensíveis em objetos
   */
  static maskSensitiveData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password', 'passwd', 'pwd',
      'apikey', 'api_key', 'apiKey',
      'token', 'accessToken', 'access_token',
      'secret', 'secretKey', 'secret_key',
      'private', 'privateKey', 'private_key',
      'auth', 'authorization',
      'ssn', 'social_security',
      'credit_card', 'creditCard', 'card_number',
      'phone', 'phoneNumber', 'phone_number',
      'email', 'emailAddress', 'email_address'
    ];

    const sensitivePatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{16}\b/g, // Credit card
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, // Credit card with spaces
      /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, // Bearer tokens
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone number
    ];

    function maskValue(value: any): any {
      if (typeof value === 'string') {
        let masked = value;
        
        // Aplicar padrões de mascaramento
        for (const pattern of sensitivePatterns) {
          masked = masked.replace(pattern, '***MASKED***');
        }
        
        return masked;
      }
      
      if (Array.isArray(value)) {
        return value.map(maskValue);
      }
      
      if (typeof value === 'object' && value !== null) {
        const masked: any = {};
        
        for (const [key, val] of Object.entries(value)) {
          const keyLower = key.toLowerCase();
          
          if (sensitiveFields.some(field => keyLower.includes(field))) {
            masked[key] = '***MASKED***';
          } else {
            masked[key] = maskValue(val);
          }
        }
        
        return masked;
      }
      
      return value;
    }

    return maskValue(data);
  }

  /**
   * Valida se o output é seguro para retornar
   */
  static validateOutputSafety(output: any): {
    safe: boolean;
    issues: string[];
    sanitized?: any;
  } {
    const issues: string[] = [];
    
    if (!output) {
      return { safe: true, issues: [] };
    }

    const stringified = JSON.stringify(output);

    // Verificar padrões sensíveis
    const sensitivePatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, issue: 'SSN detected' },
      { pattern: /\b\d{16}\b/, issue: 'Credit card number detected' },
      { pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/, issue: 'API token detected' },
      { pattern: /password\s*[:=]\s*[^\s,}]+/i, issue: 'Password detected' },
      { pattern: /api[_-]?key\s*[:=]\s*[^\s,}]+/i, issue: 'API key detected' }
    ];

    for (const { pattern, issue } of sensitivePatterns) {
      if (pattern.test(stringified)) {
        issues.push(issue);
      }
    }

    const safe = issues.length === 0;
    const sanitized = safe ? output : this.maskSensitiveData(output);

    return { safe, issues, sanitized };
  }

  /**
   * Limpa dados de rate limiting antigos
   */
  cleanupRateLimits() {
    const now = Date.now();
    const cutoff = now - this.config.rateLimitWindow;

    for (const [userId, timestamps] of this.rateLimits.entries()) {
      const filtered = timestamps.filter(ts => ts > cutoff);
      
      if (filtered.length === 0) {
        this.rateLimits.delete(userId);
      } else {
        this.rateLimits.set(userId, filtered);
      }
    }
  }

  /**
   * Obtém estatísticas de segurança
   */
  getSecurityStats(): {
    totalUsers: number;
    activeRateLimits: number;
    averageRequestsPerUser: number;
  } {
    const totalUsers = this.userPermissions.size;
    const activeRateLimits = this.rateLimits.size;
    
    let totalRequests = 0;
    for (const timestamps of this.rateLimits.values()) {
      totalRequests += timestamps.length;
    }
    
    const averageRequestsPerUser = activeRateLimits > 0 ? totalRequests / activeRateLimits : 0;

    return {
      totalUsers,
      activeRateLimits,
      averageRequestsPerUser
    };
  }
}

// Instância singleton
export const securityManager = SecurityManager.getInstance();