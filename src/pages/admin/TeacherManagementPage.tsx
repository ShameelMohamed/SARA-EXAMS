import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2, CheckCircle2, AlertCircle, Mail, Shield, BookOpen } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../features/auth/AuthContext';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import type { AuthorizedRoleAccount } from '../../types';

export const TeacherManagementPage: React.FC = () => {
  const { profile } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<'TEACHER' | 'ADMIN'>('TEACHER');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AuthorizedRoleAccount[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAccounts = async () => {
    try {
      const snap = await getDocs(collection(db, 'authorized_roles'));
      const list: AuthorizedRoleAccount[] = [];
      snap.forEach((d) => {
        list.push({
          email: d.id,
          ...d.data()
        } as AuthorizedRoleAccount);
      });

      // Also check legacy teachers collection if empty or to combine
      const teacherSnap = await getDocs(collection(db, 'teachers'));
      teacherSnap.forEach((d) => {
        if (!list.some((item) => item.email === d.id)) {
          list.push({
            email: d.id,
            role: 'TEACHER',
            assignedBy: d.data().assignedBy || 'ADMIN',
            assignedAt: d.data().assignedAt || new Date().toISOString()
          });
        }
      });

      setAccounts(list);
    } catch (err) {
      console.warn('Could not fetch authorized roles list:', err);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const email = emailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    try {
      const roleRef = doc(db, 'authorized_roles', email);
      const payload: AuthorizedRoleAccount = {
        email,
        role: selectedRole,
        assignedBy: profile?.email || 'ADMIN',
        assignedAt: new Date().toISOString()
      };

      await setDoc(roleRef, payload);

      if (selectedRole === 'TEACHER') {
        await setDoc(doc(db, 'teachers', email), {
          assignedBy: profile?.email || 'ADMIN',
          assignedAt: new Date().toISOString()
        });
      } else {
        // If assigned admin, clean up legacy teacher doc if present
        try {
          await deleteDoc(doc(db, 'teachers', email));
        } catch (_) {}
      }

      setEmailInput('');
      setMessage({ type: 'success', text: `Successfully assigned ${selectedRole} role to ${email}.` });
      await fetchAccounts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to assign user role.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (account: AuthorizedRoleAccount) => {
    if (account.role === 'ADMIN') {
      const activeAdmins = accounts.filter((a) => a.role === 'ADMIN');
      if (activeAdmins.length <= 1) {
        setMessage({
          type: 'error',
          text: 'Cannot revoke the last remaining administrator account. Assign another ADMIN role first.'
        });
        return;
      }
    }

    if (!window.confirm(`Are you sure you want to remove ${account.role} authorization for ${account.email}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'authorized_roles', account.email));
      await deleteDoc(doc(db, 'teachers', account.email));
      setMessage({ type: 'success', text: `Removed ${account.role} authorization for ${account.email}.` });
      await fetchAccounts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove authorization.' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">User Role Authorization</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Authorize faculty and administrator Google emails to manage and create college examinations.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Card title="Assign User Role">
        <form onSubmit={handleAssignRole} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Google Email Address"
                type="email"
                placeholder="e.g. faculty@saranathan.ac.in or admin@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />
            </div>
            <div>
              <Select
                label="Role to Assign"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'TEACHER' | 'ADMIN')}
                options={[
                  { value: 'TEACHER', label: 'TEACHER' },
                  { value: 'ADMIN', label: 'ADMIN' }
                ]}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={loading} icon={<UserPlus className="w-4 h-4" />}>
              Assign {selectedRole} Role
            </Button>
          </div>
        </form>
      </Card>

      <Card title={`Authorized Admin & Teacher Accounts (${accounts.length})`}>
        {accounts.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No authorized roles assigned yet. Assign user emails above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">User Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned By</th>
                  <th className="py-3 px-4">Date Authorized</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {accounts.map((acc) => (
                  <tr key={acc.email} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-900">{acc.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={acc.role === 'ADMIN' ? 'purple' : 'blue'} className="gap-1">
                        {acc.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                        <span>{acc.role}</span>
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">{acc.assignedBy}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {new Date(acc.assignedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveRole(acc)}
                        icon={<Trash2 className="w-4 h-4" />}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
