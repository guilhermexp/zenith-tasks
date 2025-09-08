'use client'

import React, { useState, useEffect } from 'react'
import { marketplaceServers, type MCPMarketplaceServer } from '@/services/mcp/marketplace-registry'
import { upsertServerApi, listServers } from '@/services/mcp/client'
import type { McpServerConfig } from '@/services/mcp/types'

interface AuthModalProps {
  server: MCPMarketplaceServer
  isOpen: boolean
  onClose: () => void
  onConnect: (credentials: any) => void
}

const AuthModal: React.FC<AuthModalProps> = ({ server, isOpen, onClose, onConnect }) => {
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  
  if (!isOpen) return null
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConnect(credentials)
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-xl p-6 max-w-md w-full border border-neutral-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{server.icon}</span>
            <h2 className="text-xl font-semibold text-neutral-100">{server.name}</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {server.authMethod === 'oauth2' ? (
            <div className="text-center py-8">
              <p className="text-neutral-400 mb-4">
                Click below to authenticate with {server.name}
              </p>
              <button
                type="button"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                onClick={() => {
                  // In production, this would open OAuth flow
                  window.open(server.authConfig?.oauthUrl, '_blank')
                  alert('OAuth flow would open here. For demo, enter any token.')
                }}
              >
                Connect with {server.name}
              </button>
              <input
                type="text"
                placeholder="Paste token here after auth"
                className="mt-4 w-full px-4 py-2 bg-neutral-800 rounded-lg text-neutral-100 placeholder:text-neutral-500"
                onChange={(e) => setCredentials({ accessToken: e.target.value })}
              />
            </div>
          ) : (
            <>
              {server.requiredFields?.map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      className="w-full px-4 py-2 bg-neutral-800 rounded-lg text-neutral-100 border border-neutral-700 focus:border-neutral-600"
                      onChange={(e) => setCredentials({ ...credentials, [field.name]: e.target.value })}
                      required
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2 bg-neutral-800 rounded-lg text-neutral-100 placeholder:text-neutral-500 border border-neutral-700 focus:border-neutral-600"
                      onChange={(e) => setCredentials({ ...credentials, [field.name]: e.target.value })}
                      required
                    />
                  )}
                  {field.description && (
                    <p className="text-xs text-neutral-500 mt-1">{field.description}</p>
                  )}
                </div>
              ))}
            </>
          )}
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
              disabled={server.authMethod !== 'none' && Object.keys(credentials).length === 0}
            >
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ServerCardProps {
  server: MCPMarketplaceServer
  isConnected: boolean
  onConnect: () => void
  onDisconnect: () => void
}

