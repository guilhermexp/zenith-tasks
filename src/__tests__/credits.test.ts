import { CreditSystem, MODEL_COSTS } from '@/services/credits/credit-system';

describe('CreditSystem', () => {
  let creditSystem: CreditSystem;

  beforeEach(() => {
    creditSystem = CreditSystem.getInstance();
    creditSystem.clearData(); // Limpar dados antes de cada teste
  });

  afterEach(() => {
    creditSystem.clearData();
  });

  describe('User Initialization', () => {
    it('should initialize new user with 100 free credits', () => {
      const userId = 'test-user-1';
      const balance = creditSystem.getBalance(userId);

      expect(balance).toBe(100);
    });

    it('should persist user data', () => {
      const userId = 'test-user-2';
      creditSystem.getBalance(userId);

      const balanceAgain = creditSystem.getBalance(userId);
      expect(balanceAgain).toBe(100);
    });
  });

  describe('Credit Consumption', () => {
    it('should consume credits correctly', async () => {
      const userId = 'test-user-3';
      creditSystem.getBalance(userId); // Initialize

      const result = await creditSystem.consumeCredits(userId, 20, 'Test usage');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(80);
    });

    it('should fail when insufficient credits', async () => {
      const userId = 'test-user-4';
      creditSystem.getBalance(userId); // Initialize with 100

      const result = await creditSystem.consumeCredits(userId, 150, 'Test usage');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Saldo insuficiente de créditos');
      expect(result.newBalance).toBe(100);
    });
  });

  describe('Credit Addition', () => {
    it('should add credits correctly', async () => {
      const userId = 'test-user-5';
      creditSystem.getBalance(userId); // Initialize

      const result = await creditSystem.addCredits(
        userId,
        50,
        'purchase',
        'Test purchase'
      );

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(150);
    });
  });

  describe('Usage Cost Calculation', () => {
    it('should calculate cost for GPT-4o correctly', () => {
      const cost = creditSystem.calculateUsageCost(
        'openai/gpt-4o',
        1000, // 1k input tokens
        1000  // 1k output tokens
      );

      expect(cost).toBe(20); // 5 + 15 = 20
    });

    it('should calculate cost for Gemini Flash correctly', () => {
      const cost = creditSystem.calculateUsageCost(
        'google/gemini-2.0-flash-exp',
        1000,
        1000
      );

      expect(cost).toBe(1); // 0.075 + 0.3 = 0.375, rounded up to 1
    });

    it('should use default costs for unknown models', () => {
      const cost = creditSystem.calculateUsageCost(
        'unknown/model',
        1000,
        1000
      );

      expect(cost).toBe(3); // 1 + 2 = 3
    });
  });

  describe('Transaction History', () => {
    it('should record transactions correctly', async () => {
      const userId = 'test-user-6';
      creditSystem.getBalance(userId);

      await creditSystem.consumeCredits(userId, 10, 'Usage 1');
      await creditSystem.addCredits(userId, 20, 'bonus', 'Bonus credits');

      const history = creditSystem.getTransactionHistory(userId);

      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('bonus');
      expect(history[0].amount).toBe(20);
      expect(history[1].type).toBe('usage');
      expect(history[1].amount).toBe(-10);
    });
  });

  describe('Usage Statistics', () => {
    it('should calculate usage stats correctly', async () => {
      const userId = 'test-user-7';
      creditSystem.getBalance(userId);

      await creditSystem.consumeCredits(userId, 25, 'Test usage');

      const stats = creditSystem.getUsageStats(userId);

      expect(stats?.currentBalance).toBe(75);
      expect(stats?.totalUsed).toBe(25);
      expect(stats?.totalPurchased).toBe(0);
    });
  });

  describe('Subscription Management', () => {
    it('should update subscription correctly', () => {
      const userId = 'test-user-8';
      creditSystem.getBalance(userId);

      creditSystem.updateSubscription(userId, 'basic');

      const stats = creditSystem.getUsageStats(userId);
      expect(stats?.subscription?.plan).toBe('basic');
    });
  });
});