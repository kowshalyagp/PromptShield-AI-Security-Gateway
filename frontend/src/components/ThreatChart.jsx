import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const mockData = [
  { name: '00:00', requests: 120, blocked: 4 },
  { name: '04:00', requests: 80, blocked: 2 },
  { name: '08:00', requests: 250, blocked: 12 },
  { name: '12:00', requests: 400, blocked: 45 },
  { name: '16:00', requests: 320, blocked: 28 },
  { name: '20:00', requests: 180, blocked: 10 },
];

const ThreatChart = ({ data = mockData }) => {
  return (
    <div className="h-80 w-full glass-panel p-6 rounded-2xl border border-border">
      <h3 className="text-sm font-semibold text-white mb-4">Threat Telemetry & Request Traffic</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: 12 }} />
            <YAxis stroke="#6b7280" style={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(20, 20, 25, 0.9)', 
                borderColor: '#26262d',
                borderRadius: '8px',
                color: '#fff'
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="requests" 
              name="Total Queries"
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorRequests)" 
            />
            <Area 
              type="monotone" 
              dataKey="blocked" 
              name="Blocked Threats"
              stroke="#ef4444" 
              fillOpacity={1} 
              fill="url(#colorBlocked)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ThreatChart;
