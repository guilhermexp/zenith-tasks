'use client';

// Clerk desabilitado - bypass de autenticação
// import { UserButton } from '@clerk/nextjs';
import { Activity, User } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import type { NavItem } from '../types';
import {
  PlusIcon, XIcon, MoreHorizontalIcon, SearchIcon,
  SettingsIcon, HelpCircleIcon, LogOutIcon, SoundWaveIcon, MicIcon,
  CalendarIcon
} from './Icons';

interface SidebarProps {
  navItems: NavItem[];
  activeItem: string;
  onSelectItem: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenTalkMode: () => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onOpenDebug?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navItems, activeItem, onSelectItem, isOpen, onClose, onOpenTalkMode, searchQuery, onSearch, onOpenDebug }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['reunioes']);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getIconTint = (_id: string, _active: boolean) => {
    // Keep a soft, consistent icon tint like the reference
    return 'text-neutral-300';
  };

  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => {
      if (item.isHeader) {
        // Section label styled like the reference (Favorites / Recent Chats)
        return (
          <li key={item.id} className="pt-4 pb-1 px-2">
            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">
              {item.label}
            </div>
          </li>
        );
      }

      const isActive = !searchQuery && activeItem === item.id;
      const isExpanded = expandedItems.includes(item.id);
      const hasChildren = item.children && item.children.length > 0;

      const handleItemClick = () => {
        if (hasChildren) {
          setExpandedItems(prev =>
            prev.includes(item.id)
              ? prev.filter(id => id !== item.id)
              : [...prev, item.id]
          );
        } else {
          onSelectItem(item.id);
        }
      };

      return (
        <React.Fragment key={item.id}>
          <li
            className={`flex items-center px-3 py-2 rounded-lg cursor-pointer relative transition-colors ${
              isActive ? 'bg-neutral-800/60 text-neutral-100' : 'hover:bg-white/5 text-neutral-300'
            }`}
            onClick={handleItemClick}
          >
            {item.icon && <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${getIconTint(item.id, isActive)}`} />}
            <span className="flex-1 text-sm">{item.label}</span>
            {hasChildren && (
              <span className="text-xs text-neutral-500 mr-2">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            {item.count !== undefined && item.count > 0 && (
              <span className="text-xs text-neutral-300 bg-neutral-800/60 px-1.5 py-0.5 rounded-full font-mono border border-white/5">{item.count}</span>
            )}
          </li>
          {hasChildren && isExpanded && (
            <ul className="space-y-0.5 mt-1">
              {(item.children || []).map((child) => {
                return (
                  <li
                    key={child.id}
                    className={`ml-6 pr-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors overflow-hidden ${
                      activeItem === child.id
                        ? 'bg-neutral-800/60'
                        : 'hover:bg-white/5'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(child.id);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CalendarIcon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span className="text-neutral-300 text-sm truncate" title={child.label}>{child.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 flex flex-col p-3 z-20
      transition-transform duration-300 ease-in-out
      w-64 md:relative md:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      bg-neutral-950/70 md:bg-neutral-950/60 md:border md:border-neutral-800/60 md:backdrop-blur-xl md:rounded-2xl
    `}>
        <div className="px-1 mb-3">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-neutral-300">Zenith Tasks</h2>
                <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectItem('caixa-entrada')}
                      className="p-1.5 rounded-md hover:bg-neutral-800/60 transition-colors"
                      title="Novo"
                    >
                        <PlusIcon className="w-4 h-4 text-neutral-400" />
                    </button>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-neutral-800 md:hidden">
                        <XIcon className="w-4 h-4 text-neutral-500" />
                    </button>
                </div>
            </div>
            {/* Search field */}
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                    className="w-full bg-neutral-900/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-600/40 transition-colors"
                />
            </div>
        </div>

      <div className="flex-1 pr-2">
        <nav className="space-y-1">
          <ul>{renderNavItems(navItems)}</ul>
        </nav>
      </div>

      <div ref={dropdownRef} className="mt-auto relative">
        <div className="flex items-center justify-between p-2">
            <button
              onClick={() => onOpenTalkMode()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-neutral-200 hover:bg-neutral-700"
            >
                <MicIcon className="w-4 h-4 text-neutral-400" />
                <span>Talk mode</span>
            </button>
            <div className="flex items-center gap-2">
              {onOpenDebug && (
                <button
                  onClick={onOpenDebug}
                  className="p-1.5 rounded-md hover:bg-neutral-700 transition-colors"
                  title="Debug Tools"
                >
                  <Activity className="w-5 h-5 text-neutral-400" />
                </button>
              )}
              {/* UserButton do Clerk removido - bypass ativo */}
              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                <User className="w-4 h-4 text-neutral-400" />
              </div>
            </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
