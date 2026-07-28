import React from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  CheckCircle, 
  LogOut,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm p-4 rounded-xl">
        Failed to fetch user session. Please re-authenticate.
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="glass-panel p-8 rounded-2xl border border-border flex flex-col items-center text-center space-y-6">
        {/* Profile Avatar */}
        <div className="h-20 w-20 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 text-3xl font-extrabold shadow-inner shadow-primary-500/5">
          {user.username.slice(0, 2).toUpperCase()}
        </div>

        {/* User Info Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-white tracking-tight">{user.username}</h2>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>

        {/* Profile Attributes List */}
        <div className="w-full space-y-3 pt-4 border-t border-border">
          <div className="flex justify-between items-center text-xs py-1">
            <span className="text-gray-500 flex items-center gap-1.5"><Shield size={14} /> Security Role</span>
            <span className="font-semibold text-primary-400 px-2 py-0.5 rounded bg-primary-500/10 border border-primary-500/20">
              {user.role}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs py-1">
            <span className="text-gray-500 flex items-center gap-1.5"><Mail size={14} /> Email Address</span>
            <span className="font-mono text-gray-300">{user.email}</span>
          </div>

          <div className="flex justify-between items-center text-xs py-1">
            <span className="text-gray-500 flex items-center gap-1.5"><CheckCircle size={14} /> Account Status</span>
            <span className="font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              {user.is_active ? 'Active' : 'Suspended'}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-xs py-1">
            <span className="text-gray-500 flex items-center gap-1.5"><Calendar size={14} /> Gateway ID</span>
            <span className="font-mono text-gray-500">USER_REF_{user.id || 'N/A'}</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-accent-600/15"
        >
          <LogOut size={14} /> Sign Out of Admin Console
        </button>
      </div>
    </div>
  );
};

export default Profile;
