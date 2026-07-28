import React from 'react';

const StatCard = ({ title, value, change, trend = 'neutral', icon: Icon }) => {
  return (
    <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border border-border">
      <div className="space-y-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
        <h3 className="text-3xl font-extrabold text-white tracking-tight">{value}</h3>
        {change && (
          <p className="text-xs">
            <span className={`font-semibold ${
              trend === 'up' ? 'text-accent-400' : trend === 'down' ? 'text-emerald-400' : 'text-gray-400'
            }`}>
              {change}
            </span>
            <span className="text-gray-500 ml-1">vs last week</span>
          </p>
        )}
      </div>
      {Icon && (
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-gray-400">
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
