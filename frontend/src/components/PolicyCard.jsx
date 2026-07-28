import React from 'react';

const PolicyCard = ({ title, description, enabled, score, onToggle, onScoreChange }) => {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-border space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1 pr-4">
          <h4 className="font-semibold text-white text-base">{title}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-primary-600' : 'bg-neutral-800'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {enabled && onScoreChange && (
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Detection Sensitivity Threshold</span>
            <span className="text-primary-400 font-semibold">{score}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={score}
            onChange={(e) => onScoreChange(parseInt(e.target.value))}
            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
        </div>
      )}
    </div>
  );
};

export default PolicyCard;
