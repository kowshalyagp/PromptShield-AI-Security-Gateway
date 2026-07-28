import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Playground from './pages/Playground';
import Policies from './pages/Policies';
import Logs from './pages/Logs';
import RedTeam from './pages/RedTeam';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShieldAlert } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid admin credentials. Use admin/adminpassword123.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-border space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-primary-600/10 rounded-xl border border-primary-500/20 text-primary-500 mb-2">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-white">PromptShield Portal</h2>
          <p className="text-xs text-gray-500">Security Gateway Administrator Console</p>
        </div>

        {error && (
          <div className="bg-accent-500/10 border border-accent-500/20 text-accent-400 text-xs p-3.5 rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              className="w-full bg-neutral-900 border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-neutral-900 border border-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-all mt-6 shadow-lg shadow-primary-950/20"
          >
            Authenticate Admin
          </button>
        </form>
        <p className="text-[10px] text-gray-500 text-center">
          Default seed credentials: <code className="text-gray-300">admin / adminpassword123</code>
        </p>
      </div>
    </div>
  );
};

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/redteam" element={<RedTeam />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
