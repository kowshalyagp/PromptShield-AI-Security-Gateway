import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Terminal, 
  History, 
  Sliders, 
  Swords, 
  LogOut,
  BarChart3,
  Users,
  Settings,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Threat Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Playground', path: '/playground', icon: Terminal },
    { name: 'Security Policies', path: '/policies', icon: Sliders },
    { name: 'Audit Logs', path: '/logs', icon: History },
    { name: 'Red-Teaming', path: '/redteam', icon: Swords },
    { name: 'User Management', path: '/users', icon: Users },
    { name: 'System Settings', path: '/settings', icon: Settings },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="flex h-screen overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col justify-between z-10">
        <div>
          {/* Logo Header */}
          <div className="p-6 flex items-center gap-3 border-b border-border">
            <div className="p-2 bg-primary-600/10 rounded-lg border border-primary-500/20 text-primary-500">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-wide text-white">PromptShield</h1>
              <span className="text-xs text-gray-500">AI Security Gateway</span>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary-600/10 text-primary-400 border-l-2 border-primary-500' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary-700 flex items-center justify-center font-bold text-xs text-white">
              {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="text-left">
              <Link to="/profile" className="text-xs font-semibold text-white hover:underline block leading-none">
                {user?.username || 'Admin'}
              </Link>
              <span className="text-[10px] text-gray-500">{user?.role || 'Security Officer'}</span>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="p-1.5 rounded-lg hover:bg-accent-500/10 text-gray-400 hover:text-accent-400 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-y-auto">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 z-10 glass-panel">
          <h2 className="text-lg font-semibold tracking-wide text-white">
            {menuItems.find(item => item.path === location.pathname)?.name || 'System'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/5 px-2.5 py-1 rounded-full border border-emerald-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Gateway Online
            </span>
          </div>
        </header>

        {/* Content Inject */}
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
