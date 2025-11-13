import { z } from 'zod';

// Esquemas de validação
const CreditTransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  amount: z.number(),
  type: z.enum(['purchase', 'usage', 'refund', 'bonus']),
  description: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
});

const UserCreditsSchema = z.object({
  userId: z.string(),
  balance: z.number().min(0),
  totalPurchased: z.number().min(0),
  totalUsed: z.number().min(0),
  lastUpdated: z.date(),
  subscription: z.object({
    active: z.boolean(),
    plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
    monthlyCredits: z.number().optional(),
    renewDate: z.date().optional(),
  }).optional(),
});

export type CreditTransaction = z.infer<typeof CreditTransactionSchema>;
export type UserCredits = z.infer<typeof UserCreditsSchema>;

// Custos por modelo (em créditos por 1000 tokens)
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI
  'openai/gpt-4o': { input: 5, output: 15 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai/gpt-4-turbo': { input: 10, output: 30 },

  // Anthropic
  'anthropic/claude-3-5-sonnet': { input: 3, output: 15 },
  'anthropic/claude-3-5-haiku': { input: 0.25, output: 1.25 },
  'anthropic/claude-3-opus': { input: 15, output: 75 },

  // Google
  'google/gemini-2.0-flash-exp': { input: 0.075, output: 0.3 },
  'google/gemini-1.5-pro': { input: 3.5, output: 10.5 },
  'google/gemini-1.5-flash': { input: 0.075, output: 0.3 },

  // Default fallback
  'default': { input: 1, output: 2 }
};

// Planos de assinatura
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    monthlyCredits: 100,
    price: 0,
    features: [
      '100 créditos mensais',
      'Modelos básicos',
      'Histórico de 7 dias'
    ]
  },
  basic: {
    name: 'Basic',
    monthlyCredits: 1000,
    price: 9.99,
    features: [
      '1.000 créditos mensais',
      'Todos os modelos',
      'Histórico de 30 dias',
      'Suporte prioritário'
    ]
  },
  pro: {
    name: 'Pro',
    monthlyCredits: 5000,
    price: 39.99,
    features: [
      '5.000 créditos mensais',
      'Todos os modelos',
      'Histórico ilimitado',
      'API access',
      'Suporte 24/7'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    monthlyCredits: -1, // Ilimitado
    price: -1, // Custom
    features: [
      'Créditos ilimitados',
      'Modelos customizados',
      'SLA garantido',
      'Suporte dedicado'
    ]
  }
};

export class CreditSystem {
  private static instance: CreditSystem;
  private userCredits: Map<string, UserCredits> = new Map();
  private transactions: CreditTransaction[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): CreditSystem {
    if (!this.instance) {
      this.instance = new CreditSystem();
    }
    return this.instance;
  }

  // Obter saldo de créditos do usuário
  getBalance(userId: string): number {
    const credits = this.userCredits.get(userId);
    if (!credits) {
      // Inicializar novo usuário com créditos gratuitos
      this.initializeUser(userId);
      return 100; // Créditos iniciais gratuitos
    }
    return credits.balance;
  }

  // Inicializar novo usuário
  private initializeUser(userId: string) {
    const newUser: UserCredits = {
      userId,
      balance: 100, // Créditos iniciais gratuitos
      totalPurchased: 0,
      totalUsed: 0,
      lastUpdated: new Date(),
      subscription: {
        active: true,
        plan: 'free',
        monthlyCredits: 100,
        renewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
      }
    };
    this.userCredits.set(userId, newUser);
    this.saveToStorage();
  }

