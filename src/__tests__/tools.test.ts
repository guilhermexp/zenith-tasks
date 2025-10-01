import { z } from 'zod';

import { analysisTools } from '@/server/ai/tools/analysis-tools';
import { taskTools } from '@/server/ai/tools/task-tools';

describe('AI Tools', () => {
  describe('Task Tools', () => {
    it('should have createTask tool with correct schema', () => {
      const tool = taskTools.createTask;

      expect(tool).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
      expect(tool.description).toBe('Cria uma nova tarefa no sistema com informações detalhadas');
    });

    it('should execute createTask correctly', async () => {
      const result = await taskTools.createTask.execute({
        title: 'Test Task',
        type: 'Tarefa',
        priority: 'medium'
      });

      expect(result.created).toBe(true);
      expect(result.message).toContain('Test Task');
      expect(result.task.title).toBe('Test Task');
    });

    it('should have updateTask tool', () => {
      const tool = taskTools.updateTask;

      expect(tool).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should have searchTasks tool', () => {
      const tool = taskTools.searchTasks;

      expect(tool).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should execute searchTasks correctly', async () => {
      const result = await taskTools.searchTasks.execute({
        query: 'test',
        limit: 10,
        sortBy: 'createdAt'
      });

      expect(result.tasks).toBeDefined();
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(result.message).toContain('tarefa(s) encontrada(s)');
    });
  });

  describe('Analysis Tools', () => {
    it('should have analyzeProductivity tool', () => {
      const tool = analysisTools.analyzeProductivity;

      expect(tool).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
      expect(tool.description).toBe('Analisa métricas de produtividade e fornece insights personalizados');
    });

    it('should execute analyzeProductivity correctly', async () => {
      const result = await analysisTools.analyzeProductivity.execute({
        period: 'week',
        includeCompleted: true,
        includeOverdue: true
      });

      expect(result.metrics).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should have generateReport tool', () => {
      const tool = analysisTools.generateReport;

      expect(tool).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should execute generateReport correctly', async () => {
      const result = await analysisTools.generateReport.execute({
        type: 'weekly',
        includeCharts: false,
        format: 'summary'
      });

      expect(result.report).toBeDefined();
      expect(result.report.title).toContain('Semanal');
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should have findPatterns tool', () => {
      const tool = analysisTools.findPatterns;

      expect(tool).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should execute findPatterns correctly', async () => {
      const result = await analysisTools.findPatterns.execute({
        analysisType: 'completion',
        lookbackDays: 30,
        minOccurrences: 3
      });

      expect(result.patterns).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('Tool Input Validation', () => {
    it('should validate createTask inputs', () => {
      const schema = taskTools.createTask.inputSchema;

      const validInput = {
        title: 'Valid Task',
        type: 'Tarefa',
        priority: 'high'
      };

      const result = schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid task type', () => {
      const schema = taskTools.createTask.inputSchema;

      const invalidInput = {
        title: 'Invalid Task',
        type: 'InvalidType', // Invalid
        priority: 'high'
      };

      const result = schema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate analyzeProductivity inputs', () => {
      const schema = analysisTools.analyzeProductivity.inputSchema;

      const validInput = {
        period: 'month',
        includeCompleted: true,
        includeOverdue: false
      };

      const result = schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });
});