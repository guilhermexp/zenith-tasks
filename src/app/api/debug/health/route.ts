import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    };
    auth: {
      status: 'ok' | 'error';
      userId?: string;
      error?: string;
    };
    ai: {
      status: 'ok' | 'error';
      provider?: string;
      error?: string;
    };
    mcp: {
      status: 'ok' | 'error';
      servers?: number;
      error?: string;
    };
  };
  environment: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'ok' },
      auth: { status: 'ok' },
      ai: { status: 'ok' },
      mcp: { status: 'ok' }
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }
  };

  // Check database connection
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const dbStart = Date.now();
      const { error } = await supabase.from('items').select('count', { count: 'exact', head: true });
      const latency = Date.now() - dbStart;

      if (error) {
        health.services.database.status = 'error';
        health.services.database.error = error.message;
        health.status = 'degraded';
      } else {
        health.services.database.latency = latency;
      }
    } else {
      health.services.database.status = 'error';
      health.services.database.error = 'Database configuration missing';
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.database.status = 'error';
    health.services.database.error = error instanceof Error ? error.message : 'Unknown error';
    health.status = 'degraded';
  }

  // Check auth status
  try {
    const { userId } = await auth();
    if (userId) {
      health.services.auth.userId = userId;
    } else {
      health.services.auth.status = 'error';
      health.services.auth.error = 'No user session';
    }
  } catch (error) {
    health.services.auth.status = 'error';
    health.services.auth.error = error instanceof Error ? error.message : 'Auth check failed';
    health.status = 'degraded';
  }

  // Check AI provider configuration
  try {
    const provider = process.env.AI_SDK_PROVIDER;
    if (!provider) {
      health.services.ai.status = 'error';
      health.services.ai.error = 'AI_SDK_PROVIDER not configured';
      health.status = 'degraded';
    } else {
      health.services.ai.provider = provider;

      // Check provider-specific API keys
      if (provider === 'google' && !process.env.GEMINI_API_KEY) {
        health.services.ai.status = 'error';
        health.services.ai.error = 'GEMINI_API_KEY not configured';
        health.status = 'degraded';
      } else if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
        health.services.ai.status = 'error';
        health.services.ai.error = 'OPENROUTER_API_KEY not configured';
        health.status = 'degraded';
      }
    }
  } catch (error) {
    health.services.ai.status = 'error';
    health.services.ai.error = error instanceof Error ? error.message : 'AI provider check failed';
    health.status = 'degraded';
  }

  // Check MCP servers
  try {
    const mcpServersPath = process.env.MCP_SERVERS_CONFIG_PATH;
    if (mcpServersPath) {
      // Try to count configured servers
      const fs = await import('fs').then(m => m.promises);
      const configContent = await fs.readFile(mcpServersPath, 'utf-8');
      const config = JSON.parse(configContent);
      health.services.mcp.servers = Object.keys(config.servers || {}).length;
    } else {
      health.services.mcp.status = 'error';
      health.services.mcp.error = 'MCP servers config path not set';
    }
  } catch (error) {
    health.services.mcp.status = 'error';
    health.services.mcp.error = error instanceof Error ? error.message : 'MCP check failed';
  }

  // Determine overall health
  const errorServices = Object.values(health.services).filter(s => s.status === 'error');
  if (errorServices.length >= 2) {
    health.status = 'unhealthy';
  } else if (errorServices.length === 1) {
    health.status = 'degraded';
  }

  const responseTime = Date.now() - startTime;

  return NextResponse.json({
    ...health,
    responseTime
  }, {
    status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 500,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service, test } = body;

    // Perform specific service tests
    const results: any = {
      timestamp: new Date().toISOString(),
      service,
      test
    };

    if (service === 'database' && test === 'write') {
      // Test database write
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const testItem = {
          id: `test-${Date.now()}`,
          title: 'Health check test item',
          type: 'Nota' as const,
          completed: false,
          createdAt: new Date().toISOString()
        };

        const { data, error: insertError } = await supabase
          .from('items')
          .insert([testItem])
          .select()
          .single();

        if (insertError) {
          results.error = insertError.message;
          results.success = false;
        } else {
          // Clean up test item
          await supabase.from('items').delete().eq('id', testItem.id);
          results.success = true;
          results.data = data;
        }
      } else {
        results.error = 'Database not configured';
        results.success = false;
      }
    } else if (service === 'ai' && test === 'generate') {
      // Test AI generation
      const provider = process.env.AI_SDK_PROVIDER;
      if (provider === 'google' && process.env.GEMINI_API_KEY) {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY);
        results.success = response.ok;
        if (!response.ok) {
          results.error = `API returned ${response.status}`;
        }
      } else if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
          }
        });
        results.success = response.ok;
        if (!response.ok) {
          results.error = `API returned ${response.status}`;
        }
      } else {
        results.error = 'AI provider not configured properly';
        results.success = false;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}