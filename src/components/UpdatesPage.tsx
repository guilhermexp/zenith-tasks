'use client';

import React, { useMemo } from 'react';
import { Menu } from 'lucide-react';

import type { MindFlowItem, ActivityLogEntry } from '../types';
import {
  CheckCircleIcon, PlusIcon
} from './Icons';

interface UpdatesPageProps {
  items: MindFlowItem[];
  activityLog?: ActivityLogEntry[];
  onSelectItem: (item: MindFlowItem) => void;
  onToggleSidebar?: () => void;
}

const UpdatesPage: React.FC<UpdatesPageProps> = ({
  items,
  activityLog = [],
  onSelectItem,
  onToggleSidebar
}) => {
  // Generate activity log from items if not provided
  const generatedActivityLog = useMemo(() => {
    if (activityLog.length > 0) return activityLog;

    const activities: ActivityLogEntry[] = [];

    // Add recent creations
    items
      .slice(-20)
      .forEach(item => {
        activities.push({
          id: `created-${item.id}`,
          timestamp: new Date(item.createdAt).toISOString(),
          message: `Você criou: "${item.title}"`,
          icon: PlusIcon
        });
      });

    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [items, activityLog]);

  // Format timestamp like in the image
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  // Format relative time for "agora"
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 5) return 'agora';
    return formatTimestamp(timestamp);
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="px-4 h-12 flex items-center gap-3 border-b border-white/5">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 -ml-1.5 rounded-md hover:bg-white/10 text-zinc-400"
          >
            <Menu size={20} />
          </button>
        )}
        <h1 className="text-base font-medium text-zinc-100">Atualizações</h1>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-auto overscroll-contain p-4">
        <div className="space-y-1">
          {generatedActivityLog.length > 0 ? (
            generatedActivityLog.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors group">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <PlusIcon className="w-3 h-3 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {activity.message}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-zinc-500">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                    <p className="text-xs text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-sm">Nenhuma atividade recente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdatesPage;
