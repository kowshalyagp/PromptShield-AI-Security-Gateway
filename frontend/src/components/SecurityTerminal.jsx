import React, { useEffect, useRef } from 'react';

const SecurityTerminal = ({ logs = [] }) => {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="w-full h-80 bg-neutral-950 border border-border rounded-2xl p-6 font-mono text-xs overflow-y-auto flex flex-col gap-2 relative shadow-inner">
      <div className="absolute top-3 right-4 flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-accent-500 animate-ping"></span>
        <span className="text-[10px] text-accent-400 font-bold uppercase tracking-wider">Live Audit Stream</span>
      </div>

      <div className="text-gray-500 mb-2">/* PromptShield Gateway v1.0.0 init successful */</div>

      {logs.length === 0 ? (
        <div className="text-neutral-700 animate-pulse">Waiting for incoming prompt requests...</div>
      ) : (
        logs.map((log, index) => (
          <div key={index} className="space-y-1 py-1 border-b border-neutral-900 last:border-0">
            <div className="flex justify-between">
              <span className="text-neutral-500">[{log.time}]</span>
              <span className={`font-semibold ${
                log.status === 'BLOCKED' ? 'text-accent-500' : 'text-emerald-500'
              }`}>
                {log.status}
              </span>
            </div>
            <div className="text-white truncate">
              <span className="text-primary-500 font-semibold">&gt; IN:</span> {log.prompt}
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-gray-400">Risk Score: <strong className="text-white">{log.score}%</strong></span>
              <span className="text-gray-400">Vector Similarity: <strong className="text-white">{log.similarity}</strong></span>
              <span className="text-gray-400">Execution time: <strong className="text-white">{log.latency}ms</strong></span>
            </div>
          </div>
        ))
      )}
      <div ref={terminalEndRef} />
    </div>
  );
};

export default SecurityTerminal;
