import { tool } from 'ai';
import { z } from 'zod';

import { analysisTools } from './analysis-tools';
import { appTools } from './app-tools';
import { taskTools } from './task-tools';

// Registry de todas as ferramentas
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema?: z.ZodSchema;
  execute: (input: any) => Promise<any>;
  category: string;
  onInputStart?: (data: any) => void;
  onInputDelta?: (data: any) => void;
  onInputAvailable?: (data: any) => void;
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, any> = new Map();
  private categories: Map<string, string[]> = new Map();

  private constructor() {
    this.registerDefaultTools();
  }

  static getInstance(): ToolRegistry {
    if (!this.instance) {
      this.instance = new ToolRegistry();
    }
    return this.instance;
  }

  private registerDefaultTools() {
    // Registrar ferramentas reais do app (prioridade)
    Object.entries(appTools).forEach(([name, tool]) => {
      this.registerTool(name, tool, 'app');
    });

    // Registrar ferramentas de tarefas (legacy/fallback)
    Object.entries(taskTools).forEach(([name, tool]) => {
      this.registerTool(name, tool, 'tasks');
    });

    // Registrar ferramentas de análise
    Object.entries(analysisTools).forEach(([name, tool]) => {
      this.registerTool(name, tool, 'analysis');
    });
  }

  registerTool(name: string, toolDef: any, category: string = 'general') {
    this.tools.set(name, toolDef);
    
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category)!.push(name);
  }

  getTool(name: string): any | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [name, tool] of this.tools.entries()) {
      result[name] = tool;
    }
    return result;
  }

  getToolsByCategory(category: string): Record<string, any> {
    const result: Record<string, any> = {};
    const toolNames = this.categories.get(category) || [];
    
    for (const name of toolNames) {
      const tool = this.tools.get(name);
      if (tool) {
        result[name] = tool;
      }
    }
    return result;
  }

  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  removeTool(name: string) {
    this.tools.delete(name);
    
    // Remover das categorias
    for (const [category, tools] of this.categories.entries()) {
      const index = tools.indexOf(name);
      if (index > -1) {
        tools.splice(index, 1);
      }
    }
  }

  clear() {
    this.tools.clear();
    this.categories.clear();
  }
}

// Função helper para obter todas as ferramentas
export function getAllTools(): Record<string, any> {
  return ToolRegistry.getInstance().getAllTools();
}

// Função helper para obter ferramentas por categoria
export function getToolsByCategory(category: string): Record<string, any> {
  return ToolRegistry.getInstance().getToolsByCategory(category);
}

// Exportar ferramentas específicas
export { appTools } from './app-tools';
export { taskTools } from './task-tools';
export { analysisTools } from './analysis-tools';