import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldX, 
  Activity, 
  Cpu,
  Users,
  Flame,
  CalendarRange,
  Network
} from 'lucide-react';
import StatCard from '../components/StatCard';
import LogTable from '../components/LogTable';
import { dashboardApi, logsApi } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalQueries: 0,
    blockedQueries: 0,
    allowedQueries: 0,
    geminiCalls: 0,
    averageLatency: 0,
    todaysRequests: 0,
    highRiskRequests: 0,
    activeUsers: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, logsRes] = await Promise.all([
        dashboardApi.getStats(),
        logsApi.getLogs({ limit: 5 })
      ]);
      setStats(statsRes.data);
      setRecentLogs(logsRes.data.logs || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to fetch dashboard metrics. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // refresh stats every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading && stats.totalQueries === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Requests" 
          value={stats.totalQueries} 
          icon={Activity} 
        />
        <StatCard 
          title="Allowed Requests" 
          value={stats.allowedQueries} 
          icon={ShieldCheck} 
        />
        <StatCard 
          title="Blocked Requests" 
          value={stats.blockedQueries} 
          icon={ShieldX} 
        />
        <StatCard 
          title="Gemini API Calls" 
          value={stats.geminiCalls} 
          icon={Network} 
        />
        <StatCard 
          title="Avg Response Time" 
          value={`${stats.averageLatency}ms`} 
          icon={Cpu} 
        />
        <StatCard 
          title="Today's Requests" 
          value={stats.todaysRequests} 
          icon={CalendarRange} 
        />
        <StatCard 
          title="High Risk Requests" 
          value={stats.highRiskRequests} 
          icon={Flame} 
        />
        <StatCard 
          title="Active Users" 
          value={stats.activeUsers} 
          icon={Users} 
        />
      </div>

      {/* Security logs table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white tracking-wide">Live Gateway Traffic</h3>
          <button 
            onClick={fetchDashboardData}
            className="text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors"
          >
            Force Refresh
          </button>
        </div>
        <LogTable logs={recentLogs} />
      </div>
    </div>
  );
};

export default Dashboard;
