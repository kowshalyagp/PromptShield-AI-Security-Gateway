import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  ShieldAlert, 
  Clock, 
  FileText, 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { settingsApi } from '../services/api';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Settings values from API
  const [originalSettings, setOriginalSettings] = useState(null);
  
  // Settings Form values
  const [rateLimitWindow, setRateLimitWindow] = useState(60);
  const [rateLimitMaxRequests, setRateLimitMaxRequests] = useState(10);
  const [riskThresholdMalicious, setRiskThresholdMalicious] = useState(70);
  const [riskThresholdSuspicious, setRiskThresholdSuspicious] = useState(30);
  const [loggingLevel, setLoggingLevel] = useState('INFO');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await settingsApi.getSettings();
      setOriginalSettings(res.data);
      applySettingsData(res.data);
    } catch (err) {
      console.error('Failed to load system settings:', err);
      setError('Could not load system configurations. Ensure the backend server is reachable.');
    } finally {
      setLoading(false);
    }
  };

  const applySettingsData = (data) => {
    setRateLimitWindow(data.rate_limit_window);
    setRateLimitMaxRequests(data.rate_limit_max_requests);
    setRiskThresholdMalicious(data.risk_threshold_malicious);
    setRiskThresholdSuspicious(data.risk_threshold_suspicious);
    setLoggingLevel(data.logging_level);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleReset = () => {
    if (originalSettings) {
      applySettingsData(originalSettings);
      setSuccess('Settings reverted to current database values.');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      setError('');
      setSuccess('');
      const res = await settingsApi.updateSettings({
        rate_limit_window: parseInt(rateLimitWindow),
        rate_limit_max_requests: parseInt(rateLimitMaxRequests),
        risk_threshold_malicious: parseInt(riskThresholdMalicious),
        risk_threshold_suspicious: parseInt(riskThresholdSuspicious),
        logging_level: loggingLevel
      });
      setOriginalSettings(res.data);
      applySettingsData(res.data);
      setSuccess('System configuration updated successfully.');
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err.response?.data?.detail || 'Failed to update system settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading && !originalSettings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {error && (
        <div className="bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-4 rounded-xl flex items-center gap-2">
          <Check size={16} />
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Rate Limiting Parameters */}
        <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-xl">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Rate Limiting Parameters</h3>
              <p className="text-xs text-gray-500">Configure global request throttling for client connections</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 flex justify-between">
                <span>Rate Limit Window</span>
                <span className="text-primary-400">{rateLimitWindow} seconds</span>
              </label>
              <input
                type="range"
                min="5"
                max="3600"
                step="5"
                value={rateLimitWindow}
                onChange={(e) => setRateLimitWindow(e.target.value)}
                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <p className="text-[10px] text-gray-500">Duration in seconds during which client requests are tracked</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 flex justify-between">
                <span>Max Requests</span>
                <span className="text-primary-400">{rateLimitMaxRequests} requests</span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={rateLimitMaxRequests}
                onChange={(e) => setRateLimitMaxRequests(e.target.value)}
                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <p className="text-[10px] text-gray-500">Max requests allowed per window per IP before receiving 429 Too Many Requests</p>
            </div>
          </div>
        </div>

        {/* Risk Threshold Parameters */}
        <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-xl">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Security Risk Thresholds</h3>
              <p className="text-xs text-gray-500">Calibrate threat score classifications to dictate block policies</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 flex justify-between">
                <span>Malicious Score Threshold</span>
                <span className="text-accent-400 font-bold">{riskThresholdMalicious}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={riskThresholdMalicious}
                onChange={(e) => setRiskThresholdMalicious(e.target.value)}
                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-accent-500"
              />
              <p className="text-[10px] text-gray-500">Prompts equal to or exceeding this risk score are blocked immediately</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 flex justify-between">
                <span>Suspicious Score Threshold</span>
                <span className="text-amber-400 font-bold">{riskThresholdSuspicious}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={riskThresholdSuspicious}
                onChange={(e) => setRiskThresholdSuspicious(e.target.value)}
                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-[10px] text-gray-500">Prompts equal to or exceeding this score are flagged and logged as suspicious</p>
            </div>
          </div>
        </div>

        {/* System Logging Configurations */}
        <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">System Logging Configuration</h3>
              <p className="text-xs text-gray-500">Select reporting verbosity levels for system event logs</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-gray-400">System Log Level</label>
            <select
              value={loggingLevel}
              onChange={(e) => setLoggingLevel(e.target.value)}
              className="w-full md:w-80 bg-neutral-900 border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
            >
              <option value="DEBUG">DEBUG (Detailed tracing / dev)</option>
              <option value="INFO">INFO (Standard production info)</option>
              <option value="WARNING">WARNING (Flags and warnings)</option>
              <option value="ERROR">ERROR (Operational errors only)</option>
              <option value="CRITICAL">CRITICAL (System failures only)</option>
            </select>
            <p className="text-[10px] text-gray-500">Governs which gateway engine logs are captured in stdout/log files</p>
          </div>
        </div>

        {/* Actions Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 border border-border text-gray-400 hover:text-white rounded-xl text-xs font-bold hover:bg-white/5 transition-all"
          >
            <RotateCcw size={14} /> Revert Changes
          </button>
          <button
            type="submit"
            disabled={saveLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <Save size={14} /> {saveLoading ? 'Updating Settings...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
