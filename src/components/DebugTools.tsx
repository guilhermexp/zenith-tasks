'use client';

import { X, Activity, Database, Brain, Server, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ServiceStatus {
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
  userId?: string;
  provider?: string;
  servers?: number;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime?: number;
  services: {
    database: ServiceStatus;
    auth: ServiceStatus;
    ai: ServiceStatus;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
}

interface DebugToolsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DebugTools({ isOpen, onClose }: DebugToolsProps) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      checkHealth();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      checkHealth();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/debug/health');
      const data = await response.json();
      setHealth(data);

      if (!response.ok && response.status !== 503) {
        setError(`Health check failed: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check health');
    } finally {
      setLoading(false);
    }
  };

  const runTest = async (service: string, test: string) => {
    const testKey = `${service}-${test}`;
    setTestResults(prev => ({ ...prev, [testKey]: { loading: true } }));

    try {
      const response = await fetch('/api/debug/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, test })
      });

      const result = await response.json();
      setTestResults(prev => ({
        ...prev,
        [testKey]: { ...result, loading: false }
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [testKey]: {
          error: err instanceof Error ? err.message : 'Test failed',
          loading: false
        }
      }));
    }
  };

  const getStatusIcon = (status: 'ok' | 'error') => {
    if (status === 'ok') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getOverallStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Debug Tools</h2>
            <div className={`w-3 h-3 rounded-full ${getOverallStatusColor(health?.status)}`} />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={checkHealth}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <label className="flex items-center gap-2 text-neutral-300">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh (5s)
              </label>
            </div>

            {health && (
              <div className="text-sm text-neutral-400">
                Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                {health.responseTime && ` • ${health.responseTime}ms`}
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {health && (
            <>
              {/* Services */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Services</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Database */}
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-neutral-400" />
                        <span className="font-medium">Database</span>
                      </div>
                      {getStatusIcon(health.services.database.status)}
                    </div>
                    {health.services.database.latency && (
                      <div className="text-sm text-neutral-400">
                        Latency: {health.services.database.latency}ms
                      </div>
                    )}
                    {health.services.database.error && (
                      <div className="text-sm text-red-400 mt-2">
                        {health.services.database.error}
                      </div>
                    )}
                    <button
                      onClick={() => runTest('database', 'write')}
                      className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                      disabled={testResults['database-write']?.loading}
                    >
                      {testResults['database-write']?.loading ? 'Testing...' : 'Test Write'}
                    </button>
                    {testResults['database-write'] && !testResults['database-write'].loading && (
                      <div className={`mt-2 text-sm ${testResults['database-write'].success ? 'text-green-400' : 'text-red-400'}`}>
                        {testResults['database-write'].success ? '✓ Write test passed' : `✗ ${testResults['database-write'].error}`}
                      </div>
                    )}
                  </div>

                  {/* Auth */}
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-neutral-400" />
                        <span className="font-medium">Authentication</span>
                      </div>
                      {getStatusIcon(health.services.auth.status)}
                    </div>
                    {health.services.auth.userId && (
                      <div className="text-sm text-neutral-400">
                        User: {health.services.auth.userId.substring(0, 8)}...
                      </div>
                    )}
                    {health.services.auth.error && (
                      <div className="text-sm text-red-400 mt-2">
                        {health.services.auth.error}
                      </div>
                    )}
                  </div>

                  {/* AI */}
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-neutral-400" />
                        <span className="font-medium">AI Provider</span>
                      </div>
                      {getStatusIcon(health.services.ai.status)}
                    </div>
                    {health.services.ai.provider && (
                      <div className="text-sm text-neutral-400">
                        Provider: {health.services.ai.provider}
                      </div>
                    )}
                    {health.services.ai.error && (
                      <div className="text-sm text-red-400 mt-2">
                        {health.services.ai.error}
                      </div>
                    )}
                    <button
                      onClick={() => runTest('ai', 'generate')}
                      className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                      disabled={testResults['ai-generate']?.loading}
                    >
                      {testResults['ai-generate']?.loading ? 'Testing...' : 'Test API'}
                    </button>
                    {testResults['ai-generate'] && !testResults['ai-generate'].loading && (
                      <div className={`mt-2 text-sm ${testResults['ai-generate'].success ? 'text-green-400' : 'text-red-400'}`}>
                        {testResults['ai-generate'].success ? '✓ API test passed' : `✗ ${testResults['ai-generate'].error}`}
                      </div>
                    )}
                  </div>

                                  </div>
              </div>

              {/* Environment */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Environment</h3>
                <div className="bg-neutral-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Node Version:</span>
                    <span className="text-white">{health.environment.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Platform:</span>
                    <span className="text-white">{health.environment.platform}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Uptime:</span>
                    <span className="text-white">{formatUptime(health.environment.uptime)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Memory (Heap Used):</span>
                    <span className="text-white">{formatBytes(health.environment.memoryUsage.heapUsed)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Memory (Heap Total):</span>
                    <span className="text-white">{formatBytes(health.environment.memoryUsage.heapTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}