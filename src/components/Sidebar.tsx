'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, Plus, Search, X, Settings, LogOut, Calendar } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import type { NavItem } from '../types';

interface SidebarProps {
  navItems: NavItem[];
  activeItem: string;
  onSelectItem: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenTalkMode: () => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onLogout?: () => void;
  isMobile?: boolean;
  width?: number;
  onResize?: (width: number) => void;
}

const NavItemComponent = ({
  icon: Icon,
  label,
  isActive,
  count,
  onClick
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  isActive: boolean;
  count?: number;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors group ${
        isActive
          ? "bg-white/5 text-zinc-200"
          : "text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-300"
      }`}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon size={18} className={isActive ? "text-orange-500" : "text-zinc-500 group-hover:text-zinc-400"} />}
        <span>{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-zinc-600">{count}</span>
      )}
    </button>
  );
};

const SectionHeader = ({ label }: { label: string }) => (
  <div className="px-3 py-2 mt-4 text-xs font-medium text-zinc-600 uppercase tracking-wider">
    {label}
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({
  navItems,
  activeItem,
  onSelectItem,
  isOpen,
  onClose,
  onOpenTalkMode,
  searchQuery,
  onSearch,
  onLogout,
  isMobile = false,
  width,
  onResize,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Resize logic
  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onResize || isMobile) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width || sidebarRef.current?.getBoundingClientRect().width || 256;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const next = startWidth + delta;
      onResize(next);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

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

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleItemClick = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0;
    if (hasChildren) {
      setExpandedItems(prev =>
        prev.includes(item.id)
          ? prev.filter(id => id !== item.id)
          : [...prev, item.id]
      );
    } else {
      onSelectItem(item.id);
      if (isMobile) {
        onClose();
      }
    }
  };

  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => {
      if (item.isHeader) {
        return <SectionHeader key={item.id} label={item.label} />;
      }

      const isActive = !searchQuery && activeItem === item.id;
      const isExpanded = expandedItems.includes(item.id);
      const hasChildren = item.children && item.children.length > 0;

      return (
        <React.Fragment key={item.id}>
          <div className="space-y-0.5">
            <NavItemComponent
              icon={item.icon}
              label={item.label}
              isActive={isActive}
              count={item.count}
              onClick={() => handleItemClick(item)}
            />
            {hasChildren && isExpanded && (
              <div className="ml-4 pl-2 border-l border-white/10 my-1">
                {(item.children || []).map((child) => {
                  const isChildActive = !searchQuery && activeItem === child.id;
                  return (
                    <NavItemComponent
                      key={child.id}
                      icon={Calendar}
                      label={child.label}
                      isActive={isChildActive}
                      onClick={() => {
                        onSelectItem(child.id);
                        if (isMobile) {
                          onClose();
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </React.Fragment>
      );
    });
  };

  return (
    <div
      ref={sidebarRef}
      className={`
        relative flex flex-col h-full bg-black
        fixed inset-y-0 left-0 z-20
        transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ width: !isMobile && width ? width : undefined, minWidth: 180, maxWidth: 400 }}
    >
      {/* Resize handle */}
      {!isMobile && onResize && (
        <div
          onMouseDown={startDrag}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-white/20 transition-colors z-10"
          title="Arraste para redimensionar"
        />
      )}
      {/* Border on right */}
      <div className="absolute right-0 top-0 h-full w-px bg-white/5" />

      {/* Header */}
      <div className="flex items-center justify-between px-2 h-10">
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10"
          aria-label="Alternar sidebar"
        >
          <div className="flex gap-0.5">
            <span className="h-4 w-2 bg-zinc-600 rounded-sm" />
            <span className="h-4 w-2 bg-zinc-800 rounded-sm" />
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10"
            title="Buscar"
          >
            <Search size={16} />
          </button>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 md:hidden"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Search field */}
      {isSearchOpen && (
        <div className="px-2 py-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              onBlur={(e) => {
                if (!e.target.value) {
                  setTimeout(() => setIsSearchOpen(false), 200);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                  onSearch('');
                }
              }}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 pt-2">
        <div className="space-y-0.5">
          {renderNavItems(navItems)}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div ref={dropdownRef} className="p-3 border-t border-white/10 relative">
        <div className="flex items-center gap-3 px-1">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center justify-center"
            aria-haspopup="menu"
            aria-expanded={isDropdownOpen}
          >
            <Avatar className="h-8 w-8 bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
              <AvatarFallback className="bg-blue-600 text-white">G</AvatarFallback>
            </Avatar>
          </button>
          <div className="flex-1" />
          <button
            onClick={() => {
              onOpenTalkMode();
              if (isMobile) {
                onClose();
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <div
              className="rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 flex-shrink-0"
              style={{ width: '20px', height: '20px' }}
            />
            <span className="text-xs">Talk</span>
          </button>
        </div>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="absolute bottom-16 right-3 z-30 w-48 rounded-lg border border-white/10 bg-zinc-900 shadow-lg overflow-hidden">
            <div className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide border-b border-white/10">
              Conta
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5 transition-colors"
              onClick={() => {
                onSelectItem('config');
                setIsDropdownOpen(false);
                if (isMobile) {
                  onClose();
                }
              }}
            >
              <Settings size={16} className="text-zinc-400" />
              Configuracoes
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5 transition-colors"
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  window.location.href = "/sign-in";
                }
                setIsDropdownOpen(false);
                if (isMobile) {
                  onClose();
                }
              }}
            >
              <LogOut size={16} className="text-red-400" />
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
