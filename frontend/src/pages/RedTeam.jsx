import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Activity, 
  Download, 
  History, 
  AlertTriangle, 
  CheckCircle, 
  BarChart,
  ChevronRight,
  Search
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
} from 'recharts';
import { redTeamApi } from '../services/api';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#06b6d4'];

const RedTeam = () => {
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [runCategory, setRunCategory] = useState('ALL');
  const [error, setError] = useState('');
  
  // Results view filters
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, Passed, Failed
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await redTeamApi.getReports();
      setReports(res.data || []);
      if (res.data && res.data.length > 0 && !activeReport) {
        // Load latest report by default
        loadReportDetails(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Could not retrieve historical security evaluation reports.');
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetails = async (id) => {
    try {
      setLoading(true);
      setError('');
      const res = await redTeamApi.getReportDetails(id);
      setActiveReport(res.data);
    } catch (err) {
      console.error('Failed to load report details:', err);
      setError('Failed to retrieve detailed test result logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRunSuite = async () => {
    try {
      setRunning(true);
      setProgress(10);
      setError('');
      
      const payload = runCategory === 'ALL' ? null : { category: runCategory };
      
      // Simulate progress bar increments since server-side runs quickly
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 15;
        });
      }, 300);

      const res = await redTeamApi.runSuite(payload);
      clearInterval(interval);
      setProgress(100);
      
      setTimeout(async () => {
        setRunning(false);
        setProgress(0);
        await fetchReports();
        if (res.data && res.data.report_id) {
          await loadReportDetails(res.data.report_id);
        }
      }, 500);

    } catch (err) {
      console.error('Red team execution failed:', err);
      setError(err.response?.data?.detail || 'Automated red team test suite execution failed.');
      setRunning(false);
      setProgress(0);
    }
  };

  const handleExport = async (format) => {
    if (!activeReport) return;
    try {
      const res = await redTeamApi.exportReport(activeReport.id, format);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `redteam_report_${activeReport.id}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export:', err);
      alert('Failed to download report file.');
    }
  };

  const attackCategories = [
    'Prompt Injection',
    'Jailbreak Attempts',
    'Role Manipulation',
    'System Prompt Extraction',
    'Prompt Leakage',
    'Harmful Content',
    'Data Exfiltration Attempts',
    'Encoding & Obfuscation Attacks',
    'Multi-turn Prompt Attacks'
  ];

  // Map category accuracy object into array for charting
  const chartData = activeReport && activeReport.category_accuracy
    ? Object.keys(activeReport.category_accuracy).map(cat => ({
        name: cat,
        accuracy: activeReport.category_accuracy[cat]
      }))
    : [];

  const overallBlockRate = activeReport
    ? ((activeReport.blocked_count / activeReport.total_tests) * 100).toFixed(1)
    : 0;

  // Filter individual results
  const filteredResults = activeReport && activeReport.results
    ? activeReport.results.filter(res => {
        const matchesStatus = 
          statusFilter === 'ALL' || 
          res.status === statusFilter;
        
        const matchesSearch = 
          res.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
          res.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          res.attack_id.toLowerCase().includes(searchTerm.toLowerCase());
          
        return matchesStatus && matchesSearch;
      })
    : [];

  // Filter failed test cases (critical bypass cases)
  const failedTestCases = activeReport && activeReport.results
    ? activeReport.results.filter(res => res.status === 'Failed')
    : [];

  return (
    <div className="space-y-8">
      {/* Top Controller Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h3 className="text-sm font-semibold text-white">Automated Red-Teaming & Security Evaluation</h3>
          <p className="text-xs text-gray-500">Trigger simulated attack suites to continuously test gateway defense mechanisms</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select
            value={runCategory}
            onChange={(e) => setRunCategory(e.target.value)}
            disabled={running}
            className="flex-1 lg:flex-initial bg-neutral-900 border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
          >
            <option value="ALL">All Categories (200 Adversarial Prompts)</option>
            {attackCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <button
            onClick={handleRunSuite}
            disabled={running}
            className="flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 disabled:bg-neutral-800 disabled:text-neutral-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-accent-900/10"
          >
            <Play size={14} />
            {running ? 'Evaluating...' : 'Run Security Suite'}
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      {running && (
        <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-white font-medium flex items-center gap-2">
              <Activity className="animate-spin text-accent-500" size={14} /> Running Red Team attacks against Gateway security policy engine...
            </span>
            <span className="font-mono text-gray-400">{progress}%</span>
          </div>
          <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-border">
            <div className="bg-accent-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Runs history list */}
        <div className="glass-panel p-6 rounded-2xl border border-border flex flex-col justify-between max-h-[85vh] overflow-y-auto">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-1.5">
              <History size={14} /> Historical Security Runs
            </h4>
            <div className="space-y-2">
              {reports.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">No evaluations executed yet.</p>
              ) : (
                reports.map(rep => (
                  <div
                    key={rep.id}
                    onClick={() => loadReportDetails(rep.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      activeReport?.id === rep.id
                        ? 'bg-primary-500/10 border-primary-500/30'
                        : 'border-border hover:bg-white/5 bg-neutral-950/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white">
                        {rep.category ? `Category: ${rep.category}` : 'Full Evaluation Suite'}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(rep.timestamp).toLocaleString()}
                      </p>
                      <div className="flex gap-2 text-[9px] font-semibold mt-1">
                        <span className="text-emerald-400 bg-emerald-500/10 px-1 rounded">
                          Blocks: {rep.blocked_count}/{rep.total_tests}
                        </span>
                        {rep.false_negatives > 0 && (
                          <span className="text-accent-400 bg-accent-500/10 px-1 rounded">
                            Bypass: {rep.false_negatives}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-gray-500" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Columns: Active Report Dashboard */}
        {activeReport ? (
          <div className="lg:col-span-2 space-y-6">
            {/* KPI Executive Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-border p-4 rounded-xl text-center space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-500">Total Scans</span>
                <p className="text-2xl font-extrabold text-white">{activeReport.total_tests}</p>
              </div>

              <div className="bg-white/5 border border-border p-4 rounded-xl text-center space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-500">Block Rate</span>
                <p className="text-2xl font-extrabold text-emerald-400">{overallBlockRate}%</p>
              </div>

              <div className="bg-white/5 border border-border p-4 rounded-xl text-center space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-500">Failed Bypasses</span>
                <p className={`text-2xl font-extrabold ${activeReport.false_negatives > 0 ? 'text-accent-400' : 'text-gray-400'}`}>
                  {activeReport.false_negatives}
                </p>
              </div>

              <div className="bg-white/5 border border-border p-4 rounded-xl text-center space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-500">Avg Latency</span>
                <p className="text-2xl font-extrabold text-blue-400 font-mono">{activeReport.avg_latency_ms}ms</p>
              </div>
            </div>

            {/* Category Performance Graph */}
            {chartData.length > 0 && (
              <div className="glass-panel p-6 rounded-2xl border border-border">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Defense Accuracy by Threat Vector</h4>
                    <p className="text-[10px] text-gray-500">Percentage of test cases that matched expected block outcome</p>
                  </div>
                  <BarChart size={16} className="text-gray-500" />
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: 9 }} tickFormatter={(tick) => tick.split(' ')[0]} />
                      <YAxis stroke="#6b7280" style={{ fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(20, 20, 25, 0.95)', borderColor: '#26262d', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                        formatter={(val) => [`${val}%`, 'Accuracy']}
                      />
                      <Bar dataKey="accuracy" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Failed Bypass Test Cases */}
            {failedTestCases.length > 0 && (
              <div className="glass-panel p-6 rounded-2xl border border-accent-500/20 bg-accent-500/5 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-accent-400" size={16} />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-accent-400">Critical Gateway Security Bypasses</h4>
                    <p className="text-[10px] text-gray-500">Adversarial prompts that successfully bypassed block thresholds</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {failedTestCases.map(tc => (
                    <div key={tc.id} className="p-3 bg-neutral-950 border border-border rounded-xl space-y-1 font-mono text-[10px]">
                      <div className="flex justify-between font-bold">
                        <span className="text-accent-400">{tc.attack_id} [{tc.category}]</span>
                        <span className="text-gray-500">Score: {tc.risk_score}%</span>
                      </div>
                      <p className="text-white leading-relaxed">"{tc.prompt}"</p>
                      <p className="text-[9px] text-gray-500">Verdict: {tc.threat_classification} | Gateway Action: {tc.decision}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Scans Logs Table */}
            <div className="glass-panel rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Adversarial Logs Audit Table</h4>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search prompts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-neutral-900 border border-border rounded-xl pl-8 pr-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-primary-500"
                    />
                    <Search className="absolute left-2.5 top-2 text-gray-500" size={10} />
                  </div>

                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-neutral-900 border border-border rounded-xl px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="ALL">All Outcomes</option>
                    <option value="Passed">Passed (Blocked)</option>
                    <option value="Failed">Failed (Bypassed)</option>
                  </select>

                  {/* Export Trigger buttons */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleExport('json')}
                      className="p-2 border border-border hover:text-white rounded-xl text-[10px] flex items-center gap-1.5 bg-neutral-950"
                      title="Export JSON report"
                    >
                      <Download size={12} /> JSON
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="p-2 border border-border hover:text-white rounded-xl text-[10px] flex items-center gap-1.5 bg-neutral-950"
                      title="Export CSV logs"
                    >
                      <Download size={12} /> CSV
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-border text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-3">ID</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Adversarial Input</th>
                      <th className="px-6 py-3 text-center">Threat Score</th>
                      <th className="px-6 py-3 text-center">Action</th>
                      <th className="px-6 py-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-[11px] text-gray-300 font-mono">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-gray-500">No test cases matching filter.</td>
                      </tr>
                    ) : (
                      filteredResults.map(res => (
                        <tr key={res.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-3 text-gray-500 font-bold">{res.attack_id}</td>
                          <td className="px-6 py-3 text-gray-400">{res.category}</td>
                          <td className="px-6 py-3 max-w-xs truncate text-white">
                            {res.prompt}
                          </td>
                          <td className="px-6 py-3 text-center font-bold text-gray-200">
                            {res.risk_score}%
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              res.decision === 'Blocked' ? 'bg-accent-500/10 text-accent-400' : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {res.decision}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className={`inline-flex items-center gap-1.5 font-bold ${
                              res.status === 'Passed' ? 'text-emerald-400' : 'text-accent-400'
                            }`}>
                              {res.status === 'Passed' ? (
                                <CheckCircle size={10} />
                              ) : (
                                <AlertTriangle size={10} />
                              )}
                              {res.status === 'Passed' ? 'Passed' : 'Bypass'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-2 glass-panel p-16 rounded-2xl border border-border text-center space-y-2">
            <Activity className="text-gray-500 mx-auto" size={36} />
            <h4 className="text-sm font-semibold text-white">No Evaluation Loaded</h4>
            <p className="text-xs text-gray-500">Run a security suite or select a historical run on the sidebar to inspect telemetry.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedTeam;
