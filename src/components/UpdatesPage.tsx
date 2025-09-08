'use client';

import React, { useMemo } from 'react';
import type { MindFlowItem, ActivityLogEntry } from '../types';
import { 
  CheckCircleIcon, PlusIcon
} from './Icons';

interface UpdatesPageProps {
  items: MindFlowItem[];
  activityLog?: ActivityLogEntry[];
  onSelectItem: (item: MindFlowItem) => void;
}

const UpdatesPage: React.FC<UpdatesPageProps> = ({ 
  items, 
  activityLog = [], 
  onSelectItem 
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
    <div className="h-full flex flex-col glass-card">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <h1 className="text-2xl font-bold text-neutral-100">Atualizações</h1>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-auto overscroll-contain p-6">
        <div className="space-y-1">
          {generatedActivityLog.length > 0 ? (
            generatedActivityLog.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-neutral-900/50 rounded-lg transition-colors group">
                <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <PlusIcon className="w-3 h-3 text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {activity.message}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-neutral-500">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                    <p className="text-xs text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-neutral-500">
              <p className="text-sm">Nenhuma atividade recente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdatesPage;
