import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from 'recharts';
import { dashboardApi } from '../services/api';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await dashboardApi.getAnalytics();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError('Could not fetch real-time threat analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm p-4 rounded-xl">
        {error || 'No analytics data available.'}
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: 'rgba(20, 20, 25, 0.95)',
    borderColor: '#26262d',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px'
  };

  return (
    <div className="space-y-8">
      {/* Upper Grid - Time Series & Attack Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Request Trend */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Daily Request Trend & Blocked Threats</h3>
            <p className="text-xs text-gray-500 mb-4">Request counts logged over the past 7 days</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyRequestTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262d" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" style={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area type="monotone" dataKey="requests" name="Total Requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequests)" />
                <Area type="monotone" dataKey="blocked" name="Blocked Threats" stroke="#ef4444" fillOpacity={1} fill="url(#colorBlocked)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Attack Types */}
        <div className="glass-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Top Attack Vectors</h3>
            <p className="text-xs text-gray-500 mb-4">Frequency of identified vulnerability types</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            {data.topAttackTypes.length === 0 ? (
              <p className="text-xs text-gray-500">No malicious threats detected yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topAttackTypes} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26262d" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" style={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: 10 }} width={90} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Threat Count" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                    {data.topAttackTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Middle Grid - Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Threat Category */}
        <div className="glass-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Threat Category</h3>
            <p className="text-xs text-gray-500 mb-2">Safe vs Suspicious vs Malicious</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.threatCategoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Safe</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Suspicious</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent-500"></span> Malicious</span>
          </div>
        </div>

        {/* Risk Scores */}
        <div className="glass-panel p-6 rounded-2xl border border-border flex flex-col justify-between lg:col-span-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Risk Score Distribution</h3>
            <p className="text-xs text-gray-500 mb-4">Volume of requests segmented by risk severity levels</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.riskScoreDistribution} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262d" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" style={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Requests" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <Cell fill="#10b981" />
                  <Cell fill="#84cc16" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#f97316" />
                  <Cell fill="#ef4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gemini Usage */}
        <div className="glass-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">LLM Gateway Usage</h3>
            <p className="text-xs text-gray-500 mb-2">Calls routed to Gemini downstream</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.geminiUsage}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={65}
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#4b5563" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Gemini Calls</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-600"></span> Direct/Blocked</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
