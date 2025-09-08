# MCP Marketplace Architecture for Zenith Tasks

## Vision
Transform Zenith Tasks into a dynamic MCP marketplace where users can:
- Browse and connect to any MCP server
- Authenticate with their own credentials per service
- Manage multiple server connections simultaneously
- Execute tools from different servers seamlessly

## Current Limitations of mcp-use SDK
- Python-based (our app is TypeScript/Next.js)
- No built-in marketplace or registry
- Basic authentication (environment variables)
- Server configuration via static JSON files

## Proposed Architecture

### 1. Hybrid Approach: TypeScript Client + Python Bridge

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Next.js)              │
├─────────────────────────────────────────────────┤
│  • Server Marketplace UI                         │
│  • Authentication Forms                          │
│  • Tool Execution Interface                      │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│              API Routes (Next.js)                │
├─────────────────────────────────────────────────┤
│  /api/mcp/marketplace   - List available servers │
│  /api/mcp/connect       - Connect to server      │
│  /api/mcp/authenticate  - Store user credentials │
│  /api/mcp/execute       - Execute tool           │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│          MCP Bridge Service (Python)             │
├─────────────────────────────────────────────────┤
│  • mcp-use SDK integration                       │
│  • Dynamic server management                     │
│  • Credential isolation per user                 │
│  • WebSocket/SSE for real-time updates          │
└─────────────────────────────────────────────────┘
```

### 2. Server Registry & Marketplace

```typescript
interface MCPServerDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: 'productivity' | 'development' | 'data' | 'ai' | 'automation'
  provider: string
  connectionType: 'http' | 'command' | 'websocket'
  authMethod: 'none' | 'api-key' | 'oauth2' | 'basic'
  authConfig?: {
    oauthUrl?: string
    tokenUrl?: string
    scopes?: string[]
    apiKeyField?: string
  }
  configSchema: object // JSON Schema for server-specific config
  tools: Array<{
    name: string
    description: string
    parameters: object
  }>
}
```

### 3. User Authentication Flow

```typescript
interface UserServerConnection {
  userId: string
  serverId: string
  credentials: {
    type: 'api-key' | 'oauth-token' | 'basic'
    encryptedData: string // Encrypted with user-specific key
  }
  config: Record<string, any> // Server-specific config
  connectedAt: Date
  lastUsed: Date
  status: 'connected' | 'error' | 'pending'
}
```

### 4. Implementation Steps

#### Phase 1: Python Bridge Service
```python
# mcp_bridge_service.py
from fastapi import FastAPI, HTTPException
from mcp_use import MCPClient, MCPAgent
import asyncio
from typing import Dict, Any

app = FastAPI()

class UserMCPManager:
    def __init__(self):
        self.user_clients: Dict[str, Dict[str, MCPClient]] = {}
    
    async def connect_server(self, user_id: str, server_id: str, config: Dict[str, Any]):
        """Connect user to specific MCP server with their credentials"""
        if user_id not in self.user_clients:
            self.user_clients[user_id] = {}
        
        # Build config with user's credentials
        server_config = self._build_config(server_id, config)
        client = MCPClient.from_dict(server_config)
        
        self.user_clients[user_id][server_id] = client
        return {"status": "connected", "tools": await client.list_tools()}
    
    async def execute_tool(self, user_id: str, server_id: str, tool: str, params: Dict):
        """Execute tool on user's connected server"""
        client = self.user_clients.get(user_id, {}).get(server_id)
        if not client:
            raise HTTPException(404, "Server not connected")
        
        return await client.call_tool(tool, params)

manager = UserMCPManager()

@app.post("/connect/{user_id}/{server_id}")
async def connect_server(user_id: str, server_id: str, config: Dict[str, Any]):
    return await manager.connect_server(user_id, server_id, config)

@app.post("/execute/{user_id}/{server_id}/{tool}")
async def execute_tool(user_id: str, server_id: str, tool: str, params: Dict):
    return await manager.execute_tool(user_id, server_id, tool, params)
```

#### Phase 2: Next.js Integration

```typescript
// src/services/mcp/marketplace.ts
export class MCPMarketplace {
  private bridgeUrl = process.env.MCP_BRIDGE_URL || 'http://localhost:8000'
  
