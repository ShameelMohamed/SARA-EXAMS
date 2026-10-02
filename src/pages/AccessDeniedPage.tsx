import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../features/auth/AuthContext';

export const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Your account <strong className="text-slate-800">{user?.email}</strong> does not have permission to access this portal section.
        </p>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-200 text-left space-y-1">
          <p><strong>Note for Students:</strong> Only <code>cse*@saranathan.ac.in</code> accounts are permitted.</p>
          <p><strong>Note for Faculty:</strong> An Administrator must assign your teacher authorization prior to login.</p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            icon={<ArrowLeft className="w-4 h-4" />}
            className="w-full justify-center"
          >
            Sign In with Different Account
          </Button>
        </div>
      </div>
    </div>
  );
};
