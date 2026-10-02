import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, PlusCircle, Award, KeyRound } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

export const Sidebar: React.FC = () => {
  const { role } = useAuth();

  const navItems = {
    ADMIN: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/exams/new', label: 'Create Examination', icon: PlusCircle },
      { to: '/admin/teachers', label: 'Teacher Management', icon: Users },
      { to: '/admin/exams', label: 'All Examinations', icon: FileText },
      { to: '/admin/reports', label: 'Examination Reports', icon: Award },
    ],
    TEACHER: [
      { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/teacher/exams/new', label: 'Create Examination', icon: PlusCircle },
      { to: '/teacher/reports', label: 'Exam Reports', icon: Award },
    ],
    STUDENT: [
      { to: '/student', label: 'Student Dashboard', icon: LayoutDashboard },
      { to: '/student/enter-qp', label: 'Enter QP Code', icon: KeyRound },
    ],
  };

  const currentNav = role ? navItems[role] || [] : [];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 shrink-0 hidden md:block min-h-[calc(100vh-4rem)] p-4">
      <nav className="space-y-1">
        {currentNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/teacher' || item.to === '/student'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