  // Calcular custo de uso
  calculateUsageCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const costs = MODEL_COSTS[modelId] || MODEL_COSTS['default'];
    const inputCost = (inputTokens / 1000) * costs.input;
    const outputCost = (outputTokens / 1000) * costs.output;
    return Math.ceil(inputCost + outputCost); // Arredondar para cima
  }

  // Consumir créditos
  async consumeCredits(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const credits = this.userCredits.get(userId);

    if (!credits) {
      this.initializeUser(userId);
      return this.consumeCredits(userId, amount, description, metadata);
    }

    // Verificar saldo suficiente
    if (credits.balance < amount) {
      return {
        success: false,
        newBalance: credits.balance,
        error: 'Saldo insuficiente de créditos'
      };
    }

    // Deduzir créditos
    credits.balance -= amount;
    credits.totalUsed += amount;
    credits.lastUpdated = new Date();

    // Registrar transação
    const lastTs = this.transactions.length
      ? this.transactions[this.transactions.length - 1].createdAt.getTime()
      : Date.now();
    const transaction: CreditTransaction = {
      id: this.generateTransactionId(),
      userId,
      amount: -amount,
      type: 'usage',
      description,
      metadata,
      createdAt: new Date(lastTs + 1)
    };

    this.transactions.push(transaction);
    this.userCredits.set(userId, credits);
    this.saveToStorage();

    return {
      success: true,
      newBalance: credits.balance
    };
  }

  // Adicionar créditos (compra ou bônus)
  async addCredits(
    userId: string,
    amount: number,
    type: 'purchase' | 'bonus' | 'refund',
    description: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; newBalance: number }> {
    let credits = this.userCredits.get(userId);

    if (!credits) {
      this.initializeUser(userId);
      credits = this.userCredits.get(userId)!;
    }

    // Adicionar créditos
    credits.balance += amount;
    if (type === 'purchase') {
      credits.totalPurchased += amount;
    }
    credits.lastUpdated = new Date();

    // Registrar transação
    const lastTs = this.transactions.length
      ? this.transactions[this.transactions.length - 1].createdAt.getTime()
      : Date.now();
    const transaction: CreditTransaction = {
      id: this.generateTransactionId(),
      userId,
      amount,
      type,
      description,
      metadata,
      createdAt: new Date(lastTs + 1)
    };

    this.transactions.push(transaction);
    this.userCredits.set(userId, credits);
    this.saveToStorage();

    return {
      success: true,
      newBalance: credits.balance
    };
  }

  // Obter histórico de transações
  getTransactionHistory(userId: string, limit: number = 50): CreditTransaction[] {
    return this.transactions
      .filter(t => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Obter estatísticas de uso
  getUsageStats(userId: string) {
    const credits = this.userCredits.get(userId);
    if (!credits) {
      return null;
    }

    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTransactions = this.transactions.filter(
      t => t.userId === userId && t.createdAt > last30Days
    );

    const usage30Days = recentTransactions
      .filter(t => t.type === 'usage')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const purchases30Days = recentTransactions
      .filter(t => t.type === 'purchase')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      currentBalance: credits.balance,
      totalUsed: credits.totalUsed,
      totalPurchased: credits.totalPurchased,
      usage30Days,
      purchases30Days,
      subscription: credits.subscription,
      averageDailyUsage: usage30Days / 30
    };
  }

  // Atualizar assinatura
  updateSubscription(userId: string, plan: 'free' | 'basic' | 'pro' | 'enterprise') {
    let credits = this.userCredits.get(userId);

    if (!credits) {
      this.initializeUser(userId);
      credits = this.userCredits.get(userId)!;
    }

    const planDetails = SUBSCRIPTION_PLANS[plan];

    credits.subscription = {
      active: true,
      plan,
      monthlyCredits: planDetails.monthlyCredits,
      renewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    // Adicionar créditos mensais do plano
    if (planDetails.monthlyCredits > 0) {
      this.addCredits(
        userId,
        planDetails.monthlyCredits,
        'bonus',
        `Créditos mensais - Plano ${planDetails.name}`
      );
    }

    this.userCredits.set(userId, credits);
    this.saveToStorage();
  }

  // Renovar créditos mensais
  async renewMonthlyCredits(userId: string): Promise<boolean> {
    const credits = this.userCredits.get(userId);
    if (!credits || !credits.subscription?.active) {
      return false;
    }

    const now = new Date();
    if (credits.subscription.renewDate && credits.subscription.renewDate <= now) {
      const monthlyCredits = credits.subscription.monthlyCredits || 0;

      if (monthlyCredits > 0) {
        await this.addCredits(
          userId,
          monthlyCredits,
          'bonus',
          'Renovação mensal de créditos'
        );

        // Atualizar data de renovação
        credits.subscription.renewDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        this.userCredits.set(userId, credits);
        this.saveToStorage();

        return true;
      }
    }

    return false;
  }

  // Gerar ID de transação
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Persistência local
  private saveToStorage() {
    if (typeof window !== 'undefined') {
      try {
        if (typeof localStorage?.setItem === 'function') {
          localStorage.setItem('credit_users', JSON.stringify(Array.from(this.userCredits.entries())))
          localStorage.setItem('credit_transactions', JSON.stringify(this.transactions))
        }
      } catch {}
    }
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const canGet = typeof localStorage?.getItem === 'function'
        const usersData = canGet ? localStorage.getItem('credit_users') : null
        const transactionsData = canGet ? localStorage.getItem('credit_transactions') : null

        if (usersData) {
          const entries = JSON.parse(usersData)
          this.userCredits = new Map(entries.map(([k, v]: [string, any]) => [
            k,
            { ...v, lastUpdated: new Date(v.lastUpdated) }
          ]))
        }

        if (transactionsData) {
          this.transactions = JSON.parse(transactionsData).map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt)
          }))
        }
      } catch (error) {
        console.error('Error loading credit data:', error)
      }
    }
  }

  // Limpar dados (para testes)
  clearData() {
    this.userCredits.clear();
    this.transactions = [];
    if (typeof window !== 'undefined') {
      try {
        const ls: any = (window as any).localStorage;
        if (ls && typeof ls.removeItem === 'function') {
          ls.removeItem('credit_users');
          ls.removeItem('credit_transactions');
        }
      } catch {}
    }
  }
}
