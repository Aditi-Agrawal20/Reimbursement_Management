import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, GitBranch, Receipt, Clock,
  FileText, UsersRound, LogOut, Sun, Moon, Zap, Building2
} from 'lucide-react';
import { useRole, Role, roleColors, roleLabels } from '@/hooks/useRole';
import { useTheme } from '@/hooks/useTheme';

const navItems: Record<Role, { label: string; path: string; icon: React.ElementType }[]> = {
  admin: [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Team', path: '/dashboard/team', icon: Users },
    { label: 'Approval Rules', path: '/dashboard/rules', icon: GitBranch },
  ],
  employee: [
    { label: 'Submit Expense', path: '/dashboard', icon: FileText },
    { label: 'My Expenses', path: '/dashboard/my-expenses', icon: Receipt },
  ],
  manager: [
    { label: 'Pending Approvals', path: '/dashboard', icon: Clock },
    { label: 'Team Overview', path: '/dashboard/team-overview', icon: UsersRound },
  ],
  finance: [
    { label: 'Pending Approvals', path: '/dashboard', icon: Clock },
    { label: 'All Expenses', path: '/dashboard/all-expenses', icon: Receipt },
  ],
  director: [
    { label: 'Pending Approvals', path: '/dashboard', icon: Clock },
    { label: 'Company Overview', path: '/dashboard/company-overview', icon: Building2 },
  ],
};

export const AppSidebar = () => {
  const { role, user, logout } = useRole();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const items = navItems[role];
  const color = roleColors[role];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const displayName = user?.full_name || 'User';
  const displayEmail = user?.email || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-layer-1 border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color, boxShadow: `0 0 40px ${color}20` }}>
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg text-foreground">ClearClaim</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-2 space-y-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all duration-150 relative group ${
                isActive
                  ? 'font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={isActive ? {
                background: `${color}12`,
                color: color,
              } : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: `linear-gradient(180deg, ${color}, ${color}80)` }}
                />
              )}
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-body text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${color}20`, color: color, boxShadow: `0 0 0 2px ${color}40` }}>
            <span className="text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-xs text-foreground font-medium truncate">{displayName}</div>
            <div className="text-[10px] text-muted-foreground">{roleLabels[role]}</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-body text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
