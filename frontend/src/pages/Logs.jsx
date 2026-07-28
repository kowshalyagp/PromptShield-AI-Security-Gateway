import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ArrowLeft, 
  ArrowRight, 
  Eye, 
  Calendar, 
  ShieldAlert,
  ArrowUpDown,
  RefreshCw,
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { logsApi } from '../services/api';

const Logs = () => {
  // Query parameters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [threatType, setThreatType] = useState('');
  const [minRisk, setMinRisk] = useState('');
  const [maxRisk, setMaxRisk] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pagination
  const [limit, setLimit] = useState(15);
  const [offset, setOffset] = useState(0);
  
  // Data state
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Prompt Inspection Modal State
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [inspectingLog, setInspectingLog] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        limit,
        offset,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      
      if (search) params.search = search;
      if (status) params.status = status;
      if (threatType) params.threat_type = threatType;
      if (minRisk) params.min_risk = parseInt(minRisk);
      if (maxRisk) params.max_risk = parseInt(maxRisk);
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const response = await logsApi.getLogs(params);
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Failed to load logs:', err);
      setError('Could not fetch security logs. Make sure you have administrator privileges.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInspectLog = async (id) => {
    try {
      setSelectedLogId(id);
      setInspectLoading(true);
      const res = await logsApi.getLogDetails(id);
      setInspectingLog(res.data);
    } catch (err) {
      console.error('Error fetching log details:', err);
      alert('Failed to retrieve security analysis details.');
      setSelectedLogId(null);
    } finally {
      setInspectLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLogs();
  }, [offset, limit, status, threatType, sortBy, sortOrder]);
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setOffset(0);
    fetchLogs();
  };
  
  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setThreatType('');
    setMinRisk('');
    setMaxRisk('');
    setStartDate('');
    setEndDate('');
    setSortBy('timestamp');
    setSortOrder('desc');
    setOffset(0);
  };
  
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setOffset(0);
  };
  
  const handlePrevPage = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };
  
  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const threatTypes = [
    'Prompt Injection',
    'Jailbreak',
    'System Leakage',
    'Role Manipulation',
    'Harmful Content',
    'Rate Limit Exceeded'
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Advanced Filters Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Filter size={16} /> Filter Security Audits
        </h3>
        
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Search</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Prompt, IP, ID..."
                className="w-full bg-neutral-900 border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-500" size={12} />
            </div>
          </div>
          
          {/* Status */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Gateway Decision</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-neutral-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
            >
              <option value="">All decisions</option>
              <option value="Allowed">Allowed</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
          
          {/* Threat Type */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Threat Type</label>
            <select
              value={threatType}
              onChange={(e) => setThreatType(e.target.value)}
              className="w-full bg-neutral-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
            >
              <option value="">All threat types</option>
              {threatTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          {/* Risk Range */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Risk Score Range (%)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={minRisk}
                onChange={(e) => setMinRisk(e.target.value)}
                className="w-full bg-neutral-900 border border-border rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary-500"
              />
              <span className="text-gray-600 text-xs">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxRisk}
                onChange={(e) => setMaxRisk(e.target.value)}
                className="w-full bg-neutral-900 border border-border rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-neutral-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-neutral-900 border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="lg:col-span-2 flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 rounded-xl text-xs transition-colors"
            >
              Apply Filter Parameters
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 border border-border text-gray-400 hover:text-white rounded-xl text-xs transition-colors hover:bg-white/5"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={fetchLogs}
              className="p-2 border border-border text-gray-400 hover:text-white rounded-xl text-xs transition-colors hover:bg-white/5"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </form>
      </div>

      {/* Audit Table */}
      <div className="w-full glass-panel rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4 cursor-pointer hover:text-white select-none" onClick={() => handleSort('timestamp')}>
                  <div className="flex items-center gap-1.5">
                    Timestamp <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4">Request ID</th>
                <th className="px-6 py-4">Prompt</th>
                <th className="px-6 py-4">Classification</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white select-none text-center" onClick={() => handleSort('risk_score')}>
                  <div className="flex items-center justify-center gap-1.5">
                    Risk <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 text-center">LLM Calls</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white select-none text-center" onClick={() => handleSort('latency_ms')}>
                  <div className="flex items-center justify-center gap-1.5">
                    Latency <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs text-gray-300">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">Loading audit trail logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">No security audit logs found matching criteria.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-400">
                      {log.request_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-white font-medium">
                      {log.prompt}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded border bg-white/5 border-border">
                        {log.threat_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${
                        log.risk_score >= 70 ? 'text-accent-400' : log.risk_score >= 30 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {log.risk_score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        log.gemini_called ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {log.gemini_called ? 'Gemini' : 'Gateway'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-gray-400">
                      {log.latency_ms}ms
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        log.status === 'Blocked' 
                          ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleInspectLog(log.id)}
                        className="p-1 hover:bg-white/10 rounded text-primary-400 hover:text-primary-300 transition-colors"
                        title="Inspect Security Telemetry"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
        <span className="text-xs text-gray-500">
          Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} logs
        </span>
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevPage}
            disabled={offset === 0}
            className="p-2 border border-border rounded-xl text-gray-500 hover:text-white disabled:opacity-40 disabled:hover:text-gray-500"
          >
            <ArrowLeft size={16} />
          </button>
          <button 
            onClick={handleNextPage}
            disabled={offset + limit >= total}
            className="p-2 border border-border rounded-xl text-gray-500 hover:text-white disabled:opacity-40 disabled:hover:text-gray-500"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Prompt Inspection Modal */}
      {selectedLogId !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-4xl w-full rounded-2xl border border-border overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-white/5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert size={18} className="text-primary-500" /> Prompt Inspection Console
                </h3>
                <p className="text-[10px] text-gray-500">Request Trace ID: {inspectingLog?.request_id}</p>
              </div>
              <button 
                onClick={() => { setSelectedLogId(null); setInspectingLog(null); }}
                className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {inspectLoading ? (
              <div className="p-16 flex justify-center items-center">
                <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : inspectingLog ? (
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* Executive Summary Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 border border-border p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Security Verdict</span>
                    <p className={`text-base font-extrabold flex items-center justify-center gap-1.5 ${
                      inspectingLog.status === 'Blocked' ? 'text-accent-400' : 'text-emerald-400'
                    }`}>
                      {inspectingLog.status === 'Blocked' ? (
                        <>
                          <AlertTriangle size={16} /> Blocked
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} /> Allowed
                        </>
                      )}
                    </p>
                  </div>
                  
                  <div className="bg-white/5 border border-border p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Composite Threat Score</span>
                    <p className={`text-base font-extrabold ${
                      inspectingLog.risk_score >= 70 ? 'text-accent-400' : inspectingLog.risk_score >= 30 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {inspectingLog.risk_score}%
                    </p>
                  </div>

                  <div className="bg-white/5 border border-border p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Primary Classification</span>
                    <p className="text-base font-extrabold text-white">
                      {inspectingLog.threat_type}
                    </p>
                  </div>

                  <div className="bg-white/5 border border-border p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Response Latency</span>
                    <p className="text-base font-extrabold text-white font-mono">
                      {inspectingLog.latency_ms}ms
                    </p>
                  </div>
                </div>

                {/* Prompts comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Original Prompt */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Original Prompt</label>
                    <div className="bg-neutral-950 border border-border p-4 rounded-xl text-white font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {inspectingLog.prompt}
                    </div>
                  </div>

                  {/* Gemini Response */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Model Response Output</label>
                    <div className={`bg-neutral-950 border border-border p-4 rounded-xl leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto font-mono ${
                      inspectingLog.status === 'Blocked' ? 'text-accent-400 italic' : 'text-gray-300'
                    }`}>
                      {inspectingLog.response || (inspectingLog.error_message ? `Error: ${inspectingLog.error_message}` : 'No response generated.')}
                    </div>
                  </div>
                </div>

                {/* Sub-engine scanning breakups */}
                {inspectingLog.scan_details && (
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Multi-Engine Security Breakdown</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Regex matches */}
                      <div className="bg-neutral-950 border border-border p-4 rounded-xl space-y-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Rule Match Engine</span>
                        <div className="space-y-1">
                          <p className="text-white flex justify-between">
                            <span>Threat Detected:</span> 
                            <span className={inspectingLog.scan_details.details?.rules?.is_threat ? 'text-accent-400 font-bold' : 'text-emerald-400'}>
                              {inspectingLog.scan_details.details?.rules?.is_threat ? 'YES' : 'NO'}
                            </span>
                          </p>
                          <p className="text-gray-500">Matches found: {inspectingLog.scan_details.details?.rules?.matches?.length || 0}</p>
                          {inspectingLog.scan_details.details?.rules?.matches?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {inspectingLog.scan_details.details.rules.matches.map(m => (
                                <span key={m} className="px-1.5 py-0.5 bg-accent-500/10 text-accent-400 border border-accent-500/20 rounded font-mono text-[9px]">{m}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Semantic evaluation */}
                      <div className="bg-neutral-950 border border-border p-4 rounded-xl space-y-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Semantic Matching Engine</span>
                        <div className="space-y-1">
                          <p className="text-white flex justify-between">
                            <span>Max Overlap Score:</span> 
                            <span className="font-mono text-white">
                              {((inspectingLog.scan_details.details?.semantic?.max_similarity || 0) * 100).toFixed(0)}%
                            </span>
                          </p>
                          <p className="text-gray-500">Matches templates: {inspectingLog.scan_details.details?.semantic?.matched_template ? 'YES' : 'NO'}</p>
                          {inspectingLog.scan_details.details?.semantic?.matched_template && (
                            <p className="text-gray-400 mt-1 italic">
                              "{inspectingLog.scan_details.details.semantic.matched_template.slice(0, 60)}..."
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Model Classifier */}
                      <div className="bg-neutral-950 border border-border p-4 rounded-xl space-y-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Vector Classifier</span>
                        <div className="space-y-1">
                          <p className="text-white flex justify-between">
                            <span>Malicious Score:</span>
                            <span className="font-mono text-white">
                              {inspectingLog.scan_details.details?.classifier?.composite_risk_score || 0}%
                            </span>
                          </p>
                          <p className="text-gray-500">Verdict classification: {inspectingLog.scan_details.details?.classifier?.verdict || 'Safe'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-white/5 flex justify-end">
              <button 
                onClick={() => { setSelectedLogId(null); setInspectingLog(null); }}
                className="px-4 py-2 bg-neutral-950 hover:bg-neutral-900 border border-border rounded-xl text-xs text-gray-400 hover:text-white transition-all"
              >
                Close Audit Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;