const ServerCard: React.FC<ServerCardProps> = ({ server, isConnected, onConnect, onDisconnect }) => {
  const categoryColors = {
    productivity: 'bg-blue-900/20 text-blue-400 border-blue-800',
    development: 'bg-purple-900/20 text-purple-400 border-purple-800',
    data: 'bg-green-900/20 text-green-400 border-green-800',
    ai: 'bg-yellow-900/20 text-yellow-400 border-yellow-800',
    automation: 'bg-orange-900/20 text-orange-400 border-orange-800',
    communication: 'bg-pink-900/20 text-pink-400 border-pink-800'
  }
  
  return (
    <div className="bg-neutral-900/50 rounded-xl p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{server.icon}</span>
          <div>
            <h3 className="text-lg font-semibold text-neutral-100">{server.name}</h3>
            <p className="text-xs text-neutral-500">{server.provider}</p>
          </div>
        </div>
        {isConnected && (
          <span className="px-2 py-1 bg-green-900/20 text-green-400 text-xs rounded-full border border-green-800">
            Connected
          </span>
        )}
      </div>
      
      <p className="text-sm text-neutral-400 mb-4">{server.description}</p>
      
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-1 text-xs rounded-full border ${categoryColors[server.category]}`}>
          {server.category}
        </span>
        <span className="px-2 py-1 bg-neutral-800 text-neutral-400 text-xs rounded-full">
          {server.authMethod === 'none' ? 'No auth' : server.authMethod}
        </span>
      </div>
      
      {server.capabilities && server.capabilities.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-neutral-500 mb-2">Capabilities:</p>
          <div className="flex flex-wrap gap-1">
            {server.capabilities.slice(0, 3).map((cap, idx) => (
              <span key={idx} className="text-xs text-neutral-400 bg-neutral-800 px-2 py-1 rounded">
                {cap}
              </span>
            ))}
            {server.capabilities.length > 3 && (
              <span className="text-xs text-neutral-500">+{server.capabilities.length - 3} more</span>
            )}
          </div>
        </div>
      )}
      
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          isConnected 
            ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30 border border-red-800'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isConnected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  )
}

export const MCPMarketplace: React.FC = () => {
  const [connectedServers, setConnectedServers] = useState<string[]>([])
  const [authModalServer, setAuthModalServer] = useState<MCPMarketplaceServer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadConnectedServers()
  }, [])
  
  const loadConnectedServers = async () => {
    try {
      const servers = await listServers()
      setConnectedServers(servers.map(s => s.id))
    } catch (error) {
      console.error('Failed to load servers:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleConnect = async (server: MCPMarketplaceServer, credentials: any) => {
    try {
      const config: McpServerConfig = {
        id: server.id,
        name: server.name,
        baseUrl: server.defaultConfig?.url || '',
        callPath: server.defaultConfig?.callPath || '/call',
        ...credentials
      }
      
      await upsertServerApi(config)
      setConnectedServers([...connectedServers, server.id])
      setAuthModalServer(null)
    } catch (error) {
      console.error('Failed to connect server:', error)
      alert('Failed to connect. Please check your credentials.')
    }
  }
  
  const handleDisconnect = async (serverId: string) => {
    try {
      // In production, would call removeServerApi
      setConnectedServers(connectedServers.filter(id => id !== serverId))
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }
  
  const filteredServers = marketplaceServers.filter(server => {
    const matchesSearch = searchQuery === '' || 
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory
    return matchesSearch && matchesCategory
  })
  
  const categories = ['all', 'productivity', 'development', 'data', 'ai', 'automation', 'communication']
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 pb-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-100 mb-2">MCP Marketplace</h1>
          <p className="text-neutral-400">Connect real MCP servers to extend Zenith Tasks capabilities</p>
          <p className="text-xs text-neutral-500 mt-2">All servers listed here are real and can be installed via npm</p>
        </div>
      
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Search servers..."
          className="w-full px-4 py-3 bg-neutral-900 rounded-lg text-neutral-100 placeholder:text-neutral-500 border border-neutral-800 focus:border-neutral-700"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Connected Servers Summary */}
      {connectedServers.length > 0 && (
        <div className="mx-6 mb-4 p-4 bg-green-900/10 border border-green-800 rounded-lg">
          <p className="text-green-400 text-sm">
            {connectedServers.length} server{connectedServers.length !== 1 ? 's' : ''} connected
          </p>
        </div>
      )}
      </div>
      
      {/* Scrollable Server Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-400"></div>
            <p className="text-neutral-400 mt-4">Loading marketplace...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServers.map(server => (
              <ServerCard
                key={server.id}
                server={server}
                isConnected={connectedServers.includes(server.id)}
                onConnect={() => setAuthModalServer(server)}
                onDisconnect={() => handleDisconnect(server.id)}
              />
            ))}
          </div>
        )}
        
        {filteredServers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-400">No servers found matching your criteria</p>
          </div>
        )}
      </div>
      
      {/* Auth Modal */}
      {authModalServer && (
        <AuthModal
          server={authModalServer}
          isOpen={!!authModalServer}
          onClose={() => setAuthModalServer(null)}
          onConnect={(creds) => handleConnect(authModalServer, creds)}
        />
      )}
    </div>
  )
}

export default MCPMarketplace