import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface User {
  id: number;
  username: string;
  full_name: string;
  is_admin: number;
  must_change_password: number;
  created_at: string;
}

interface LogEntry {
  id: number;
  user_id: number | null;
  full_name: string;
  action: string;
  detail: string | null;
  ip_address: string | null;
  timestamp: string;
}

type AdminTab = 'users' | 'logs';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Logged in',
  LOGOUT: 'Logged out',
  PDF_EXPORT: 'PDF export',
  PASSWORD_CHANGED: 'Changed password',
};

export default function AdminMode() {
  const [tab, setTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState('');

  // Create / Edit user modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formIsAdmin, setFormIsAdmin] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Reset password result
  const [resetResult, setResetResult] = useState<{ userId: number; password: string } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setError('');
    try { setUsers(await api.getUsers()); }
    catch (e: any) { setError(e.message); }
    finally { setLoadingUsers(false); }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try { setLogs(await api.getActivityLog()); }
    catch (e: any) { setError(e.message); }
    finally { setLoadingLogs(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setFormUsername(''); setFormFullName(''); setFormIsAdmin(false);
    setFormError(''); setTempPassword('');
    setShowUserModal(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setFormUsername(u.username); setFormFullName(u.full_name); setFormIsAdmin(!!u.is_admin);
    setFormError(''); setTempPassword('');
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, { full_name: formFullName, is_admin: formIsAdmin });
        setShowUserModal(false);
      } else {
        const { tempPassword: tp } = await api.createUser(formUsername, formFullName, formIsAdmin);
        setTempPassword(tp);
      }
      await loadUsers();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPassword = async (id: number) => {
    try {
      const { tempPassword: tp } = await api.resetUserPassword(id);
      setResetResult({ userId: id, password: tp });
      await loadUsers();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteUser(id);
      setDeletingId(null);
      await loadUsers();
    } catch (e: any) { setError(e.message); }
  };

  const handleTabChange = (t: AdminTab) => {
    setTab(t);
    if (t === 'logs' && logs.length === 0) loadLogs();
  };

  const fmt = (ts: string) => {
    try {
      const d = new Date(ts.endsWith('Z') ? ts : ts + 'Z');
      return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Sub-tabs */}
      <div className="flex border-b border-gray-200">
        {(['users', 'logs'] as AdminTab[]).map(t => (
          <button key={t} onClick={() => handleTabChange(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t ? 'border-tsg-red text-tsg-red' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'users' ? `Users (${users.length})` : 'Activity Log'}
          </button>
        ))}
      </div>

      {/* ===== USERS TAB ===== */}
      {tab === 'users' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-tsg-red text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add User
            </button>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-12">
              <svg className="w-6 h-6 animate-spin text-tsg-red" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.username}</td>
                      <td className="px-4 py-3">
                        {u.is_admin ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Admin</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">User</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.must_change_password ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Must change password</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmt(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(u)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                          <button onClick={() => handleResetPassword(u.id)}
                            className="text-xs text-amber-600 hover:text-amber-800 font-medium">Reset PW</button>
                          <button onClick={() => setDeletingId(u.id)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>
                        </div>

                        {/* Reset password result inline */}
                        {resetResult?.userId === u.id && (
                          <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                            Temp password: <strong className="font-mono">{resetResult.password}</strong>
                            <button onClick={() => setResetResult(null)} className="ml-2 text-amber-600 hover:text-amber-800">✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== LOGS TAB ===== */}
      {tab === 'logs' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={loadLogs} disabled={loadingLogs}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
              <svg className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {loadingLogs ? (
            <div className="flex justify-center py-12">
              <svg className="w-6 h-6 animate-spin text-tsg-red" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date / Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No activity yet</td></tr>
                  )}
                  {logs.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(l.timestamp)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{l.full_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          l.action === 'LOGIN' ? 'bg-green-100 text-green-700' :
                          l.action === 'LOGOUT' ? 'bg-gray-100 text-gray-600' :
                          l.action === 'PDF_EXPORT' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {ACTION_LABELS[l.action] ?? l.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{l.detail ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== CREATE / EDIT USER MODAL ===== */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {editingUser ? 'Edit User' : 'Create New User'}
            </h3>

            {/* Show temp password after creation */}
            {tempPassword ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
                  <p className="text-sm font-semibold text-amber-800 mb-1">User created successfully!</p>
                  <p className="text-xs text-amber-700 mb-2">Share these credentials with the user. They will be prompted to set a new password on first login.</p>
                  <div className="bg-white border border-amber-200 rounded px-3 py-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Username:</span><strong className="font-mono">{formUsername}</strong></div>
                    <div className="flex justify-between mt-1"><span className="text-gray-500">Temp password:</span><strong className="font-mono text-amber-700">{tempPassword}</strong></div>
                  </div>
                </div>
                <button onClick={() => { setShowUserModal(false); setTempPassword(''); }}
                  className="w-full px-4 py-2 bg-tsg-red text-white text-sm font-medium rounded-lg hover:bg-red-700">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveUser} className="space-y-3">
                {!editingUser && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                    <input type="text" value={formUsername} onChange={e => setFormUsername(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tsg-red"
                      placeholder="e.g. jsmith" required autoFocus />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                  <input type="text" value={formFullName} onChange={e => setFormFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tsg-red"
                    placeholder="e.g. John Smith" required />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isAdmin" checked={formIsAdmin} onChange={e => setFormIsAdmin(e.target.checked)}
                    className="rounded text-tsg-red" />
                  <label htmlFor="isAdmin" className="text-sm text-gray-700">Admin (can manage users and view logs)</label>
                </div>
                {formError && <p className="text-xs text-red-600">{formError}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowUserModal(false)}
                    className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={formLoading}
                    className="flex-1 px-4 py-2 text-sm bg-tsg-red text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
                    {formLoading ? 'Saving…' : editingUser ? 'Save Changes' : 'Create User'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION ===== */}
      {deletingId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-6 text-center">
            <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-sm font-semibold text-gray-900 mb-1">Delete this user?</p>
            <p className="text-xs text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deletingId)}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