  async connectServer(serverId: string, credentials: any) {
    const userId = await this.getCurrentUserId()
    
    // Encrypt credentials before sending
    const encryptedCreds = await this.encryptCredentials(credentials)
    
    const response = await fetch(`${this.bridgeUrl}/connect/${userId}/${serverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentials: encryptedCreds,
        config: this.getServerConfig(serverId)
      })
    })
    
    return response.json()
  }
  
  async executeTool(serverId: string, tool: string, params: any) {
    const userId = await this.getCurrentUserId()
    
    const response = await fetch(`${this.bridgeUrl}/execute/${userId}/${serverId}/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    
    return response.json()
  }
}
```

#### Phase 3: Marketplace UI Component

```tsx
// src/components/MCPMarketplace.tsx
export function MCPMarketplace() {
  const [servers, setServers] = useState<MCPServerDefinition[]>([])
  const [connected, setConnected] = useState<string[]>([])
  
  const handleConnect = async (server: MCPServerDefinition) => {
    // Show auth modal based on server.authMethod
    const credentials = await showAuthModal(server)
    
    // Connect to server
    const result = await marketplace.connectServer(server.id, credentials)
    
    if (result.status === 'connected') {
      setConnected([...connected, server.id])
      toast.success(`Connected to ${server.name}`)
    }
  }
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {servers.map(server => (
        <ServerCard
          key={server.id}
          server={server}
          connected={connected.includes(server.id)}
          onConnect={() => handleConnect(server)}
        />
      ))}
    </div>
  )
}
```

### 5. Security Considerations

#### Credential Storage
- User credentials encrypted with user-specific key
- Stored in secure database (not localStorage)
- Refresh tokens handled server-side
- OAuth tokens refreshed automatically

#### Isolation
- Each user has isolated MCP client instances
- No credential sharing between users
- Rate limiting per user per server
- Audit logs for all tool executions

#### Communication
- HTTPS for all API calls
- WebSocket with authentication for real-time
- Request signing for sensitive operations

### 6. Server Registry Examples

```json
{
  "servers": [
    {
      "id": "github",
      "name": "GitHub",
      "description": "Access GitHub repositories, issues, and PRs",
      "icon": "🐙",
      "category": "development",
      "authMethod": "oauth2",
      "authConfig": {
        "oauthUrl": "https://github.com/login/oauth/authorize",
        "tokenUrl": "https://github.com/login/oauth/access_token",
        "scopes": ["repo", "user"]
      },
      "tools": [
        {
          "name": "create_issue",
          "description": "Create a new issue in a repository",
          "parameters": {
            "repo": "string",
            "title": "string",
            "body": "string"
          }
        }
      ]
    },
    {
      "id": "notion",
      "name": "Notion",
      "description": "Manage Notion pages and databases",
      "icon": "📝",
      "category": "productivity",
      "authMethod": "api-key",
      "authConfig": {
        "apiKeyField": "NOTION_API_KEY"
      }
    },
    {
      "id": "filesystem",
      "name": "Local Filesystem",
      "description": "Access local files (sandboxed)",
      "icon": "📁",
      "category": "development",
      "authMethod": "none",
      "connectionType": "command"
    }
  ]
}
```

### 7. Benefits of This Architecture

✅ **User Autonomy**: Each user manages their own credentials
✅ **Scalability**: Can add unlimited MCP servers to marketplace
✅ **Security**: Credentials isolated and encrypted per user
✅ **Flexibility**: Support multiple auth methods (OAuth, API keys, etc)
✅ **Discovery**: Users can browse and connect to new servers easily
✅ **Integration**: Seamlessly use tools from multiple servers in tasks

### 8. Development Roadmap

**Week 1: Foundation**
- [ ] Setup Python FastAPI bridge service
- [ ] Implement basic mcp-use integration
- [ ] Create server registry JSON

**Week 2: Authentication**
- [ ] Build auth modal components
- [ ] Implement credential encryption
- [ ] Add OAuth2 flow support

**Week 3: Marketplace UI**
- [ ] Design server cards
- [ ] Implement search/filter
- [ ] Add connection management

**Week 4: Integration**
- [ ] Connect to Zenith Tasks workflow
- [ ] Add tool execution in assistant
- [ ] Test with multiple servers

### 9. Alternative: Pure TypeScript Implementation

If we want to avoid Python dependency, we could:
1. Port mcp-use core functionality to TypeScript
2. Use existing MCP TypeScript SDK (if available)
3. Implement MCP protocol directly

```typescript
// Pure TS implementation sketch
class MCPClient {
  async connectHTTP(url: string, auth: any) {
    // Implement SSE/WebSocket connection
  }
  
  async connectCommand(command: string, args: string[]) {
    // Use child_process to spawn server
  }
  
  async callTool(name: string, params: any) {
    // Send JSON-RPC request
  }
}
```

## Conclusion

This architecture enables Zenith Tasks to become a true MCP marketplace where users can:
- Connect their own accounts to any MCP server
- Maintain personal authentication per service
- Execute tools from multiple servers in one interface
- Build complex workflows across different services

The hybrid Python/TypeScript approach leverages the mature mcp-use SDK while maintaining our Next.js frontend.