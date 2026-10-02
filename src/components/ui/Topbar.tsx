import React from 'react';
import { LogOut, GraduationCap, Shield, BookOpen, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from './Button';
import { Badge } from './Badge';

export const Topbar: React.FC = () => {
  const { profile, role, logout } = useAuth();

  const getRoleIcon = () => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'TEACHER':
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'STUDENT':
        return <GraduationCap className="w-4 h-4 text-emerald-600" />;
      default:
        return <UserIcon className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleBadgeVariant = () => {
    switch (role) {
      case 'ADMIN': return 'purple';
      case 'TEACHER': return 'blue';
      case 'STUDENT': return 'green';
      default: return 'slate';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/LOGO.png" alt="SARA EXAMS Logo" className="h-9 w-auto object-contain" />
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight tracking-tight">SARA EXAMS</h1>
          <p className="text-xs text-slate-500 font-medium">College Examination Portal</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {profile && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-800">{profile.displayName || profile.email}</p>
              <p className="text-[11px] text-slate-500">{profile.email}</p>
            </div>
            <Badge variant={getRoleBadgeVariant()} className="gap-1">
              {getRoleIcon()}
              <span>{role}</span>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              icon={<LogOut className="w-4 h-4 text-slate-500 hover:text-red-600" />}
              title="Logout"
              className="text-slate-600 hover:text-red-600 hover:bg-red-50"
            >
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
