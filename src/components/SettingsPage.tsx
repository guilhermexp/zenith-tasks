"use client"
import React from 'react'
import type { McpServerConfig } from '@/services/mcp/types'
import { listTools, listServers, upsertServerApi, removeServerApi } from '@/services/mcp/client'

export default function SettingsPage() {
  const [servers, setServers] = React.useState<McpServerConfig[]>([])
  const [editing, setEditing] = React.useState<McpServerConfig | null>(null)
  const [toolsPreview, setToolsPreview] = React.useState<Record<string,string[]>>({})

  React.useEffect(()=>{ listServers().then(setServers).catch(()=> setServers([])) },[])

  const blank = (): McpServerConfig => ({ id: Date.now().toString(), name: '', baseUrl: '', apiKey: '', headersJson: '', toolsPath: '/tools', callPath: '/call' })

  const onSave = async () => {
    if (!editing) return
    if (!editing.name || !editing.baseUrl) return
    const res = await upsertServerApi(editing)
    setServers(res.list)
    setEditing(null)
  }

  const onTest = async (srv: McpServerConfig) => {
    try {
      const tools = await listTools(srv)
      setToolsPreview(prev => ({ ...prev, [srv.id]: tools.map(t => t.name) }))
    } catch (e:any) {
      setToolsPreview(prev => ({ ...prev, [srv.id]: [ 'Erro: ' + (e?.message||e) ] }))
    }
  }

  return (
    <div className="flex-1 glass-card p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-100 mb-4">Configurações</h1>
      <section className="mb-6">
        <h2 className="text-sm font-medium text-neutral-300 mb-2">Servidores MCP remotos</h2>
        <div className="space-y-2">
          {servers.map(srv => (
            <div key={srv.id} className="p-3 border border-neutral-800 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-200 font-medium">{srv.name}</p>
                  <p className="text-neutral-500 text-xs">{srv.baseUrl}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=> setEditing(srv)} className="px-2 py-1 text-xs bg-neutral-800 rounded">Editar</button>
                  <button onClick={async ()=> { await removeServerApi(srv.id); setServers((await listServers())) }} className="px-2 py-1 text-xs bg-neutral-900 rounded">Excluir</button>
                  <button onClick={()=> onTest(srv)} className="px-2 py-1 text-xs bg-neutral-700 rounded">Testar</button>
                </div>
              </div>
              {toolsPreview[srv.id] && (
                <div className="mt-2 text-xs text-neutral-400">
                  <p>Tools:</p>
                  <ul className="list-disc pl-5">
                    {toolsPreview[srv.id].map((t,i)=>(<li key={i}>{t}</li>))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={()=> setEditing(blank())} className="mt-3 px-3 py-1.5 text-sm bg-neutral-800 rounded">Novo servidor</button>
      </section>

      {editing && (
        <section className="p-3 border border-neutral-800 rounded-md">
          <h3 className="text-sm text-neutral-300 mb-2">Editar servidor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm" placeholder="Nome" value={editing.name} onChange={e=> setEditing({ ...editing, name: e.target.value })} />
            <input className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm" placeholder="Base URL (https://...)" value={editing.baseUrl} onChange={e=> setEditing({ ...editing, baseUrl: e.target.value })} />
            <input className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm" placeholder="API Key (opcional)" value={editing.apiKey||''} onChange={e=> setEditing({ ...editing, apiKey: e.target.value })} />
            <input className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm" placeholder='Headers extras JSON (opcional)' value={editing.headersJson||''} onChange={e=> setEditing({ ...editing, headersJson: e.target.value })} />
            <input className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm" placeholder='toolsPath (default /tools)' value={editing.toolsPath||''} onChange={e=> setEditing({ ...editing, toolsPath: e.target.value })} />
            <input className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm" placeholder='callPath (default /call)' value={editing.callPath||''} onChange={e=> setEditing({ ...editing, callPath: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={onSave} className="px-3 py-1.5 text-sm bg-neutral-800 rounded">Salvar</button>
            <button onClick={()=> setEditing(null)} className="px-3 py-1.5 text-sm bg-neutral-900 rounded">Cancelar</button>
          </div>
        </section>
      )}
    </div>
  )
}
