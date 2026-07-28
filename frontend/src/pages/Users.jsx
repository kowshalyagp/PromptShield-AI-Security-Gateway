import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Shield, 
  User, 
  ToggleLeft, 
  ToggleRight, 
  AlertCircle,
  RefreshCw 
} from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // New user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('User');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authApi.listUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Could not fetch user accounts. Make sure you are an administrator.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newPassword) {
      setError('All fields are required.');
      return;
    }
    
    try {
      setFormLoading(true);
      setError('');
      setSuccess('');
      await authApi.createUser({
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole
      });
      setSuccess(`User ${newUsername} created successfully.`);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('User');
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
      setError(err.response?.data?.detail || 'Failed to create user account.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setError('');
      setSuccess('');
      await authApi.updateUserRole(userId, newRole);
      setSuccess('User role updated successfully.');
      fetchUsers();
    } catch (err) {
      console.error('Failed to change role:', err);
      setError(err.response?.data?.detail || 'Failed to update user role.');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      setError('');
      setSuccess('');
      await authApi.disableUser(userId, !currentStatus);
      setSuccess(`User status ${!currentStatus ? 'enabled' : 'disabled'} successfully.`);
      fetchUsers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError(err.response?.data?.detail || 'Failed to change user status.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-4 rounded-xl flex items-center gap-2">
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Control bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card border border-border p-4 rounded-2xl glass-panel">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full bg-neutral-900 border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
          />
          <Search className="absolute left-3.5 top-3.5 text-gray-500" size={14} />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <UserPlus size={14} /> Add New User
          </button>
          <button
            onClick={fetchUsers}
            className="p-2.5 border border-border text-gray-400 hover:text-white rounded-xl text-xs hover:bg-white/5 transition-colors"
            title="Refresh User List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Add User Drawer/Form Panel */}
      {showAddForm && (
        <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <UserPlus size={16} /> Register Administrative Account
            </h3>
            <button 
              onClick={() => setShowAddForm(false)} 
              className="text-gray-500 hover:text-white p-1"
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. jdoe"
                required
                className="w-full bg-neutral-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="jdoe@promptshield.local"
                required
                className="w-full bg-neutral-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-neutral-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500">Role Privilege</label>
              <div className="flex gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="User">User (Standard)</option>
                  <option value="Admin">Admin (Full Control)</option>
                </select>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-50"
                >
                  {formLoading ? 'Creating...' : 'Register'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Users List Grid */}
      <div className="w-full glass-panel rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role / Access Privilege</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs text-gray-300">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">Loading user directory...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/5 border border-border flex items-center justify-center text-primary-400 font-bold">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{u.username}</p>
                          <p className="text-[10px] text-gray-500">ID: {u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {u.role === 'Admin' ? (
                          <span className="flex items-center gap-1 text-primary-400 font-semibold bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 rounded text-[10px]">
                            <Shield size={10} /> Admin
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400 font-semibold bg-white/5 border border-border px-2 py-0.5 rounded text-[10px]">
                            <User size={10} /> Standard User
                          </span>
                        )}
                        
                        {/* Role switcher (Only if not editing own user) */}
                        {currentUser?.username !== u.username && (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-neutral-900 border border-border rounded-lg px-2 py-1 text-[10px] text-gray-300 focus:outline-none"
                          >
                            <option value="User">Make User</option>
                            <option value="Admin">Make Admin</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.is_active 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                      }`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {currentUser?.username === u.username ? (
                        <span className="text-[10px] text-gray-500 italic">Self Account</span>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(u.id, u.is_active)}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors ${
                            u.is_active 
                              ? 'text-accent-400 hover:bg-accent-500/10' 
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {u.is_active ? (
                            <>
                              <ToggleRight size={16} /> Disable
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={16} /> Enable
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
